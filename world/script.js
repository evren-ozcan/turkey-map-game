// --- Globe & Data Setup ---
let globe;
let countriesData = [];

// Fallback user token mapping
let state = {
    status: 'IDLE',
    score: 0,
    maxPossibleScore: 0,
    timeLeft: 15.0,
    currentCountry: null,
    attempts: 1,
    timerInterval: null,
    askedCountries: [],
    targetCount: 5,
    playerToken: localStorage.getItem('playerToken') || null,
    playerName: localStorage.getItem('playerName') || 'Gezgin',
    currentMode: 'name',
    lastScoreId: null
};

const progressEl = document.getElementById('progress');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const questionEl = document.getElementById('question');
const questionLabelEl = document.getElementById('question-label');
const flagContainer = document.getElementById('flag-container');
const questionFlagEl = document.getElementById('question-flag');
const textContainer = document.getElementById('text-container');
const feedbackEl = document.getElementById('feedback');
const gameInfoEl = document.getElementById('game-info');
const pregameDescEl = document.getElementById('pregame-desc');
const startBtn = document.getElementById('start-btn');
const countSelect = document.getElementById('count-select');
const modeSelect = document.getElementById('mode-select');

// Modals
const welcomeModal = document.getElementById('welcome-modal');
const recapModal = document.getElementById('recap-modal');
const leaderboardModal = document.getElementById('leaderboard-modal');

