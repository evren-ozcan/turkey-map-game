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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// Rate Limiter API Skor Gönderimleri
let scoreLimiter = (req, res, next) => next();
try {
    const rateLimit = require('express-rate-limit');
    scoreLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        message: { error: 'Çok hızlı skor yolluyorsunuz. Lütfen 1 dakika bekleyin.' }
    });
} catch (err) {
    console.warn("⚠️ Eski Node sürümü: Rate Limit yerelde kapalı, Render'da aktif olacak.");
}

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
globalThis.Headers = fetch.Headers;

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: fetch, headers: fetch.Headers }
});

// API Routes

// GET /api/:game/leaderboard - Get top scores from the last 10 days
app.get('/api/:game/leaderboard', async (req, res) => {
    const tableName = req.params.game === 'world' ? 'world_leaderboard' : 'leaderboard';
    try {
        // Filter to last 10 days
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const tenDaysAgoISO = tenDaysAgo.toISOString();

        let query = supabase
            .from(tableName)
            .select('id, player_name, score, badge, city_count, timestamp')
            .gte('timestamp', tenDaysAgoISO);
            
        if (req.query.cityCount && req.query.cityCount !== 'all') {
            const countParam = parseInt(req.query.cityCount);
            if (countParam === 5) {
                if (req.params.game === 'world') {
                    // Dünya için "5 Ülke ve Devamı" (Tam tur hariç, genelde 170+ ülke)
                    query = query.gte('city_count', 5).lt('city_count', 170);
                } else {
                    // Türkiye için "5 Şehir ve Devamı" (81 hariç)
                    query = query.gte('city_count', 5).lt('city_count', 81);
                }
            } else {
                query = query.eq('city_count', countParam);
            }
        }

        const { data, error } = await query
            .order('score', { ascending: false })
            .order('timestamp', { ascending: true })
            .limit(10);
            
        if (error) throw error;
        res.json({ data: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/:game/scores - Submit a score
app.post('/api/:game/scores', scoreLimiter, async (req, res) => {
    const tableName = req.params.game === 'world' ? 'world_leaderboard' : 'leaderboard';
    const { player_name, player_token, score, badge, city_count, signature } = req.body;

    if (score == null || !badge || !city_count || !signature) {
        return res.status(400).json({ error: 'Eksik veya hatalı veri gönderimi tespit edildi.' });
    }

    // 1- BAKCEND SANITY CHECK (Mantık Kontrolü)
    const isWorld = req.params.game === 'world';
    const MAX_SCORE_PER_CITY = isWorld ? 200 : 150;
    const MAX_CITY_COUNT = isWorld ? 250 : 81;
    const MAX_POSSIBLE_SCORE = city_count * MAX_SCORE_PER_CITY;
    
    if (score < 0 || score > MAX_POSSIBLE_SCORE || city_count <= 0 || city_count > MAX_CITY_COUNT) {
        console.warn(`Hile tespit edildi: Puan = ${score}, Sınır = ${MAX_POSSIBLE_SCORE}, Sehir/Ulke = ${city_count}`);
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
                .from(tableName)
                .update({ player_name: finalName, is_custom_name: true })
                .eq('player_token', finalToken);
        }
    }
    // --- AUTO MODE: assign/recall name automatically ---
    else {
        // 1. Check if this token already has a custom name
        if (finalToken) {
            const { data: byToken } = await supabase
                .from(tableName)
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
                .from(tableName)
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
                .from(tableName)
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
            finalToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
        }
    }

    // Insert the score record
    try {
        const { data: inserted, error } = await supabase
            .from(tableName)
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

// PATCH /api/:game/players/:token - Update all records of a player to a new name
app.patch('/api/:game/players/:token', async (req, res) => {
    const tableName = req.params.game === 'world' ? 'world_leaderboard' : 'leaderboard';
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
            .from(tableName)
            .update({ player_name: finalName, is_custom_name: true })
            .eq('player_token', token);

        if (error) throw error;

        res.json({ message: 'Name updated successfully.', player_name: finalName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/:game/players/:token/stats - Get player's personal best and leaderboard rank
app.get('/api/:game/players/:token/stats', async (req, res) => {
    const tableName = req.params.game === 'world' ? 'world_leaderboard' : 'leaderboard';
    const { token } = req.params;
    
    if (!token) {
        return res.status(400).json({ error: 'Token eksik' });
    }

    try {
        const { data: myBest, error: myErr } = await supabase
            .from(tableName)
            .select('player_name, score, badge, city_count')
            .eq('player_token', token)
            .order('score', { ascending: false })
            .order('timestamp', { ascending: true })
            .limit(1);

        if (myErr) throw myErr;
        
        if (!myBest || myBest.length === 0) {
            return res.status(404).json({ message: 'Henüz skor yok' });
        }

        const bestScoreObj = myBest[0];

        const { data: allScores, error: allErr } = await supabase
            .from(tableName)
            .select('player_token, score')
            .eq('city_count', bestScoreObj.city_count)
            .order('score', { ascending: false })
            .order('timestamp', { ascending: true });
        
        if (allErr) throw allErr;

        let rank = 1;

        for (let i = 0; i < allScores.length; i++) {
            if (allScores[i].player_token === token) {
                rank = i + 1;
                break;
            }
        }

        res.json({
            player_name: bestScoreObj.player_name,
            best_score: bestScoreObj.score,
            best_badge: bestScoreObj.badge,
            mode: bestScoreObj.city_count,
            rank: rank
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/:game/scores/:id/share - Mark a score row as shared
app.patch('/api/:game/scores/:id/share', async (req, res) => {
    const tableName = req.params.game === 'world' ? 'world_leaderboard' : 'leaderboard';
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from(tableName)
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
