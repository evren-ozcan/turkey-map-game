// Get DOM elements
const progressEl = document.getElementById('progress');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const questionEl = document.getElementById('question');
const questionLabelEl = document.getElementById('question-label');
const feedbackEl = document.getElementById('feedback');
const startBtn = document.getElementById('start-btn');
const modeSelect = document.getElementById('mode-select');
const countSelect = document.getElementById('count-select');

// Modals
const recapModal = document.getElementById('recap-modal');
const leaderboardModal = document.getElementById('leaderboard-modal');
const recapScoreEl = document.getElementById('recap-score');
const recapBadgeEl = document.getElementById('recap-badge');
const playerNameInput = document.getElementById('player-name');
const leaderboardBody = document.getElementById('leaderboard-body');

const provinces = document.querySelectorAll('.province');

// Game State
let state = {
    status: 'IDLE', // IDLE, PLAYING, GAMEOVER
    score: 0,
    maxPossibleScore: 0,
    isPlateQuestion: false,
    timeLeft: 10.0,
    currentCity: null,
    attempts: 1,
    timerInterval: null,
    askedCities: [],
    targetCount: 81,
    playerToken: localStorage.getItem('playerToken') || null,
    assignedName: null,
    scoreSubmitted: false,
    currentScoreId: null
};

// Start Game Logic
function enterFullscreen() {
    if (window.innerWidth <= 900 || window.innerHeight <= 600) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen().catch(() => {});
        }
    }
}

function startGame(keepCities = false) {
    if (state.status === 'PLAYING') return;
    
    enterFullscreen();
    
    state.score = 0;
    state.maxPossibleScore = 0;
    
    if (!keepCities) {
        state.askedCities = [];
        provinces.forEach(p => p.classList.remove('passive'));
    }
    
    let requestedCount = parseInt(countSelect.value);
    const remainingCount = cities.length - state.askedCities.length;
    
    if (remainingCount === 0 && keepCities) {
        showToast("Tüm şehirleri zaten buldun! Harita baştan başlıyor.", "success");
        state.askedCities = [];
        provinces.forEach(p => p.classList.remove('passive'));
        state.targetCount = requestedCount;
    } else {
        state.targetCount = state.askedCities.length + Math.min(requestedCount, remainingCount);
    }
    
    progressEl.textContent = `${state.askedCities.length + 1} / ${state.targetCount}`;
    scoreEl.textContent = state.score;
    
    // Hide controls totally for immense focus
    document.querySelector('.controls').style.display = 'none';
    timerEl.style.display = 'inline-block';
    
    state.status = 'PLAYING';
    nextQuestion();
}

startBtn.addEventListener('click', () => startGame(false));
document.getElementById('restart-full-btn').addEventListener('click', () => startGame(false));
document.getElementById('continue-game-btn').addEventListener('click', () => startGame(true));

function nextQuestion() {
    clearTimeout(state.timerInterval);
    // Remove previous highlights
    provinces.forEach(p => {
        p.classList.remove('correct', 'incorrect', 'highlight');
        if (state.askedCities.includes(p.id)) {
            p.classList.add('passive');
        }
    });

    if (state.askedCities.length >= state.targetCount || state.askedCities.length === cities.length) {
        endGame(`Tebrikler! Hedeflediğin ${state.targetCount} şehri tamamladın.`);
        return;
    }

    // Pick random unasked city
    let unasked = cities.filter(c => !state.askedCities.includes(c.id));
    let randIndex = Math.floor(Math.random() * unasked.length);
    state.currentCity = unasked[randIndex];
    state.attempts = 1;
    
    // Read mode and determine question type
    const mode = modeSelect.value;
    let askByPlate = false;
    
    if (mode === 'mixed') {
        state.isPlateQuestion = Math.random() > 0.5;
    } else if (mode === 'plate') {
        state.isPlateQuestion = true;
    } else {
        state.isPlateQuestion = false;
    }

    // Add to theoretical max points pool (Dinamik Puanlama)
    const remainingCitiesForMax = cities.length - state.askedCities.length;
    const diffMultiplier = 0.2 + (0.8 * (remainingCitiesForMax / cities.length));
    const baseValue = state.isPlateQuestion ? 150 : 100;
    state.maxPossibleScore += Math.max(Math.round(baseValue * diffMultiplier), 5);

    // Update progress tracker
    const currentQuestion = Math.min(state.askedCities.length + 1, state.targetCount);
    progressEl.textContent = `${currentQuestion} / ${state.targetCount}`;

    if (state.isPlateQuestion) {
        questionLabelEl.textContent = "Plaka Numarası";
        questionEl.textContent = state.currentCity.plate.toString().padStart(2, '0');
    } else {
        questionLabelEl.textContent = "Şehir İsmi";
        questionEl.textContent = state.currentCity.name;
    }

    // Dynamic pop animation for city request
    questionEl.classList.remove('pop-anim');
    void questionEl.offsetWidth; // Force reflow
    questionEl.classList.add('pop-anim');

    feedbackEl.textContent = "Haritadan şehri seçin!";
    feedbackEl.style.color = "#94a3b8";

    startTimer(10.0);
}

