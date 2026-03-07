import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Ghost, Send, Heart, Smile, Frown, Sparkles, Clock, Share2, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API_URL);

function App() {
  const [confessions, setConfessions] = useState([]);
  const [newConfession, setNewConfession] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRomantic, setIsRomantic] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    document.body.className = isRomantic ? 'romantic-mode' : '';
  }, [isRomantic]);

  useEffect(() => {
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

  const handleShare = async (confession) => {
    const shareData = {
      title: 'Anonymous Confession',
      text: `"${confession.content}" - Shared from Confession Wall`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copy
      navigator.clipboard.writeText(`"${confession.content}" - Whispered on ${window.location.href}`);
      setCopiedId(confession.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const charCountColor = () => {
    const len = newConfession.length;
    if (len > 450) return 'text-danger fw-bold';
    if (len > 400) return 'text-warning';
    return 'opacity-50';
  };

  return (
    <div className={`min-vh-100 py-5 ${isRomantic ? 'romantic-mode' : ''}`}>
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <header className="header text-center mb-5 position-relative">
              <div
                className="position-absolute end-0 top-0"
                style={{ zIndex: 10 }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Toggling theme from', isRomantic, 'to', !isRomantic);
                    setIsRomantic(prev => !prev);
                  }}
                  title={isRomantic ? "Switch to Ghost Mode" : "Switch to Romantic Mode"}
                  style={{ width: '42px', height: '42px', backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
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

            <div className="card shadow-sm mb-4 theme-card overflow-hidden">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <textarea
                    className="form-control bg-transparent border-0 border-bottom rounded-0 mb-3 fs-5"
                    placeholder="Share an anonymous confession..."
                    value={newConfession}
                    onChange={(e) => setNewConfession(e.target.value)}
                    rows="3"
                    maxLength="500"
                    style={{ color: 'inherit', resize: 'none' }}
                  />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className={`small transition-all ${charCountColor()}`}>
                      {newConfession.length}/500
                    </span>
                    <button
                      type="submit"
                      className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                      disabled={isSubmitting || !newConfession.trim()}
                    >
                      <Send size={18} />
                      Whisp
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="feed">
              <AnimatePresence mode="popLayout">
                {confessions.map(confession => (
                  <motion.div
                    key={confession.id}
                    className="card mb-4 theme-card shadow-sm"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    layout
                  >
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="small opacity-50 d-flex align-items-center gap-2">
                          <div className="d-flex align-items-center">
                            <Clock size={12} className="me-1" />
                            {formatDistanceToNow(new Date(confession.timestamp), { addSuffix: true })}
                          </div>
                          {confession.filtered && (
                            <span className="badge rounded-pill bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 fw-normal px-2">
                              Filtered for kindness
                            </span>
                          )}
                        </div>
                        <button
                          className="btn btn-link p-0 opacity-50 hover-opacity-100 transition-all border-0 shadow-none"
                          onClick={() => handleShare(confession)}
                          title="Share whisper"
                        >
                          {copiedId === confession.id ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
                        </button>
                      </div>
                      <p className="card-text fs-5 mb-4" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {confession.content}
                      </p>
                      <div className="d-flex flex-wrap gap-2">
                        {['❤️', '😂', '💀', '🔥', '🫂'].map(emoji => (
                          <button
                            key={emoji}
                            className={`btn btn-sm rounded-pill px-3 transition-all d-flex align-items-center gap-1 ${confession.reactions[emoji] ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => handleReact(confession.id, emoji)}
                            style={{ background: confession.reactions[emoji] ? 'var(--accent-color)' : 'transparent' }}
                          >
                            <span>{emoji}</span>
                            <span>{confession.reactions[emoji] || 0}</span>
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
