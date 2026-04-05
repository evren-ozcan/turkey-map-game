const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('cross-fetch');
const path = require('path');
const crypto = require('crypto');
const leoProfanity = require('leo-profanity');
require('dotenv').config();

// Load English and Turkish swear words
const trDict = leoProfanity.getDictionary('tr');
const enDict = leoProfanity.getDictionary('en');
const customTR = ['göt', 'amk', 'aq', 'amq', 'oç', 'sik', 'siktir', 'yarak', 'yarrak', 'amcık', 'piç', 'ibne', 'orospu', 'döl', 'pezevenk', 'fahişe', 'gavat', 'kahpe', 'am', 'sokam', 'sokarım', 'meme', 'yavşak'];
leoProfanity.add(trDict).add(enDict).add(customTR);

// --- Random name generator (Turkish themed) ---
const adjectives = ['Kızıl', 'Mavi', 'Yeşil', 'Altın', 'Gümüş', 'Demir', 'Cesur', 'Yiğit', 'Deli', 'Kara', 'Ak', 'Gök', 'Tunç', 'Güçlü', 'Hızlı', 'Asil', 'Ateşli', 'Çelik', 'Dağ', 'Deniz'];
const nouns = ['Arslan', 'Kaplan', 'Kartal', 'Kurt', 'Şahin', 'Doğan', 'Atmaca', 'Boğa', 'Ejder', 'Yıldız', 'Avcı', 'Koç', 'Boran', 'Alp', 'Han', 'Bey', 'Akıncı', 'Savaşçı', 'Reis', 'Yaman'];

function generateRandomName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${adj}${noun}${num}`;
}

function hashString(str) {
    return crypto.createHash('sha256').update(str || '').digest('hex').substring(0, 16);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
globalThis.Headers = fetch.Headers;

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: fetch, headers: fetch.Headers }
});

// API Routes

// GET /api/leaderboard - Get top 10 scores
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('id, player_name, score, badge, city_count, timestamp')
            .order('score', { ascending: false })
            .order('timestamp', { ascending: true })
            .limit(10);
            
        if (error) throw error;
        res.json({ data: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/scores - Submit a score (auto or named)
// Auto mode:  body = { score, badge, city_count, player_token? }
// Named mode: body = { score, badge, city_count, player_token?, player_name }
app.post('/api/scores', async (req, res) => {
    const { player_name, player_token, score, badge, city_count } = req.body;

    if (score == null || !badge || !city_count) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash IP + User-Agent for fingerprinting (no raw data stored)
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '';
    const rawUa = (req.headers['user-agent'] || '').substring(0, 300);
    const ipHash = hashString(rawIp);
    const uaHash = hashString(rawUa);

    let finalName = null;
    let finalToken = player_token || null;
    let isCustom = false;

    // --- NAMED MODE: user provided a player_name ---
    if (player_name) {
        if (leoProfanity.check(player_name)) {
            return res.status(400).json({ error: 'Uygunsuz bir kullanıcı adı girdiniz. Lütfen geçerli bir isim kullanın.' });
        }
        finalName = player_name.trim().substring(0, 30);
        isCustom = true;

        // Update all previous records with this token to the new name
        if (finalToken) {
            await supabase
                .from('leaderboard')
                .update({ player_name: finalName, is_custom_name: true })
                .eq('player_token', finalToken);
        }
    }
    // --- AUTO MODE: assign/recall name automatically ---
    else {
        // 1. Check if this token already has a custom name
        if (finalToken) {
            const { data: byToken } = await supabase
                .from('leaderboard')
                .select('player_name, is_custom_name')
                .eq('player_token', finalToken)
                .eq('is_custom_name', true)
                .limit(1);

            if (byToken && byToken.length > 0) {
                finalName = byToken[0].player_name;
                isCustom = true;
            }
        }

        // 2. Check IP+UA for a custom name
        if (!finalName) {
            const { data: byHash } = await supabase
                .from('leaderboard')
                .select('player_name, player_token, is_custom_name')
                .eq('ip_hash', ipHash)
                .eq('ua_hash', uaHash)
                .eq('is_custom_name', true)
                .limit(1);

            if (byHash && byHash.length > 0) {
                finalName = byHash[0].player_name;
                finalToken = finalToken || byHash[0].player_token;
                isCustom = true;
            }
        }

        // 3. Check IP+UA for any existing name (even random)
        if (!finalName) {
            const { data: byHashAny } = await supabase
                .from('leaderboard')
                .select('player_name, player_token')
                .eq('ip_hash', ipHash)
                .eq('ua_hash', uaHash)
                .limit(1);

            if (byHashAny && byHashAny.length > 0) {
                finalName = byHashAny[0].player_name;
                finalToken = finalToken || byHashAny[0].player_token;
            }
        }

        // 4. Generate a brand new random name
        if (!finalName) {
            finalName = generateRandomName();
        }

        if (!finalToken) {
            finalToken = crypto.randomUUID();
        }
    }

    // Insert the score record
    try {
        const { error } = await supabase
            .from('leaderboard')
            .insert([{
                player_name: finalName,
                score: score,
                badge: badge,
                city_count: city_count,
                player_token: finalToken,
                ip_hash: ipHash,
                ua_hash: uaHash,
                is_custom_name: isCustom
            }]);

        if (error) throw error;

        res.status(201).json({
            message: 'Score saved successfully.',
            player_token: finalToken,
            assigned_name: finalName,
            is_custom_name: isCustom
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/players/:token - Update all records of a player to a new name
app.patch('/api/players/:token', async (req, res) => {
    const { token } = req.params;
    const { player_name } = req.body;

    if (!player_name || !token) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (leoProfanity.check(player_name)) {
        return res.status(400).json({ error: 'Uygunsuz bir kullanıcı adı girdiniz. Lütfen geçerli bir isim kullanın.' });
    }

    const finalName = player_name.trim().substring(0, 30);

    try {
        const { error } = await supabase
            .from('leaderboard')
            .update({ player_name: finalName, is_custom_name: true })
            .eq('player_token', token);

        if (error) throw error;

        res.json({ message: 'Name updated successfully.', player_name: finalName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