function startTimer(seconds) {
    state.timeLeft = seconds;
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
        state.timeLeft -= 0.1;
        
        if (state.timeLeft <= 0) {
            state.timeLeft = 0;
            updateTimerDisplay();
            clearInterval(state.timerInterval);
            handleTimeout();
        } else {
            updateTimerDisplay();
        }
    }, 100);
}

function updateTimerDisplay() {
    timerEl.textContent = state.timeLeft.toFixed(1);
    
    let colorClass = 'timer-default';
    if (state.timeLeft <= 1.5) {
        colorClass = 'timer-red';
    } else if (state.timeLeft <= 3.9) {
        colorClass = 'timer-orange';
    } else if (state.timeLeft <= 5.9) {
        colorClass = 'timer-green';
    }
    
    if (timerEl.dataset.currentColor !== colorClass) {
        timerEl.className = `large-timer ${colorClass}`;
        timerEl.dataset.currentColor = colorClass;
    }
}

function handleTimeout() {
    if (state.attempts === 1) {
        feedbackEl.textContent = "Süre doldu! İkinci ve son hakkın.";
        feedbackEl.style.color = "#fbbf24";
        state.attempts = 2;
        startTimer(10.0);
    } else {
        feedbackEl.textContent = `Bilemediniz! Doğru cevap: ${state.currentCity.name}`;
        feedbackEl.style.color = "#ef4444";
        showCorrectCity();
        state.askedCities.push(state.currentCity.id);
        
        setTimeout(() => {
            if(state.status === 'PLAYING') nextQuestion();
        }, 2000);
    }
}

function showCorrectCity() {
    const correctPath = document.getElementById(state.currentCity.id);
    if (correctPath) {
        correctPath.classList.add('highlight');
    }
}

function checkAnswer(clickedId) {
    if (state.status !== 'PLAYING') return;
    if (state.askedCities.includes(clickedId)) return;

    clearTimeout(state.timerInterval);
    const clickedPath = document.getElementById(clickedId);

    if (clickedId === state.currentCity.id) {
        // Correct Answer
        clickedPath.classList.add('correct');
        const mapContainer = document.getElementById('map-wrapper');
        mapContainer.classList.add('flash-green');
        setTimeout(() => mapContainer.classList.remove('flash-green'), 500);
        
        // Calculate points: Max 100 (name) or 150 (plate) per question, scales down with time. Second attempt divides by 2.
        // Dinamik Zorluk Çarpanı eklendi (harita boşken yüksek puan, doluyken düşük puan)
        const remainingCities = cities.length - state.askedCities.length;
        const difficultyMultiplier = 0.2 + (0.8 * (remainingCities / cities.length));

        const basePoints = state.isPlateQuestion ? 150 : 100;
        const timeMultiplier = state.timeLeft / 10.0; // 0.0 to 1.0
        const attemptMultiplier = state.attempts === 1 ? 1 : 0.5;
        const pointsEarned = Math.round(basePoints * difficultyMultiplier * timeMultiplier * attemptMultiplier);
        
        state.score += Math.max(pointsEarned, 5); // at least 5 points for correct answer
        scoreEl.textContent = state.score;
        
        feedbackEl.textContent = `Tebrikler! +${Math.max(pointsEarned, 5)} Puan`;
        feedbackEl.style.color = "#22c55e";
        
        state.askedCities.push(state.currentCity.id);
        
        setTimeout(() => {
            if(state.status === 'PLAYING') nextQuestion();
        }, 1500);

    } else {
        // Wrong Answer
        clickedPath.classList.add('incorrect');
        const mapContainer = document.getElementById('map-wrapper');
        mapContainer.classList.remove('flash-red');
        void mapContainer.offsetWidth; // Force reflow
        mapContainer.classList.add('flash-red');
        setTimeout(() => mapContainer.classList.remove('flash-red'), 400);
        
        // Remove class after animation
        setTimeout(() => {
            clickedPath.classList.remove('incorrect');
        }, 500);

        if (state.attempts === 1) {
            feedbackEl.textContent = "Yanlış şehir! İkinci hakkın için süren başladı.";
            feedbackEl.style.color = "#fbbf24";
            state.attempts = 2;
            startTimer(10.0);
        } else {
            feedbackEl.textContent = `Bilemediniz! Doğru cevap: ${state.currentCity.name}`;
            feedbackEl.style.color = "#ef4444";
            showCorrectCity();
            state.askedCities.push(state.currentCity.id);
            
            setTimeout(() => {
                if(state.status === 'PLAYING') nextQuestion();
            }, 2000);
        }
    }
}

