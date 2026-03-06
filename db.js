const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'confessions.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS confessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    vibe TEXT DEFAULT 'neutral',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    reactions TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS echoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    confession_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE
  );
`);

const addConfession = (content, vibe = 'neutral') => {
  const stmt = db.prepare('INSERT INTO confessions (content, vibe) VALUES (?, ?)');
  const info = stmt.run(content, vibe);
  return {
    id: info.lastInsertRowid,
    content,
    vibe,
    timestamp: new Date().toISOString(),
    reactions: {},
    echoes: []
  };
};

const getConfessions = () => {
  const stmt = db.prepare('SELECT * FROM confessions ORDER BY timestamp DESC');
  const confessions = stmt.all();

  return confessions.map(row => {
    const echoesStmt = db.prepare('SELECT * FROM echoes WHERE confession_id = ? ORDER BY timestamp ASC');
    const echoes = echoesStmt.all();

    return {
      ...row,
      reactions: JSON.parse(row.reactions),
      echoes: echoes
    };
  });
};

const addEcho = (confession_id, content) => {
  const stmt = db.prepare('INSERT INTO echoes (confession_id, content) VALUES (?, ?)');
  const info = stmt.run(confession_id, content);
  return {
    id: info.lastInsertRowid,
    confession_id,
    content,
    timestamp: new Date().toISOString()
  };
};

const addReaction = (id, emoji) => {
  const stmt = db.prepare('SELECT reactions FROM confessions WHERE id = ?');
  const row = stmt.get(id);
  if (!row) return null;

  const reactions = JSON.parse(row.reactions);
  reactions[emoji] = (reactions[emoji] || 0) + 1;

  const updateStmt = db.prepare('UPDATE confessions SET reactions = ? WHERE id = ?');
  updateStmt.run(JSON.stringify(reactions), id);
  return reactions;
};

const deleteExpiredConfessions = () => {
  const stmt = db.prepare("DELETE FROM confessions WHERE timestamp < datetime('now', '-24 hours')");
  const info = stmt.run();
  return info.changes;
};

module.exports = {
  addConfession,
  getConfessions,
  addEcho,
  addReaction,
  deleteExpiredConfessions
};