// --- Helpers ---
const generateSignature = async (score, count) => {
    const salt = "TrMap_SecR3T_2026!";
    const msg = `${score}:${count}:${salt}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(msg);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const calculateBadge = (score) => {
    if (score < 200) return 'Acemi Gezgin 🐣';
    if (score < 500) return 'Ülke Meraklısı 🔍';
    if (score < 1000) return 'Kıta Uzmanı 🗺️';
    if (score < 1500) return 'Dünya Turisti ✈️';
    if (score < 2000) return 'Macera Arayan 🧗';
    if (score < 3000) return 'Çaylak Kâşif 🚶';
    if (score < 4500) return 'Büyük Kâşif 🏰';
    return 'Marco Polo ⛵';
};

// Initialize Globe
function initGlobe() {
    globe = Globe()
        (document.getElementById('globeViz'))
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .polygonLabel(() => '')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showGlobe(true)
        .showAtmosphere(true)
        .atmosphereColor('#87CEEB')
        .atmosphereAltitude(0.15)
        .polygonAltitude(0.01)
        .polygonCapColor((d) => state.askedCountries.includes(d.iso) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.01)')
        .polygonSideColor(() => 'rgba(0,0,0,0.1)')
        .polygonStrokeColor(() => 'rgba(17, 138, 178, 0.8)') // Darker teal for contrast
        .onPolygonClick(handlePolygonClick)
        .onPolygonHover(hoverPolygon);

    // Disable auto rotate initially
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;

    // Fetch GeoJSON
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(geojson => {
            // Map and keep most countries, fallback to English if Turkish name is missing
            const filteredFeatures = geojson.features.filter(f => {
                const iso2 = f.properties.ISO_A2;
                // Exclude invalid ISOs or extremely tiny unclickable islands
                if (!iso2 || iso2 === '-99' || f.properties.POP_EST < 300000) return false;
                
                f.iso = iso2;
                if (countryData[iso2]) {
                    f.name = countryData[iso2].name;
                    f.capital = countryData[iso2].capital;
                } else {
                    f.name = f.properties.NAME_TR || f.properties.NAME || f.properties.ADMIN;
                    // Fallback capital to country name for unknowns to prevent empty string
                    f.capital = f.properties.NAME_TR || f.properties.NAME || f.properties.ADMIN;
                }
                return true;
            });
            
            countriesData = filteredFeatures;
            globe.polygonsData(filteredFeatures);
        });
}

function hoverPolygon(polygon) {
    if (state.status !== 'PLAYING') {
        document.body.style.cursor = polygon ? 'pointer' : 'default';
        return;
    }
    
    // Check if country is already answered (passive)
    const isAsked = polygon && state.askedCountries.includes(polygon.iso);
    
    if (isAsked) {
        document.body.style.cursor = 'default';
        // Ensure no hover color for asked countries
        resetGlobeColors(); 
        return;
    }

    document.body.style.cursor = polygon ? 'crosshair' : 'grab';
    
    // Highlight hover ONLY if not asked
    globe.polygonCapColor(d => {
        if (state.askedCountries.includes(d.iso)) return 'rgba(15, 23, 42, 0.7)'; 
        if (polygon === d) return 'rgba(91, 231, 255, 0.3)'; 
        return 'rgba(0, 0, 0, 0.01)'; 
    });
    
    globe.polygonStrokeColor(d => {
        if (state.askedCountries.includes(d.iso)) return 'rgba(91, 231, 255, 0.1)';
        if (polygon === d) return '#5BE7FF';
        return 'rgba(91, 231, 255, 0.5)';
    });
}

initGlobe();

// --- Personal Stats ---
async function loadPersonalStats() {
    if (!state.playerToken) return;
    try {
        const res = await fetch(`/api/world/players/${state.playerToken}/stats`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('welcome-name').textContent = data.player_name;
            document.getElementById('welcome-score').textContent = data.best_score;
            document.getElementById('welcome-badge').textContent = data.best_badge;
            document.getElementById('welcome-rank').textContent = `${data.rank}. Sıra (${data.mode} Ülke)`;
            welcomeModal.classList.remove('hidden');
        }
    } catch (e) { console.error("Stats load err", e); }
}

window.addEventListener('load', loadPersonalStats);

// --- Leaderboard ---
async function fetchLeaderboard() {
    const filter = document.getElementById('leaderboard-filter').value;
    const body = document.getElementById('leaderboard-body');
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Yükleniyor...</td></tr>';
    
    try {
        const res = await fetch(`/api/world/leaderboard?cityCount=${filter}`);
        const { data } = await res.json();
        body.innerHTML = '';
        if (data.length === 0) {
            body.innerHTML = '<tr><td colspan="4" style="text-align:center;">Henüz skor yok. İlk sen ol!</td></tr>';
            return;
        }
        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${i+1}</td>
                <td style="font-weight:600;">${row.player_name}</td>
                <td style="font-size:0.85rem; opacity:0.8;">
                    ${row.badge}
                    <div style="font-size:0.7rem; opacity:0.6;">(${row.city_count} Ülke)</div>
                </td>
                <td class="score-val" style="font-weight:800;">${row.score}</td>
            `;
            body.appendChild(tr);
        });
    } catch (e) { 
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ef4444;">Hata oluştu!</td></tr>';
    }
}

// --- Game Logic ---
function startGame(keepProgress = false) {
    if (state.status === 'PLAYING') return;
    
    // Stop rotating during game
    globe.controls().autoRotate = false;
    
    // Always reset score when starting a new round (including "Continue")
    state.score = 0;
    state.maxPossibleScore = 0;
    
    if (!keepProgress) {
        state.askedCountries = [];
    }
    resetGlobeColors();
    
    let requestedCount = countSelect.value === 'all' ? countriesData.length : parseInt(countSelect.value);
    const increment = keepProgress ? 5 : requestedCount;
    const remCount = countriesData.length - state.askedCountries.length;
    
    if (remCount === 0 && keepProgress) {
        showToast("Tüm dünyayı keşfettin! Harita sıfırlanıyor.", "success");
        state.askedCountries = [];
        resetGlobeColors();
        state.targetCount = requestedCount;
    } else {
        state.targetCount = state.askedCountries.length + Math.min(increment, remCount);
    }
    
    progressEl.textContent = `${state.askedCountries.length + 1} / ${state.targetCount}`;
    scoreEl.textContent = state.score;
    
    document.querySelector('.controls').style.display = 'none';
    pregameDescEl.style.display = 'none';
    gameInfoEl.style.display = 'flex';
    
    state.status = 'PLAYING';
    welcomeModal.classList.add('hidden');
    recapModal.classList.add('hidden');
    nextQuestion();
}

