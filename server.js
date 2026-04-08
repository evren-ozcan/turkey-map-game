const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('cross-fetch');
const path = require('path');
const crypto = require('crypto');
const leoProfanity = require('leo-profanity');
const rateLimit = require('express-rate-limit');
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// Rate Limiter API Skor Gönderimleri
const scoreLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 2, // 1 dakikada max 2 defa gönderilebilir
    message: { error: 'Çok hızlı skor yolluyorsunuz. Lütfen 1 dakika bekleyin.' }
});

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

// POST /api/scores - Submit a score
app.post('/api/scores', scoreLimiter, async (req, res) => {
    const { player_name, player_token, score, badge, city_count, signature } = req.body;

    if (score == null || !badge || !city_count || !signature) {
        return res.status(400).json({ error: 'Eksik veya hatalı veri gönderimi tespit edildi.' });
    }

    // 1- BAKCEND SANITY CHECK (Mantık Kontrolü)
    const MAX_SCORE_PER_CITY = 150;
    const MAX_POSSIBLE_SCORE = city_count * MAX_SCORE_PER_CITY;
    
    if (score < 0 || score > MAX_POSSIBLE_SCORE || city_count <= 0 || city_count > 81) {
        console.warn(`Hile tespit edildi: Puan = ${score}, Sınır = ${MAX_POSSIBLE_SCORE}`);
        return res.status(400).json({ error: 'Oyun puanınız mantıksal sınırların dışında!' });
    }

    // 2- GİZLİ İMZA (Frontend-Backend Hashing)
    const salt = "TrMap_SecR3T_2026!";
    const expectedSignature = crypto.createHash('sha256').update(`${score}:${city_count}:${salt}`).digest('hex');
    if (signature !== expectedSignature) {
        console.warn(`Geçersiz İmza! Beklenen: ${expectedSignature}, Gelen: ${signature}`);
        return res.status(400).json({ error: 'Oyun imzanız doğrulanamadı. Lütfen hile kullanmayınız.' });
    }

    // Store raw IP and full user agent
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
    const rawUa = req.headers['user-agent'] || '';

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
            const { data: byIpUa } = await supabase
                .from('leaderboard')
                .select('player_name, player_token, is_custom_name')
                .eq('ip_address', rawIp)
                .eq('user_agent', rawUa)
                .eq('is_custom_name', true)
                .limit(1);

            if (byIpUa && byIpUa.length > 0) {
                finalName = byIpUa[0].player_name;
                finalToken = finalToken || byIpUa[0].player_token;
                isCustom = true;
            }
        }

        // 3. Check IP+UA for any existing name (even random)
        if (!finalName) {
            const { data: byIpUaAny } = await supabase
                .from('leaderboard')
                .select('player_name, player_token')
                .eq('ip_address', rawIp)
                .eq('user_agent', rawUa)
                .limit(1);

            if (byIpUaAny && byIpUaAny.length > 0) {
                finalName = byIpUaAny[0].player_name;
                finalToken = finalToken || byIpUaAny[0].player_token;
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
        const { data: inserted, error } = await supabase
            .from('leaderboard')
            .insert([{
                player_name: finalName,
                score: score,
                badge: badge,
                city_count: city_count,
                player_token: finalToken,
                ip_address: rawIp,
                user_agent: rawUa,
                is_custom_name: isCustom
            }])
            .select('id');

        if (error) throw error;

        res.status(201).json({
            message: 'Score saved successfully.',
            score_id: inserted?.[0]?.id || null,
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

// PATCH /api/scores/:id/share - Mark a score row as shared
app.patch('/api/scores/:id/share', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('leaderboard')
            .update({ shared: true })
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Marked as shared.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
