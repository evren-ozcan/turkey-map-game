const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve the static frontend files from the current directory
app.use(express.static(path.join(__dirname, '')));

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// API Routes

// GET /api/leaderboard - Get top 50 scores
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('id, player_name, score, badge, city_count, timestamp')
            .order('score', { ascending: false })
            .order('timestamp', { ascending: true })
            .limit(50);
            
        if (error) throw error;
        
        res.json({ data: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/scores - Submit a new score
app.post('/api/scores', async (req, res) => {
    const { player_name, score, badge, city_count } = req.body;
    
    if (!player_name || score == null || !badge || !city_count) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .insert([
                { 
                    player_name: player_name.trim().substring(0, 30), 
                    score: score, 
                    badge: badge, 
                    city_count: city_count 
                }
            ]);
            
        if (error) throw error;
        
        res.status(201).json({ message: 'Score saved successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
