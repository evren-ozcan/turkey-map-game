const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve the static frontend files from the current directory
app.use(express.static(path.join(__dirname, '')));

// Initialize SQLite DB
const dbFile = path.join(__dirname, 'scores.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if not exists
        db.run(`
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                badge TEXT NOT NULL,
                city_count INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

// API Routes

// GET /api/leaderboard - Get top 50 scores
app.get('/api/leaderboard', (req, res) => {
    const query = `
        SELECT id, player_name, score, badge, city_count, timestamp
        FROM leaderboard
        ORDER BY score DESC, timestamp ASC
        LIMIT 50
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// POST /api/scores - Submit a new score
app.post('/api/scores', (req, res) => {
    const { player_name, score, badge, city_count } = req.body;
    
    if (!player_name || score == null || !badge || !city_count) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const query = `
        INSERT INTO leaderboard (player_name, score, badge, city_count)
        VALUES (?, ?, ?, ?)
    `;
    db.run(query, [player_name.trim().substring(0, 30), score, badge, city_count], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.status(201).json({ id: this.lastID, message: 'Score saved successfully.' });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
