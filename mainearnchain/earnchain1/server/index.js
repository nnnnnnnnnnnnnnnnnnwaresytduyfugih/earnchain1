const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'web')));

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.ADMIN_USER_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  next();
};

// Register user
app.post('/register', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  db.run(`INSERT OR IGNORE INTO users (id, balance) VALUES (?, 0)`, [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: 'User registered' });
  });
});

// Get available ads (with 24h cooldown)
app.get('/ads', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - (24 * 60 * 60);

  const query = `
    SELECT a.id, a.title, a.url, a.reward
    FROM ads a
    LEFT JOIN clicks c ON c.ad_id = a.id 
      AND c.user_id = ? 
      AND c.timestamp > ?
    WHERE c.ad_id IS NULL
    ORDER BY a.id
  `;

  db.all(query, [userId, twentyFourHoursAgo], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Click ad
app.post('/click', (req, res) => {
  const { userId, adId } = req.body;
  
  if (!userId || !adId) {
    return res.status(400).json({ error: 'userId and adId required' });
  }

  // Check if user exists
  db.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if ad exists
    db.get(`SELECT reward FROM ads WHERE id = ?`, [adId], (err, ad) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!ad) {
        return res.status(404).json({ error: 'Ad not found' });
      }

      // Check if already clicked in last 24 hours
      const now = Math.floor(Date.now() / 1000);
      const twentyFourHoursAgo = now - (24 * 60 * 60);

      db.get(`
        SELECT id FROM clicks 
        WHERE user_id = ? AND ad_id = ? AND timestamp > ?
      `, [userId, adId, twentyFourHoursAgo], (err, existingClick) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (existingClick) {
          return res.status(400).json({ error: 'Ad already clicked within 24 hours' });
        }

        // Record click and update balance
        db.serialize(() => {
          db.run(`BEGIN TRANSACTION`);
          
          db.run(`
            INSERT INTO clicks (user_id, ad_id, points, timestamp) 
            VALUES (?, ?, ?, ?)
          `, [userId, adId, ad.reward, now], function(err) {
            if (err) {
              db.run(`ROLLBACK`);
              return res.status(500).json({ error: err.message });
            }
          });

          db.run(`
            UPDATE users SET balance = balance + ? WHERE id = ?
          `, [ad.reward, userId], function(err) {
            if (err) {
              db.run(`ROLLBACK`);
              return res.status(500).json({ error: err.message });
            }
            db.run(`COMMIT`);
            res.status(200).json({ 
              message: 'Ad clicked successfully',
              points: ad.reward
            });
          });
        });
      });
    });
  });
});

// Get user balance
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  
  db.get(`SELECT balance FROM users WHERE id = ?`, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ balance: row.balance });
  });
});

// Get click history
app.get('/history/:id', (req, res) => {
  const userId = req.params.id;
  
  const query = `
    SELECT a.title, c.points, c.timestamp
    FROM clicks c
    JOIN ads a ON c.ad_id = a.id
    WHERE c.user_id = ?
    ORDER BY c.timestamp DESC
    LIMIT 20
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Admin: Add new ad
app.post('/admin/ad', authenticateAdmin, (req, res) => {
  const { title, url, reward } = req.body;
  
  if (!title || !url || reward === undefined) {
    return res.status(400).json({ error: 'title, url, and reward required' });
  }

  db.run(`
    INSERT INTO ads (title, url, reward) VALUES (?, ?, ?)
  `, [title, url, reward], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Ad created successfully',
      id: this.lastID 
    });
  });
});

// Serve web app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

app.get('/web', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Earn Chain Server running on http://localhost:${PORT}`);
  console.log(`Web App available at http://localhost:${PORT}`);
  console.log(`Admin User ID: ${process.env.ADMIN_USER_ID}`);
});