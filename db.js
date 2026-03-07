const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'confessions.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS confessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    reactions TEXT DEFAULT '{}',
    filtered INTEGER DEFAULT 0
  )
`);

// Migration for existing databases
try {
  db.exec('ALTER TABLE confessions ADD COLUMN filtered INTEGER DEFAULT 0');
} catch (err) {
  // Column likely already exists
}

const addConfession = (content, filtered = 0) => {
  const stmt = db.prepare('INSERT INTO confessions (content, filtered) VALUES (?, ?)');
  const info = stmt.run(content, filtered ? 1 : 0);
  return { id: info.lastInsertRowid, content, timestamp: new Date().toISOString(), reactions: {}, filtered: !!filtered };
};

const getConfessions = () => {
  const stmt = db.prepare('SELECT * FROM confessions ORDER BY timestamp DESC');
  return stmt.all().map(row => ({
    ...row,
    reactions: JSON.parse(row.reactions),
    filtered: !!row.filtered
  }));
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
  addReaction,
  deleteExpiredConfessions
};
