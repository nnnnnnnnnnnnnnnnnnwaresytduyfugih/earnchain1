const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use absolute path for database
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/earnchain.db'  // Render's writable directory
  : path.join(__dirname, '..', 'earnchain.db');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      balance REAL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create ads table
  db.run(`
    CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      reward REAL NOT NULL DEFAULT 0.01,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create clicks table
  db.run(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ad_id INTEGER NOT NULL,
      points REAL DEFAULT 0,
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (ad_id) REFERENCES ads (id)
    )
  `);

  // Insert sample ads
  const sampleAds = [
    ['🎮 Premium Game Access', 'https://example.com/game1', 0.02],
    ['🛍️ Exclusive Shopping Deal', 'https://example.com/shop1', 0.03],
    ['🎬 Movie Streaming Offer', 'https://example.com/movie1', 0.015],
    ['🎵 Music Premium Trial', 'https://example.com/music1', 0.01],
    ['📚 Online Course Discount', 'https://example.com/course1', 0.025]
  ];

  db.run(`DELETE FROM ads`); // Clear existing for fresh start
  const stmt = db.prepare(`INSERT INTO ads (title, url, reward) VALUES (?, ?, ?)`);
  sampleAds.forEach(ad => stmt.run(ad));
  stmt.finalize();
});

module.exports = { db };