// Add click listeners to map
provinces.forEach(p => {
    p.addEventListener('click', (e) => {
        checkAnswer(e.target.id);
    });
});

function endGame(message) {
    state.status = 'GAMEOVER';
    state.scoreSubmitted = false;
    clearInterval(state.timerInterval);
    progressEl.textContent = `${state.targetCount} / ${state.targetCount}`;
    questionLabelEl.textContent = "Oyun Bitti";
    questionEl.textContent = `Toplam Puan: ${state.score}`;
    feedbackEl.textContent = message;
    feedbackEl.style.color = "#38bdf8";
    startBtn.style.display = 'none';
    document.getElementById('endgame-actions').style.display = 'flex';
    document.querySelector('.controls').style.display = 'flex';
    timerEl.style.display = 'none';
    
    // Show recap modal immediately
    const badge = calculateBadge(state.score, state.targetCount);
    recapScoreEl.textContent = state.score;
    recapBadgeEl.textContent = badge;
    recapModal.classList.remove('hidden');
    
    // Auto-submit score in background
    autoSubmitScore(badge);
}

// --- Phase 2: Badges, Leaderboard, Share ---

async function generateSignature(score, targetCount) {
    const salt = "TrMap_SecR3T_2026!";
    const msg = new TextEncoder().encode(`${score}:${targetCount}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msg);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculateBadge(score, targetCount) {
    const maxScore = state.maxPossibleScore || (targetCount * 100);
    let percentage = 0;
    if (maxScore > 0) percentage = score / maxScore;
    
    if (percentage >= 1.0) return "Evliya Çelebi 🏕️";
    if (percentage >= 0.90) return "Ayaklı Navigasyon 🧭";
    if (percentage >= 0.75) return "Uzun Yol Kaptanı 🚌";
    if (percentage >= 0.60) return "Çaylak Kâşif 🚶‍♂️";
    if (percentage >= 0.40) return "GPS Mağduru 📱";
    if (percentage >= 0.20) return "Tabelalara Küskün 🤷‍♂️";
    return "Ev Kuşu 🏠";
}

// Auto-submit score silently when game ends
async function autoSubmitScore(badge) {
    if (state.scoreSubmitted) return;
    state.scoreSubmitted = true;
    
    const assignedNameEl = document.getElementById('recap-assigned-name');
    const playerNameInput = document.getElementById('player-name');
    
    try {
        const signature = await generateSignature(state.score, state.targetCount);

        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                score: state.score,
                badge: badge,
                city_count: state.targetCount,
                player_token: state.playerToken,
                signature: signature
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            state.playerToken = data.player_token;
            state.assignedName = data.assigned_name;
            state.currentScoreId = data.score_id;
            localStorage.setItem('playerToken', data.player_token);
            
            // Show the assigned name in recap modal
            if (assignedNameEl) assignedNameEl.textContent = data.assigned_name;
            if (playerNameInput) {
                playerNameInput.value = '';
                playerNameInput.placeholder = data.is_custom_name 
                    ? data.assigned_name 
                    : `${data.assigned_name} — değiştirmek için yaz`;
            }
        }
    } catch (e) {
        console.error("Auto-submit error:", e);
    }
}

document.getElementById('close-recap-btn').addEventListener('click', () => {
    recapModal.classList.add('hidden');
});

document.getElementById('show-leaderboard-btn').addEventListener('click', () => {
    fetchLeaderboard();
});

document.getElementById('close-leaderboard-btn').addEventListener('click', () => {
    leaderboardModal.classList.add('hidden');
});

// Update player name (optional, user-initiated)
document.getElementById('update-name-btn').addEventListener('click', async () => {
    const name = document.getElementById('player-name').value.trim();
    if (!name) {
        showToast("Lütfen bir isim girin.", "error");
        return;
    }
    if (!state.playerToken) {
        showToast("Oyun verisi bulunamadı.", "error");
        return;
    }
    
    try {
        const response = await fetch(`/api/players/${state.playerToken}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_name: name })
        });
        
        if (response.ok) {
            const data = await response.json();
            state.assignedName = data.player_name;
            const assignedNameEl = document.getElementById('recap-assigned-name');
            if (assignedNameEl) assignedNameEl.textContent = data.player_name;
            document.getElementById('player-name').value = '';
            document.getElementById('player-name').placeholder = data.player_name;
            leaderboardModal.classList.add('hidden');
            showToast(`İsmin "${data.player_name}" olarak güncellendi! 🎉`, "success");
            fetchLeaderboard();
        } else {
            const errData = await response.json();
            leaderboardModal.classList.add('hidden');
            showToast(errData.error || "İsim güncellenirken hata oluştu.", "error");
        }
    } catch (e) {
        console.error("Name update error:", e);
        showToast("Bağlantı hatası.", "error");
    }
});