startBtn.addEventListener('click', () => startGame(false));
document.getElementById('restart-full-btn').addEventListener('click', () => { location.reload(); });
document.getElementById('continue-game-btn').addEventListener('click', () => startGame(true));

function nextQuestion() {
    clearTimeout(state.timerInterval);
    resetGlobeColors();

    if (state.askedCountries.length >= state.targetCount || state.askedCountries.length === countriesData.length) {
        endGame(`Harika! ${state.targetCount} ülkeyi tamamladın.`);
        return;
    }

    let unasked = countriesData.filter(c => !state.askedCountries.includes(c.iso));
    let randIndex = Math.floor(Math.random() * unasked.length);
    state.currentCountry = unasked[randIndex];
    state.attempts = 1;

    // Pan to the region slightly but randomize to not give it away immediately
    const centroid = globe.getCoords(state.currentCountry.geometry.coordinates[0][0][1], state.currentCountry.geometry.coordinates[0][0][0]);
    // globe.pointOfView({ lat: centroid.lat + 10, lng: centroid.lng - 20, altitude: 2 }, 1000);

    const mode = modeSelect.value;
    state.currentMode = mode;
    if (mode === 'mixed') {
        const types = ['name', 'capital', 'flag'];
        state.currentMode = types[Math.floor(Math.random() * types.length)];
    }

    const remainingForMax = countriesData.length - state.askedCountries.length;
    const diffM = 0.2 + (0.8 * (remainingForMax / countriesData.length));
    
    let baseVal = 100;
    if (state.currentMode === 'capital') baseVal = 150;
    if (state.currentMode === 'flag') baseVal = 200;
    state.maxPossibleScore += Math.max(Math.round(baseVal * diffM), 5);

    progressEl.textContent = `${state.askedCountries.length + 1} / ${state.targetCount}`;

    if (state.currentMode === 'flag') {
        textContainer.classList.add('hidden');
        flagContainer.classList.remove('hidden');
        questionFlagEl.className = `fi fi-${state.currentCountry.iso.toLowerCase()}`;
    } else if (state.currentMode === 'capital') {
        flagContainer.classList.add('hidden');
        textContainer.classList.remove('hidden');
        questionLabelEl.textContent = "Başkent";
        questionEl.textContent = state.currentCountry.capital;
    } else {
        flagContainer.classList.add('hidden');
        textContainer.classList.remove('hidden');
        questionLabelEl.textContent = "Ülke İsmi";
        questionEl.textContent = state.currentCountry.name;
    }

    feedbackEl.textContent = "Küre üzerinde ülkeyi bulun!";
    feedbackEl.style.color = "var(--text-gray)";
    
    startTimer(15.0);
}

function startTimer(seconds) {
    state.timeLeft = seconds;
    updateTimer();

    state.timerInterval = setInterval(() => {
        state.timeLeft -= 0.1;
        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            updateTimer();
            clearInterval(state.timerInterval);
            handleTimeout();
        } else {
            updateTimer();
        }
    }, 100);
}

function updateTimer() {
    timerEl.textContent = state.timeLeft.toFixed(1);
    let colorClass = 'timer-default';
    if (state.timeLeft <= 2) colorClass = 'timer-red';
    else if (state.timeLeft <= 5) colorClass = 'timer-orange';
    else if (state.timeLeft <= 8) colorClass = 'timer-green';
    
    if (timerEl.dataset.currentColor !== colorClass) {
        timerEl.className = `large-timer ${colorClass}`;
        timerEl.dataset.currentColor = colorClass;
    }
}

