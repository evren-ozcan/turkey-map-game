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
    targetCount: 81
};

// Start Game
startBtn.addEventListener('click', () => {
    if (state.status === 'PLAYING') return;
    
    state.score = 0;
    state.maxPossibleScore = 0;
    state.askedCities = [];
    state.targetCount = parseInt(countSelect.value);
    progressEl.textContent = `1 / ${state.targetCount}`;
    scoreEl.textContent = state.score;
    
    // Hide controls totally for immense focus
    document.querySelector('.controls').style.display = 'none';
    timerEl.style.display = 'inline-block';
    
    state.status = 'PLAYING';
    
    nextQuestion();
});

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

    // Add to theoretical max points pool
    state.maxPossibleScore += state.isPlateQuestion ? 150 : 100;

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
        const basePoints = state.isPlateQuestion ? 150 : 100;
        const timeMultiplier = state.timeLeft / 10.0; // 0.0 to 1.0
        const attemptMultiplier = state.attempts === 1 ? 1 : 0.5;
        const pointsEarned = Math.round(basePoints * timeMultiplier * attemptMultiplier);
        
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
    clearInterval(state.timerInterval);
    progressEl.textContent = `${state.targetCount} / ${state.targetCount}`;
    questionLabelEl.textContent = "Oyun Bitti";
    questionEl.textContent = `Toplam Puan: ${state.score}`;
    feedbackEl.textContent = message;
    feedbackEl.style.color = "#38bdf8";
    startBtn.textContent = "Tekrar Oyna";
    document.querySelector('.controls').style.display = 'flex';
    timerEl.style.display = 'none';
    
    // Show recap modal
    const badge = calculateBadge(state.score, state.targetCount);
    recapScoreEl.textContent = state.score;
    recapBadgeEl.textContent = badge;
    recapModal.classList.remove('hidden');
}

// --- Phase 2: Badges, Leaderboard, Share ---

function calculateBadge(score, targetCount) {
    const maxScore = state.maxPossibleScore || (targetCount * 100);
    const percentage = score / maxScore;
    
    if (percentage === 1) return "Evliya Çelebi 🏕️";
    if (percentage >= 0.7) return "Türkiye Gezgini 🌍";
    if (percentage >= 0.4) return "Yolcu 🎒";
    return "Ev Kuşu 🏠";
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

document.getElementById('submit-score-btn').addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert("Lütfen bir isim girin.");
        return;
    }
    
    const badge = calculateBadge(state.score, state.targetCount);
    try {
        const response = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_name: name,
                score: state.score,
                badge: badge,
                city_count: state.targetCount
            })
        });
        
        if (response.ok) {
            alert("Skorunuz kaydedildi!");
            recapModal.classList.add('hidden');
            fetchLeaderboard();
        } else {
            console.error("Error saving score");
            alert("Skor kaydedilirken bir hata oluştu.");
        }
    } catch (e) {
        console.error("Network error:", e);
        alert("Bağlantı hatası. Sunucu çalışıyor mu?");
    }
});

document.getElementById('share-btn').addEventListener('click', () => {
    const badge = calculateBadge(state.score, state.targetCount);
    const text = `Türkiye Haritası Oyununda ${state.score} puanla '${badge}' unvanını kazandım! Sen haritayı ne kadar iyi biliyorsun?`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Türkiye Haritası Oyunu',
            text: text,
            url: window.location.href
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text + " " + window.location.href);
        alert("Sonuç metni panoya kopyalandı! İstediğiniz yerde (WhatsApp, Twitter vb.) yapıştırarak paylaşabilirsiniz.");
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
        alert("Liderlik tablosu yüklenemedi. Sunucu çalışıyor mu?");
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

