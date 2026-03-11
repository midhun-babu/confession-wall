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
  const [theme, setTheme] = useState('midnight'); // midnight, romantic, cyberpunk
  const [copiedId, setCopiedId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const addToast = (message, icon = <Sparkles size={16} />) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    document.body.className = theme !== 'midnight' ? `${theme}-mode` : '';
  }, [theme]);

  const loadConfessions = (search = '') => {
    const url = search
      ? `${API_URL}/api/confessions?search=${encodeURIComponent(search)}`
      : `${API_URL}/api/confessions`;

    fetch(url)
      .then(res => res.json())
      .then(data => setConfessions(data));
  };

  useEffect(() => {
    loadConfessions();

    socket.on('new-confession', (confession) => {
      setConfessions(prev => [confession, ...prev]);
      addToast('New whisper arrived!');
    });

    socket.on('update-reactions', ({ id, reactions }) => {
      setConfessions(prev => prev.map(c =>
        c.id === id ? { ...c, reactions } : c
      ));
    });

    socket.on('confession-reported', (id) => {
      setConfessions(prev => prev.map(c =>
        c.id === id ? { ...c, reported: true } : c
      ));
    });

    socket.on('refresh-feed', () => {
      loadConfessions(searchQuery);
    });

    return () => {
      socket.off('new-confession');
      socket.off('update-reactions');
      socket.off('confession-reported');
      socket.off('refresh-feed');
    };
  }, [searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newConfession.trim() || newConfession.length > 500) return;

    setIsSubmitting(true);
    socket.emit('post-confession', newConfession);
    setNewConfession('');
    addToast('Secret whispered...', <Send size={16} />);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  const handleReact = (id, emoji) => {
    socket.emit('react', { id, emoji });
  };

  const handleReport = (id) => {
    if (window.confirm('Report this confession for review?')) {
      socket.emit('report-confession', id);
      addToast('Reported for kindness.', <Frown size={16} />);
    }
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
      navigator.clipboard.writeText(`"${confession.content}" - Whispered on ${window.location.href}`);
      setCopiedId(confession.id);
      addToast('Copied to clipboard!', <Copy size={16} />);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const cycleTheme = () => {
    const themes = ['midnight', 'romantic', 'cyberpunk'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const charCountColor = () => {
    const len = newConfession.length;
    if (len > 450) return 'text-danger fw-bold';
    if (len > 400) return 'text-warning';
    return 'opacity-50';
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'romantic': return <Heart size={20} fill="#f43f5e" color="#f43f5e" />;
      case 'cyberpunk': return <Sparkles size={20} color="#0cf" />;
      default: return <Ghost size={20} />;
    }
  };

  const getTitleIcon = (size = 40) => {
    switch (theme) {
      case 'romantic': return <Heart size={size} fill="currentColor" className="me-2 align-middle" />;
      case 'cyberpunk': return <Sparkles size={size} className="me-2 align-middle" />;
      default: return <Ghost size={size} className="me-2 align-middle" />;
    }
  };

  const getHeaderTitle = () => {
    switch (theme) {
      case 'romantic': return "Lover's Whisper";
      case 'cyberpunk': return "Neon Pulse";
      default: return "Midnight Ghost";
    }
  };

  const getHeaderSub = () => {
    switch (theme) {
      case 'romantic': return "Speak from the heart... anonymously.";
      case 'cyberpunk': return "Encrypted leaks from the undercity.";
      default: return "Whisper your secrets into the night... they vanish at dawn.";
    }
  };

  return (
    <div className={`min-vh-100 py-5 ${theme !== 'midnight' ? `${theme}-mode` : ''}`}>
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="toast-message"
            >
              {toast.icon}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <header className="header text-center mb-5 position-relative">
              <div className="position-absolute end-0 top-0 d-flex gap-2" style={{ zIndex: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale shadow-sm"
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                  title="Search whispers"
                  style={{ width: '42px', height: '42px', backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                  <Smile size={20} />
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale shadow-sm"
                  onClick={cycleTheme}
                  title={`Switch theme (Current: ${theme})`}
                  style={{ width: '42px', height: '42px', backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                >
                  {getThemeIcon()}
                </button>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="display-4 fw-bold mb-3">
                  {getTitleIcon()}
                  {getHeaderTitle()}
                </h1>
                <p className="lead opacity-75">{getHeaderSub()}</p>
              </motion.div>
            </header>

            <div className={`search-container ${isSearchVisible ? 'active' : ''}`}>
              <div className="card theme-card shadow-sm border-0">
                <div className="card-body p-2 d-flex align-items-center gap-2">
                  <Smile size={20} className="ms-2 opacity-50" />
                  <input
                    type="text"
                    className="form-control bg-transparent border-0 shadow-none text-white fs-5"
                    placeholder="Search secrets or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="btn btn-link text-white opacity-50 p-0 me-2" onClick={() => setSearchQuery('')}>
                      <Clock size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

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
                          {confession.reported && (
                            <span className="badge rounded-pill badge-reported fw-normal px-2">
                              Flagged for review
                            </span>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-link p-0 opacity-50 hover-opacity-100 transition-all border-0 shadow-none report-btn"
                            onClick={() => handleReport(confession.id)}
                            title="Report whisper"
                          >
                            <Frown size={16} />
                          </button>
                          <button
                            className="btn btn-link p-0 opacity-50 hover-opacity-100 transition-all border-0 shadow-none"
                            onClick={() => handleShare(confession)}
                            title="Share whisper"
                          >
                            {copiedId === confession.id ? <Check size={16} className="text-success" /> : <Share2 size={16} />}
                          </button>
                        </div>
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
