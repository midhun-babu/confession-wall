import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Ghost, Send, Heart, Smile, Frown, Sparkles, Clock, Moon, Sun } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API_URL);

const ConfessionCard = ({ confession, onReact }) => {
  const reactionsList = ['❤️', '😂', '💀', '🔥', '🫂'];

  return (
    <motion.div
      className="confession-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <div className="timestamp">
        <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
        {formatDistanceToNow(new Date(confession.timestamp), { addSuffix: true })}
      </div>
      <div className="content">{confession.content}</div>
      <div className="reactions">
        {reactionsList.map(emoji => (
          <button
            key={emoji}
            className={`reaction-btn ${confession.reactions[emoji] ? 'active' : ''}`}
            onClick={() => onReact(confession.id, emoji)}
          >
            {emoji} {confession.reactions[emoji] || 0}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

function App() {
  const [confessions, setConfessions] = useState([]);
  const [newConfession, setNewConfession] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch initial confessions
    fetch(`${API_URL}/api/confessions`)
      .then(res => res.json())
      .then(data => setConfessions(data));

    // Socket listeners
    socket.on('new-confession', (confession) => {
      setConfessions(prev => [confession, ...prev]);
    });

    socket.on('update-reactions', ({ id, reactions }) => {
      setConfessions(prev => prev.map(c =>
        c.id === id ? { ...c, reactions } : c
      ));
    });

    socket.on('refresh-feed', () => {
      fetch(`${API_URL}/api/confessions`)
        .then(res => res.json())
        .then(data => setConfessions(data));
    });

    return () => {
      socket.off('new-confession');
      socket.off('update-reactions');
      socket.off('refresh-feed');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newConfession.trim() || newConfession.length > 500) return;

    setIsSubmitting(true);
    socket.emit('post-confession', newConfession);
    setNewConfession('');
    setTimeout(() => setIsSubmitting(false), 500); // UI feedback delay
  };

  const handleReact = (id, emoji) => {
    socket.emit('react', { id, emoji });
  };

  return (
    <div className="app-container">
      <header className="header">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1><Ghost size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Midnight Ghost</h1>
          <p>Whisper your secrets into the night... they vanish at dawn.</p>
        </motion.div>
      </header>

      <div className="confession-form">
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="Share an anonymous confession..."
            value={newConfession}
            onChange={(e) => setNewConfession(e.target.value)}
            rows="3"
            maxLength="500"
          />
          <div className="form-footer">
            <span className="char-count">{newConfession.length}/500</span>
            <button
              type="submit"
              className="post-btn"
              disabled={isSubmitting || !newConfession.trim()}
            >
              <Send size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Whisp
            </button>
          </div>
        </form>
      </div>

      <div className="feed">
        <AnimatePresence>
          {confessions.map(confession => (
            <ConfessionCard
              key={confession.id}
              confession={confession}
              onReact={handleReact}
            />
          ))}
        </AnimatePresence>
      </div>

      {confessions.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '3rem', color: '#64748b' }}>
          <Sparkles />
          <p>The night is quiet. Be the first to whisper.</p>
        </div>
      )}
    </div>
  );
}

export default App;