document.getElementById('share-btn').addEventListener('click', () => {
    const badge = calculateBadge(state.score, state.targetCount);
    const text = `Türkiye Haritası Oyununda ${state.score} puanla '${badge}' unvanını kazandım! Sen haritayı ne kadar iyi biliyorsun?`;
    
    // Mark this score row as shared
    if (state.currentScoreId) {
        fetch(`/api/scores/${state.currentScoreId}/share`, { method: 'PATCH' })
            .catch(e => console.error('Share mark error:', e));
    }
    
    if (navigator.share) {
        navigator.share({
            title: 'Türkiye Haritası Oyunu',
            text: text,
            url: window.location.href
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text + " " + window.location.href);
        showToast("Sonuç panoya kopyalandı! İstediğin yerde paylaşabilirsin.", "success");
    }
});

async function fetchLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        
        leaderboardBody.innerHTML = '';
        json.data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${index + 1}</td>
                <td>${escapeHTML(row.player_name)}</td>
                <td>${row.badge} <br><small>(${row.city_count} Şehir)</small></td>
                <td><strong>${row.score}</strong></td>
            `;
            leaderboardBody.appendChild(tr);
        });
        leaderboardModal.classList.remove('hidden');
    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        showToast("Liderlik tablosu yüklenemedi. İnternet bağlantınızı kontrol edin.", "error");
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Welcome Back Feature ---
async function fetchWelcomeStats() {
    if (!state.playerToken) return;
    try {
        const res = await fetch(`/api/players/${state.playerToken}/stats`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('welcome-name').textContent = data.player_name;
            document.getElementById('welcome-score').textContent = data.best_score;
            document.getElementById('welcome-badge').textContent = data.best_badge;
            if (data.rank > 0) {
                document.getElementById('welcome-rank').textContent = `${data.rank}. Sıra`;
            } else {
                document.getElementById('welcome-rank').textContent = "-";
            }
            document.getElementById('welcome-modal').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Error fetching welcome stats:", e);
    }
}

document.addEventListener('DOMContentLoaded', fetchWelcomeStats);

document.getElementById('welcome-start-btn')?.addEventListener('click', () => {
    document.getElementById('welcome-modal').classList.add('hidden');
});
