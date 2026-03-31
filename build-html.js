const fs = require('fs');
const svg = fs.readFileSync('turkey.svg', 'utf8');

const html = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Türkiye Haritası Oyunu</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <div id="bg-anim"></div>
    <div id="wrapper">
        <header class="glass-panel">
            <div class="stats">
                <div class="stat-box">
                    <span class="label">Puan</span>
                    <span class="value score-val" id="score">0</span>
                </div>
                <div class="stat-box countdown-box">
                    <span class="label">Kalan Süre</span>
                    <span class="value timer-val" id="timer">5.0</span>
                </div>
            </div>
            
            <div class="center-content">
                <div class="question-container">
                    <p id="question-label">Bulman Gereken Şehir</p>
                    <h1 id="question">Türkiye Haritası Oyunu</h1>
                    <p id="feedback" class="feedback-text">Hazır olduğunda başla</p>
                </div>
            </div>
            
            <button id="start-btn" class="primary-btn">Oyuna Başla</button>
        </header>

        <main class="map-container glass-panel" id="map-wrapper">
            ${svg}
        </main>
    </div>
    
    <script src="cities.js"></script>
    <script src="script.js"></script>
</body>
</html>`;

fs.writeFileSync('index.html', html);
console.log('Created index.html');
