import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Ghost, Send, Heart, Smile, Frown, Sparkles, Clock, Moon, Sun } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API_URL);

const FloatingHearts = () => {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    const symbols = ['❤️', '💖', '💗', '💓', '💕'];
    const interval = setInterval(() => {
      const id = Date.now();
      const newHeart = {
        id,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        left: Math.random() * 100 + 'vw',
        size: (Math.random() * 20 + 10) + 'px',
        duration: (Math.random() * 10 + 5) + 's',
      };
      setHearts(prev => [...prev.slice(-20), newHeart]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {hearts.map(heart => (
        <span
          key={heart.id}
          className="floating-heart"
          style={{
            '--size': heart.size,
            '--duration': heart.duration,
            left: heart.left
          }}
        >
          {heart.symbol}
        </span>
      ))}
    </>
  );
};

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
  const [isRomantic, setIsRomantic] = useState(false);

  useEffect(() => {
    // ... existing effect logic ...
    fetch(`${API_URL}/api/confessions`)
      .then(res => res.json())
      .then(data => setConfessions(data));

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
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleReact = (id, emoji) => {
    socket.emit('react', { id, emoji });
  };

  return (
    <div className={`min-vh-100 py-5 ${isRomantic ? 'romantic-mode' : ''}`}>
      {isRomantic && <FloatingHearts />}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <header className="header text-center mb-5 position-relative">
              <div className="position-absolute end-0 top-0">
                <button
                  className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale"
                  onClick={() => setIsRomantic(!isRomantic)}
                  title={isRomantic ? "Switch to Ghost Mode" : "Switch to Romantic Mode"}
                  style={{ width: '40px', height: '40px' }}
                >
                  {isRomantic ? <Ghost size={20} /> : <Heart size={20} fill="#f43f5e" color="#f43f5e" />}
                </button>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="display-4 fw-bold mb-3">
                  {isRomantic ? <Heart size={40} fill="currentColor" className="me-2 align-middle" /> : <Ghost size={40} className="me-2 align-middle" />}
                  {isRomantic ? 'Lover\'s Whisper' : 'Midnight Ghost'}
                </h1>
                <p className="lead opacity-75">{isRomantic ? 'Speak from the heart... anonymously.' : 'Whisper your secrets into the night... they vanish at dawn.'}</p>
              </motion.div>
            </header>

            <div className="card shadow-sm mb-4 theme-card">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <textarea
                    className="form-control bg-transparent border-0 border-bottom rounded-0 mb-3 fs-5"
                    placeholder="Share an anonymous confession..."
                    value={newConfession}
                    onChange={(e) => setNewConfession(e.target.value)}
                    rows="3"
                    maxLength="500"
                    style={{ color: 'inherit' }}
                  />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small opacity-50">{newConfession.length}/500</span>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-pill px-4 fw-bold"
                      disabled={isSubmitting || !newConfession.trim()}
                    >
                      <Send size={18} className="me-2 align-middle" />
                      Whisp
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="feed">
              <AnimatePresence>
                {confessions.map(confession => (
                  <motion.div
                    key={confession.id}
                    className="card mb-3 theme-card shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <div className="card-body p-4">
                      <div className="small mb-2 opacity-50 d-flex align-items-center">
                        <Clock size={12} className="me-1" />
                        {formatDistanceToNow(new Date(confession.timestamp), { addSuffix: true })}
                      </div>
                      <p className="card-text fs-5 mb-4" style={{ whiteSpace: 'pre-wrap' }}>{confession.content}</p>
                      <div className="d-flex flex-wrap gap-2">
                        {['❤️', '😂', '💀', '🔥', '🫂'].map(emoji => (
                          <button
                            key={emoji}
                            className={`btn btn-sm rounded-pill px-3 transition-all ${confession.reactions[emoji] ? 'btn-primary opacity-75' : 'btn-outline-secondary'}`}
                            onClick={() => handleReact(confession.id, emoji)}
                          >
                            {emoji} <span className="ms-1">{confession.reactions[emoji] || 0}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {confessions.length === 0 && (
              <div className="text-center mt-5 opacity-50">
                <Sparkles size={48} className="mb-3" />
                <p className="h5">The night is quiet. Be the first to whisper.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