function handlePolygonClick(polygon) {
    if (state.status !== 'PLAYING') return;
    if (state.askedCountries.includes(polygon.iso)) return;

    clearTimeout(state.timerInterval);

    if (polygon.iso === state.currentCountry.iso) {
        // Correct
        const base = state.currentMode === 'flag' ? 200 : (state.currentMode === 'capital' ? 150 : 100);
        const remaining = countriesData.length - state.askedCountries.length;
        const diffM = 0.2 + (0.8 * (remaining / countriesData.length));
        const timeM = state.timeLeft / 15.0;
        const pts = Math.round(base * diffM * timeM * (state.attempts === 1 ? 1 : 0.5));
        
        state.score += Math.max(pts, 5);
        scoreEl.textContent = state.score;
        
        feedbackEl.textContent = `Doğru! +${Math.max(pts, 5)} Puan`;
        feedbackEl.style.color = "var(--teal-sec)";
        
        globe.polygonCapColor(d => d === polygon ? 'rgba(6, 214, 160, 0.5)' : (state.askedCountries.includes(d.iso) ? 'rgba(15, 23, 42, 0.7)' : 'rgba(0, 0, 0, 0.01)'));
        state.askedCountries.push(state.currentCountry.iso);
        
        setTimeout(() => { if(state.status === 'PLAYING') nextQuestion(); }, 1500);

    } else {
        // Wrong
        globe.polygonCapColor(d => d === polygon ? 'rgba(239, 68, 68, 0.8)' : (state.askedCountries.includes(d.iso) ? 'rgba(15, 23, 42, 0.7)' : 'rgba(0, 0, 0, 0.01)'));
        
        if (state.attempts === 1) {
            feedbackEl.textContent = "Yanlış! İkinci hakkın.";
            feedbackEl.style.color = "#fb923c";
            state.attempts = 2;
            setTimeout(() => {
                resetGlobeColors();
                startTimer(15.0);
            }, 800);
        } else {
            feedbackEl.textContent = `Bilemediniz! Cevap: ${state.currentCountry.name}`;
            feedbackEl.style.color = "#ef4444";
            
            // Highlight correct one
            globe.polygonCapColor(d => {
                if (d.iso === state.currentCountry.iso) return 'rgba(34, 193, 195, 0.8)'; // highlight correct
                if (d === polygon) return 'rgba(239, 68, 68, 0.4)';
                if (state.askedCountries.includes(d.iso)) return 'rgba(15, 23, 42, 0.7)';
                return 'rgba(0, 0, 0, 0.01)';
            });
            
            state.askedCountries.push(state.currentCountry.iso);
            setTimeout(() => { if(state.status === 'PLAYING') nextQuestion(); }, 2000);
        }
    }
}

function handleTimeout() {
    if (state.attempts === 1) {
        feedbackEl.textContent = "Süre doldu! Son hakkın.";
        feedbackEl.style.color = "#fb923c";
        state.attempts = 2;
        startTimer(15.0);
    } else {
        feedbackEl.textContent = `Bilemediniz! Cevap: ${state.currentCountry.name}`;
        feedbackEl.style.color = "#ef4444";
        
        globe.polygonCapColor(d => d.iso === state.currentCountry.iso ? 'rgba(34, 193, 195, 0.8)' : (state.askedCountries.includes(d.iso) ? 'rgba(15, 23, 42, 0.7)' : 'rgba(0, 0, 0, 0.01)'));
        
        state.askedCountries.push(state.currentCountry.iso);
        setTimeout(() => { if(state.status === 'PLAYING') nextQuestion(); }, 2000);
    }
}

function resetGlobeColors() {
    globe.polygonCapColor(d => state.askedCountries.includes(d.iso) ? 'rgba(15, 23, 42, 0.7)' : 'rgba(0, 0, 0, 0.01)');
    globe.polygonStrokeColor(d => state.askedCountries.includes(d.iso) ? 'rgba(91, 231, 255, 0.1)' : 'rgba(91, 231, 255, 0.5)');
}

