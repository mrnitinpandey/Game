const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreElement = document.getElementById('final-score');
const finalLevelElement = document.getElementById('final-level');
const muteBtn = document.getElementById('mute-btn');
const carOptions = document.querySelectorAll('.car-option');

// Audio System
let audioCtx;
let isMuted = false;
let engineOsc;
let engineGain;

// Background Music
let musicNotes = [110.00, 110.00, 220.00, 110.00, 130.81, 110.00, 146.83, 164.81];
let musicIndex = 0;
let nextNoteTime = 0;
let musicTempo = 0.15;

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    if(isMuted && engineGain) {
        engineGain.gain.setTargetAtTime(0, audioCtx ? audioCtx.currentTime : 0, 0.1);
    } else if(!isMuted && engineGain && gameState.isRunning) {
        engineGain.gain.setTargetAtTime(0.05, audioCtx ? audioCtx.currentTime : 0, 0.1);
        if(audioCtx) nextNoteTime = audioCtx.currentTime + 0.1;
    }
});

function initAudio() {
    if(!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playEngineSound() {
    if(isMuted) return;
    if(!engineOsc) {
        engineOsc = audioCtx.createOscillator();
        engineGain = audioCtx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(50, audioCtx.currentTime);
        
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, audioCtx.currentTime);
        
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        
        engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
        engineOsc.start();
    }
    engineGain.gain.setTargetAtTime(0.03, audioCtx.currentTime, 0.5);
}

function updateEnginePitch() {
    if(engineOsc && !isMuted) {
        let pitch = 50 + (gameState.speed * gameState.speedMultiplier * 5);
        engineOsc.frequency.setTargetAtTime(pitch, audioCtx.currentTime, 0.1);
    }
}

function stopEngineSound() {
    if(engineGain) {
        engineGain.gain.setTargetAtTime(0, audioCtx ? audioCtx.currentTime : 0, 0.5);
    }
}

function playSound(type) {
    if(isMuted || !audioCtx) return;
    
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if(type === 'pass') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if(type === 'crash') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else if(type === 'levelup') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

function playBackgroundMusic() {
    if(isMuted || !audioCtx || !gameState.isRunning) {
        if(audioCtx) nextNoteTime = audioCtx.currentTime + 0.1;
        return;
    }
    
    while (nextNoteTime < audioCtx.currentTime + 0.2) {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        let filter = audioCtx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.value = musicNotes[musicIndex];
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, nextNoteTime);
        filter.frequency.exponentialRampToValueAtTime(100, nextNoteTime + musicTempo - 0.02);
        
        gain.gain.setValueAtTime(0, nextNoteTime);
        gain.gain.linearRampToValueAtTime(0.04, nextNoteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + musicTempo - 0.01);
        
        osc.start(nextNoteTime);
        osc.stop(nextNoteTime + musicTempo);
        
        musicIndex = (musicIndex + 1) % musicNotes.length;
        nextNoteTime += musicTempo;
    }
}

// Particle System
let particles = [];

class Particle {
    constructor(x, y, dx, dy, size, color, life) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.size = size;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }
    update(dt) {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= dt;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

// Scenery System
let sceneries = [];

class Scenery {
    constructor(x, y, type, color) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
    }
    
    update() {
        this.y += gameState.speed * gameState.speedMultiplier;
    }
    
    draw(ctx) {
        if (this.type === 'tree') {
            ctx.fillStyle = '#654321'; // Trunk
            ctx.fillRect(this.x, this.y, 10, 20);
            ctx.fillStyle = this.color; // Leaves
            ctx.beginPath();
            ctx.arc(this.x + 5, this.y - 10, 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'animal') {
            ctx.fillStyle = this.color; // Body
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath(); // Head
            ctx.arc(this.x + 7, this.y - 5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

canvas.width = window.innerWidth > 500 ? 500 : window.innerWidth;
canvas.height = window.innerHeight > 500 && window.innerWidth > 500 ? window.innerHeight * 0.9 : window.innerHeight;

// Game State
let gameState = {
    isRunning: false,
    score: 0,
    level: 1,
    speed: 5,
    speedMultiplier: 1,
    laneCount: 3,
    roadOffset: 0,
    enemiesPassed: 0,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 1500,
    playerColor: '#00d2ff'
};

// Controls
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    a: false,
    s: false,
    d: false
};

let touchX = null;

// Themes
const themes = [
    { bg: '#2b2b2b', road: '#404040', lines: '#ffffff', grass: '#2e5c31' },
    { bg: '#1c1412', road: '#3b2f2f', lines: '#ffcc00', grass: '#8b5a2b' },
    { bg: '#1a1a2e', road: '#16213e', lines: '#0f3460', grass: '#e94560' },
    { bg: '#dcedc1', road: '#a8e6cf', lines: '#ffffff', grass: '#ffffff' },
    { bg: '#000000', road: '#111111', lines: '#ff003c', grass: '#3f000f' }
];

let currentTheme = themes[0];

class Car {
    constructor(x, y, width, height, color, isPlayer) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.color = color;
        this.isPlayer = isPlayer;
        this.speed = 0;
        this.laneWidth = canvas.width / gameState.laneCount;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        if(ctx.roundRect) {
            ctx.roundRect(5, 5, this.width, this.height, 8);
        } else {
            ctx.rect(5, 5, this.width, this.height);
        }
        ctx.fill();

        // Car Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        if(ctx.roundRect) {
            ctx.roundRect(0, 0, this.width, this.height, 8);
        } else {
            ctx.rect(0, 0, this.width, this.height);
        }
        ctx.fill();

        // Windshield
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(this.width * 0.1, this.height * 0.2, this.width * 0.8, this.height * 0.25);
        
        // Rear window
        ctx.fillRect(this.width * 0.15, this.height * 0.75, this.width * 0.7, this.height * 0.15);

        // Headlights
        if (this.isPlayer) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 15;
            ctx.fillRect(this.width * 0.1, -5, this.width * 0.2, 5);
            ctx.fillRect(this.width * 0.7, -5, this.width * 0.2, 5);
            
            // Tail lights
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.shadowColor = 'red';
            ctx.fillRect(this.width * 0.1, this.height, this.width * 0.2, 3);
            ctx.fillRect(this.width * 0.7, this.height, this.width * 0.2, 3);
        } else {
             ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
             ctx.shadowColor = 'red';
             ctx.shadowBlur = 10;
             ctx.fillRect(this.width * 0.1, -3, this.width * 0.2, 3);
             ctx.fillRect(this.width * 0.7, -3, this.width * 0.2, 3);
             
             ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
             ctx.shadowColor = 'yellow';
             ctx.fillRect(this.width * 0.1, this.height, this.width * 0.2, 5);
             ctx.fillRect(this.width * 0.7, this.height, this.width * 0.2, 5);
        }

        ctx.restore();
    }

    update() {
        if (this.isPlayer) {
            let moveSpeed = 7 * (canvas.width / 400);
            
            if (keys.ArrowLeft || keys.a) this.x -= moveSpeed;
            if (keys.ArrowRight || keys.d) this.x += moveSpeed;
            if (keys.ArrowUp || keys.w) this.y -= moveSpeed;
            if (keys.ArrowDown || keys.s) this.y += moveSpeed;

            if (touchX !== null) {
                if (touchX < canvas.width / 2) this.x -= moveSpeed;
                else this.x += moveSpeed;
            }

            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
            if (this.y < canvas.height * 0.1) this.y = canvas.height * 0.1;
            if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;
            
            this.speed = gameState.speed * gameState.speedMultiplier;
            
            if (gameState.isRunning && Math.random() > 0.3) {
                particles.push(new Particle(
                    this.x + this.width * 0.2 + (Math.random() * this.width * 0.6),
                    this.y + this.height,
                    (Math.random() - 0.5) * 1,
                    Math.random() * 2 + 3,
                    Math.random() * 2 + 2,
                    'rgba(200, 200, 200, 0.5)',
                    150 + Math.random() * 150
                ));
            }
        } else {
            this.y += this.speed * gameState.speedMultiplier;
        }
    }
}

let player;
let enemies = [];

function init() {
    initAudio();
    playEngineSound();
    
    if(audioCtx) nextNoteTime = audioCtx.currentTime + 0.1;
    musicIndex = 0;

    gameState.isRunning = true;
    gameState.score = 0;
    gameState.level = 1;
    gameState.speedMultiplier = 1;
    gameState.enemiesPassed = 0;
    gameState.spawnInterval = 1500;
    gameState.roadOffset = 0;
    
    currentTheme = themes[0];
    
    updateHUDElements();
    
    let carWidth = Math.min(canvas.width * 0.15, 60);
    let carHeight = carWidth * 2;
    
    player = new Car(
        canvas.width / 2 - carWidth / 2, 
        canvas.height - carHeight - 20, 
        carWidth, 
        carHeight, 
        gameState.playerColor, 
        true
    );
    
    enemies = [];
    particles = [];
    sceneries = [];
    
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
    let carWidth = Math.min(canvas.width * 0.15, 60);
    let carHeight = carWidth * 2;
    
    let laneWidth = canvas.width / gameState.laneCount;
    let lane = Math.floor(Math.random() * gameState.laneCount);
    let x = lane * laneWidth + (laneWidth / 2) - (carWidth / 2);
    
    let offset = (Math.random() - 0.5) * (laneWidth * 0.4);
    x += offset;
    
    const enemyColors = ['#ff3366', '#ff9933', '#cc33ff', '#33ff55'];
    let color = enemyColors[Math.floor(Math.random() * enemyColors.length)];
    
    let enemy = new Car(x, -carHeight - Math.random() * 100, carWidth, carHeight, color, false);
    enemy.speed = gameState.speed * (0.8 + Math.random() * 0.6); 
    enemy.passed = false;
    
    enemies.push(enemy);
}

function spawnScenery() {
    if (Math.random() > 0.95) {
        let shoulderWidth = canvas.width * 0.05;
        let side = Math.random() > 0.5 ? 0 : 1;
        
        let leftStart = 5;
        let leftEnd = Math.max(5, shoulderWidth - 10);
        let rightStart = Math.min(canvas.width - shoulderWidth + 5, canvas.width - 25);
        let rightEnd = Math.max(rightStart, canvas.width - 25);
        
        let x = side === 0 ? 
                leftStart + Math.random() * (leftEnd - leftStart) : 
                rightStart + Math.random() * (rightEnd - rightStart);
                
        let types = ['tree', 'tree', 'tree', 'animal'];
        let colors = {
            'tree': '#228b22',
            'animal': '#ffc896'
        };
        
        let type = types[Math.floor(Math.random() * types.length)];
        sceneries.push(new Scenery(x, -30, type, colors[type]));
    }
}

function drawBackground() {
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = currentTheme.grass;
    let shoulderWidth = canvas.width * 0.05;
    ctx.fillRect(0, 0, shoulderWidth, canvas.height);
    ctx.fillRect(canvas.width - shoulderWidth, 0, shoulderWidth, canvas.height);

    ctx.fillStyle = currentTheme.road;
    ctx.fillRect(shoulderWidth, 0, canvas.width - shoulderWidth * 2, canvas.height);

    ctx.fillStyle = currentTheme.lines;
    ctx.shadowBlur = 0;
    
    let laneWidth = canvas.width / gameState.laneCount;
    let lineLength = canvas.height * 0.1;
    let gapLength = canvas.height * 0.05;
    let totalLineSeg = lineLength + gapLength;
    
    gameState.roadOffset += gameState.speed * gameState.speedMultiplier;
    if (gameState.roadOffset > totalLineSeg) {
        gameState.roadOffset -= totalLineSeg;
    }

    for (let i = 1; i < gameState.laneCount; i++) {
        let x = i * laneWidth;
        for (let y = -totalLineSeg; y < canvas.height; y += totalLineSeg) {
            ctx.fillRect(x - 2, y + gameState.roadOffset, 4, lineLength);
        }
    }
}

function checkCollisions() {
    for (let i = 0; i < enemies.length; i++) {
        let enemy = enemies[i];
        
        let hitBoxX = player.width * 0.1;
        let hitBoxY = player.height * 0.1;
        
        if (player.x + hitBoxX < enemy.x + enemy.width &&
            player.x + player.width - hitBoxX > enemy.x &&
            player.y + hitBoxY < enemy.y + enemy.height &&
            player.y + player.height - hitBoxY > enemy.y) {
            
            playSound('crash');
            for(let p=0; p<30; p++) {
                particles.push(new Particle(
                    player.x + player.width/2,
                    player.y + player.height/2,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    Math.random() * 5 + 3,
                    Math.random() > 0.5 ? '#ff3366' : '#ff9933',
                    300 + Math.random() * 400
                ));
            }
            
            gameOver();
            return;
        }
    }
}

function updateHUDElements() {
    scoreElement.textContent = Math.floor(gameState.score);
    levelElement.textContent = gameState.level;
}

function checkLevelUp() {
    if (gameState.enemiesPassed >= 10 * gameState.level) {
        playSound('levelup');
        gameState.level++;
        gameState.speedMultiplier += 0.15;
        
        gameState.spawnInterval = Math.max(500, gameState.spawnInterval * 0.9);
        
        let themeIndex = (gameState.level - 1) % themes.length;
        currentTheme = themes[themeIndex];
        
        gameState.speed += 0.2;
        
        updateHUDElements();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameOver() {
    gameState.isRunning = false;
    stopEngineSound();
    const container = document.getElementById('game-container');
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 500);
    
    finalScoreElement.textContent = Math.floor(gameState.score);
    finalLevelElement.textContent = gameState.level;
    gameOverScreen.classList.add('active');
}

function gameLoop(timestamp) {
    if (!gameState.isRunning) return;

    let dt = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    gameState.spawnTimer += dt;
    if (gameState.spawnTimer > gameState.spawnInterval) {
        spawnEnemy();
        gameState.spawnTimer = 0;
        
        gameState.score += 5 * gameState.level;
        updateHUDElements();
    }
    
    spawnScenery();

    for(let i=sceneries.length-1; i>=0; i--) {
        sceneries[i].update();
        sceneries[i].draw(ctx);
        if(sceneries[i].y > canvas.height) sceneries.splice(i, 1);
    }

    player.update();
    player.draw(ctx);

    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.update();
        enemy.draw(ctx);
        
        if(enemy.y > player.y + player.height && !enemy.passed) {
             enemy.passed = true;
             playSound('pass');
        }
        
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            gameState.score += 10 * gameState.level;
            gameState.enemiesPassed++;
            
            checkLevelUp();
            updateHUDElements();
        }
    }

    for(let i=particles.length-1; i>=0; i--) {
       particles[i].update(dt);
       particles[i].draw(ctx);
       if(particles[i].life <= 0) particles.splice(i, 1);
    }
    
    updateEnginePitch();
    playBackgroundMusic();
    checkCollisions();

    if (gameState.isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    let touch = e.touches[0];
    let rect = canvas.getBoundingClientRect();
    window.touchX = touch.clientX - rect.left;
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    let touch = e.touches[0];
    let rect = canvas.getBoundingClientRect();
    window.touchX = touch.clientX - rect.left;
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    window.touchX = null;
}, {passive: false});

canvas.addEventListener('mousedown', (e) => {
    let rect = canvas.getBoundingClientRect();
    touchX = e.clientX - rect.left;
});

canvas.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) { // Left click held
        let rect = canvas.getBoundingClientRect();
        touchX = e.clientX - rect.left;
    }
});

canvas.addEventListener('mouseup', () => {
    touchX = null;
});

window.addEventListener('resize', () => {
    if(!gameState.isRunning) {
        canvas.width = window.innerWidth > 500 ? 500 : window.innerWidth;
        canvas.height = window.innerHeight > 500 && window.innerWidth > 500 ? window.innerHeight * 0.9 : window.innerHeight;
    }
});

carOptions.forEach(option => {
    option.addEventListener('click', () => {
        carOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        gameState.playerColor = option.dataset.color;
    });
});

startBtn.addEventListener('click', init);
restartBtn.addEventListener('click', init);
