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

const VIBES = [
  { id: 'neutral', icon: '🌫️', label: 'Whisper' },
  { id: 'secret', icon: '🔒', label: 'Secret' },
  { id: 'love', icon: '💖', label: 'Love' },
  { id: 'hot', icon: '🔥', label: 'Hot Take' },
  { id: 'regret', icon: '💀', label: 'Regret' },
  { id: 'support', icon: '🫂', label: 'Support' }
];

const ConfessionCard = ({ confession, onReact, onEcho }) => {
  const [echoText, setEchoText] = useState('');
  const reactionsList = ['❤️', '😂', '💀', '🔥', '🫂'];

  // Calculate Ghostly Fade
  const timestamp = new Date(confession.timestamp).getTime();
  const now = Date.now();
  const ageHours = (now - timestamp) / (1000 * 60 * 60);
  const ageOpacity = Math.max(0.2, 1 - (ageHours / 24));
  const ageBlur = Math.min(4, (ageHours / 24) * 5);

  const handleEchoSubmit = (e) => {
    e.preventDefault();
    if (!echoText.trim()) return;
    onEcho(confession.id, echoText);
    setEchoText('');
  };

  return (
    <motion.div
      className={`card mb-4 theme-card vibe-glow vibe-${confession.vibe} ghostly-fade`}
      style={{ '--age-opacity': ageOpacity, '--age-blur': `${ageBlur}px` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <div className="card-body p-4">
        <div className="small mb-3 opacity-50 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Clock size={12} className="me-1" />
            {formatDistanceToNow(new Date(confession.timestamp), { addSuffix: true })}
          </div>
          <span className="badge rounded-pill bg-dark bg-opacity-25 px-2 py-1">
            {VIBES.find(v => v.id === confession.vibe)?.icon} {VIBES.find(v => v.id === confession.vibe)?.label}
          </span>
        </div>

        <p className="card-text fs-5 mb-4" style={{ whiteSpace: 'pre-wrap' }}>{confession.content}</p>

        <div className="d-flex flex-wrap gap-2 mb-4">
          {reactionsList.map(emoji => (
            <button
              key={emoji}
              className={`btn btn-sm rounded-pill px-3 transition-all ${confession.reactions[emoji] ? 'btn-primary opacity-75' : 'btn-outline-secondary'}`}
              onClick={() => onReact(confession.id, emoji)}
            >
              {emoji} <span className="ms-1">{confession.reactions[emoji] || 0}</span>
            </button>
          ))}
        </div>

        {/* Echoes Section */}
        <div className="echoes-section mt-4 pt-3 border-top border-white border-opacity-10">
          <div className="echo-list">
            {confession.echoes?.map(echo => (
              <div key={echo.id} className="echo-bubble">
                {echo.content}
                <div className="opacity-40" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                  {formatDistanceToNow(new Date(echo.timestamp), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleEchoSubmit} className="echo-input-container">
            <input
              type="text"
              className="echo-input"
              placeholder="Echo your reply..."
              value={echoText}
              onChange={(e) => setEchoText(e.target.value)}
              maxLength="200"
            />
            <button
              type="submit"
              className="btn btn-link position-absolute end-0 top-0 text-primary p-2"
              disabled={!echoText.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

function App() {
  const [confessions, setConfessions] = useState([]);
  const [newConfession, setNewConfession] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRomantic, setIsRomantic] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/confessions`)
      .then(res => res.json())
      .then(data => setConfessions(data));

    socket.on('new-confession', (confession) => {
      setConfessions(prev => [confession, ...prev]);
    });

    socket.on('new-echo', (echo) => {
      setConfessions(prev => prev.map(c =>
        c.id === echo.confession_id
          ? { ...c, echoes: [...(c.echoes || []), echo] }
          : c
      ));
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
      socket.off('new-echo');
      socket.off('update-reactions');
      socket.off('refresh-feed');
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newConfession.trim() || newConfession.length > 500) return;

    setIsSubmitting(true);
    socket.emit('post-confession', { content: newConfession, vibe: selectedVibe });
    setNewConfession('');
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleReact = (id, emoji) => {
    socket.emit('react', { id, emoji });
  };

  const handleEcho = (confessionId, content) => {
    socket.emit('post-echo', { confessionId, content });
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

            <div className="card shadow-sm mb-5 theme-card">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <textarea
                    className="form-control bg-transparent border-0 border-bottom rounded-0 mb-4 fs-5"
                    placeholder="Share an anonymous confession..."
                    value={newConfession}
                    onChange={(e) => setNewConfession(e.target.value)}
                    rows="3"
                    maxLength="500"
                    style={{ color: 'inherit' }}
                  />

                  <div className="vibe-selector d-flex flex-wrap gap-2 mb-4 justify-content-center">
                    {VIBES.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className={`btn btn-sm vibe-pill vibe-${v.id} ${selectedVibe === v.id ? 'active' : ''}`}
                        onClick={() => setSelectedVibe(v.id)}
                      >
                        {v.icon} {v.label}
                      </button>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small opacity-50">{newConfession.length}/500</span>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-pill px-5 fw-bold"
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
                  <ConfessionCard
                    key={confession.id}
                    confession={confession}
                    onReact={handleReact}
                    onEcho={handleEcho}
                  />
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