function endGame(msg) {
    state.status = 'GAMEOVER';
    clearInterval(state.timerInterval);
    progressEl.textContent = `${state.targetCount} / ${state.targetCount}`;
    gameInfoEl.style.display = 'none';
    pregameDescEl.style.display = 'block';
    pregameDescEl.textContent = `${msg} Puan: ${state.score}`;
    pregameDescEl.style.color = "var(--cyan-primary)";
    
    document.querySelector('.controls').style.display = 'flex';
    startBtn.style.display = 'none';
    document.getElementById('endgame-actions').style.display = 'flex';
    globe.controls().autoRotate = true;
    
    if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    // Show detailed recap
    const badge = calculateBadge(state.score);
    document.getElementById('recap-score').textContent = state.score;
    document.getElementById('recap-badge').textContent = badge;
    recapModal.classList.remove('hidden');

    autoSubmitWorldScore();
}

async function autoSubmitWorldScore() {
    try {
        const badge = calculateBadge(state.score);
        const sig = await generateSignature(state.score, state.targetCount);
        
        const res = await fetch('/api/world/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                score: state.score,
                badge: badge,
                city_count: state.targetCount,
                player_token: state.playerToken,
                signature: sig
            })
        });
        
        if(res.ok) {
            const data = await res.json();
            state.lastScoreId = data.score_id;
            if(data.player_token) {
                state.playerToken = data.player_token;
                localStorage.setItem('playerToken', data.player_token);
            }
            document.getElementById('recap-assigned-name').textContent = data.assigned_name;
            state.playerName = data.assigned_name;
            localStorage.setItem('playerName', data.assigned_name);
        }
    } catch (e) {
        console.error("Score submit error", e);
    }
}

async function updatePlayerName() {
    const newName = document.getElementById('player-name').value;
    if (!newName || !state.playerToken) return;
    
    try {
        const res = await fetch(`/api/world/players/${state.playerToken}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_name: newName })
        });
        if (res.ok) {
            showToast("İsminiz güncellendi!", "success");
            document.getElementById('recap-assigned-name').textContent = newName;
            state.playerName = newName;
            localStorage.setItem('playerName', newName);
        } else {
            const data = await res.json();
            showToast(data.error || "Hata oluştu!", "error");
        }
    } catch (e) { showToast("Bağlantı hatası!", "error"); }
}

function shareScore() {
    const badge = calculateBadge(state.score);
    const text = `🌍 Ülke Bulmaca'da ${state.score} puan yaparak "${badge}" unvanını kazandım! Bakalım sen beni geçebilecek misin? 🎯\n\nOyna: ${window.location.origin}`;
    if (navigator.share) {
        navigator.share({ title: 'Dünya Map Oyunu', text: text, url: window.location.origin });
    } else {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }
    
    if (state.lastScoreId) {
        fetch(`/api/world/scores/${state.lastScoreId}/share`, { method: 'PATCH' });
    }
}

// --- Event Listeners for Modals ---
document.getElementById('show-leaderboard-btn').addEventListener('click', () => {
    leaderboardModal.classList.remove('hidden');
    fetchLeaderboard();
});

document.getElementById('close-leaderboard-btn').addEventListener('click', () => {
    leaderboardModal.classList.add('hidden');
});

document.getElementById('leaderboard-filter').addEventListener('change', fetchLeaderboard);

document.getElementById('welcome-start-btn').addEventListener('click', () => {
    welcomeModal.classList.add('hidden');
});

document.getElementById('close-recap-btn').addEventListener('click', () => {
    recapModal.classList.add('hidden');
});

document.getElementById('update-name-btn').addEventListener('click', updatePlayerName);
document.getElementById('share-btn').addEventListener('click', shareScore);

// Close modals on overlay click
[welcomeModal, recapModal, leaderboardModal].forEach(m => {
    m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.add('hidden');
    });
});

}

// Handle window resize for globe responsiveness
window.addEventListener('resize', () => {
    if (globe) {
        globe.width(window.innerWidth);
        globe.height(window.innerHeight);
    }
});

function showToast(msg, type='success') {
    const cont = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    cont.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300) 
    }, 3000);
}
