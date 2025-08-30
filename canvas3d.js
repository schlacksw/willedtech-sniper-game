// Canvas 3D Sniper Game - No external dependencies
let canvas, ctx;
let gameActive = true;
let score = 0;
let ammo = 5;
let timeLeft = 60;
let targetsKilled = 0;
let targets = [];
let mouse = { x: 0, y: 0 };

// DOM elements
const scoreElement = document.getElementById('scoreValue');
const ammoElement = document.getElementById('ammoValue');
const timeElement = document.getElementById('timeValue');
const distanceElement = document.getElementById('distanceValue');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const targetsKilledElement = document.getElementById('targetsKilled');
const restartBtn = document.getElementById('restartBtn');
const loadingElement = document.getElementById('loading');

function init() {
    console.log('Starting Canvas 3D Sniper Game...');
    
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.background = 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 30%, #4a4a4a 70%, #2c3e50 100%)';
    document.getElementById('gameContainer').appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    
    // Hide loading
    loadingElement.style.display = 'none';
    
    // Event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', shoot);
    restartBtn.addEventListener('click', restartGame);
    window.addEventListener('resize', onWindowResize);
    
    // Create initial targets
    createTarget();
    
    // Start game
    updateHUD();
    gameLoop();
    startTimer();
    
    console.log('Canvas game initialized!');
}

function createTarget() {
    if (targets.length >= 3) return;
    
    const target = {
        x: Math.random() * (canvas.width - 200) + 100,
        y: canvas.height - 150 - Math.random() * 200,
        width: 40,
        height: 60,
        moveDirection: Math.random() > 0.5 ? 1 : -1,
        moveSpeed: 0.5 + Math.random() * 1,
        originalX: 0,
        spawnTime: Date.now(),
        distance: 50 + Math.random() * 100
    };
    
    target.originalX = target.x;
    targets.push(target);
    console.log('Target created at:', target.x, target.y);
}

function updateTargets() {
    const currentTime = Date.now();
    
    targets.forEach((target, index) => {
        // Move target
        target.x += target.moveDirection * target.moveSpeed;
        
        // Bounce at edges
        if (Math.abs(target.x - target.originalX) > 100) {
            target.moveDirection *= -1;
        }
        
        // Keep in bounds
        if (target.x < 20 || target.x > canvas.width - 20) {
            target.moveDirection *= -1;
        }
        
        // Remove old targets
        if (currentTime - target.spawnTime > 8000) {
            targets.splice(index, 1);
        }
    });
    
    // Spawn new targets randomly
    if (Math.random() < 0.005 && targets.length < 3) { // 0.5% chance per frame
        createTarget();
    }
}

function drawEnvironment() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw gradient sky/ground
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.3, '#87CEEB');
    gradient.addColorStop(0.7, '#4a4a4a');
    gradient.addColorStop(1, '#2c3e50');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple buildings (rectangles getting smaller with distance)
    const buildings = [
        { x: 50, y: canvas.height - 200, width: 80, height: 150, color: '#666' },
        { x: 200, y: canvas.height - 180, width: 60, height: 120, color: '#555' },
        { x: 350, y: canvas.height - 220, width: 90, height: 170, color: '#777' },
        { x: 500, y: canvas.height - 160, width: 70, height: 110, color: '#666' },
        { x: 650, y: canvas.height - 190, width: 85, height: 140, color: '#444' }
    ];
    
    buildings.forEach(building => {
        ctx.fillStyle = building.color;
        ctx.fillRect(building.x, building.y, building.width, building.height);
        
        // Add simple windows
        ctx.fillStyle = '#ffff88';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < Math.floor(building.height / 30); j++) {
                if (Math.random() > 0.3) { // 70% chance of lit window
                    ctx.fillRect(
                        building.x + 10 + i * 20,
                        building.y + 10 + j * 30,
                        8, 12
                    );
                }
            }
        }
    });
}

function drawTargets() {
    targets.forEach(target => {
        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(target.x - 2, target.y + target.height + 2, target.width + 4, 8);
        
        // Draw body
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(target.x + 8, target.y + 15, target.width - 16, target.height - 25);
        
        // Draw head
        ctx.fillStyle = '#f4c2a1';
        ctx.beginPath();
        ctx.arc(target.x + target.width/2, target.y + 12, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw weapon
        ctx.fillStyle = '#333';
        ctx.fillRect(target.x + target.width - 5, target.y + 20, 15, 3);
        
        // Draw red outline to make target more visible
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(target.x, target.y, target.width, target.height);
    });
}

function drawCrosshair() {
    // Draw sniper scope
    const centerX = mouse.x;
    const centerY = mouse.y;
    const radius = 100;
    
    // Scope circle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Crosshairs
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
    ctx.fill();
}

function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    
    // Update distance to nearest target
    let nearestDistance = '--';
    targets.forEach(target => {
        const dx = mouse.x - (target.x + target.width/2);
        const dy = mouse.y - (target.y + target.height/2);
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < 50) { // If crosshair is near target
            nearestDistance = Math.round(target.distance);
        }
    });
    distanceElement.textContent = nearestDistance;
}

function shoot() {
    if (!gameActive || ammo <= 0) return;
    
    console.log('Shot fired at:', mouse.x, mouse.y);
    ammo--;
    updateHUD();
    
    // Check for hits
    let hit = false;
    targets.forEach((target, index) => {
        const dx = mouse.x - (target.x + target.width/2);
        const dy = mouse.y - (target.y + target.height/2);
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < target.width/2 + 20) { // Hit detection radius
            hitTarget(target, index);
            hit = true;
        }
    });
    
    // Muzzle flash effect
    canvas.style.filter = 'brightness(1.5)';
    setTimeout(() => {
        canvas.style.filter = 'brightness(1)';
    }, 100);
    
    if (ammo <= 0 && targets.length === 0) {
        setTimeout(endGame, 1000);
    }
}

function hitTarget(target, index) {
    console.log('Target hit!');
    
    const points = 15 + Math.floor(target.distance / 10) * 5;
    score += points;
    targetsKilled++;
    updateHUD();
    
    // Show hit indicator
    showHitIndicator(target, points);
    
    // Remove target
    targets.splice(index, 1);
    
    // Ammo bonus
    if (score % 75 === 0) {
        ammo += 2;
        updateHUD();
    }
}

function showHitIndicator(target, points) {
    const indicator = document.createElement('div');
    indicator.textContent = `+${points} HIT!`;
    indicator.style.position = 'absolute';
    indicator.style.left = (target.x + 20) + 'px';
    indicator.style.top = (target.y - 20) + 'px';
    indicator.style.color = '#00ff00';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '20px';
    indicator.style.zIndex = '1000';
    indicator.style.animation = 'fadeUp 1.5s ease-out forwards';
    indicator.style.pointerEvents = 'none';
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 1500);
}

function gameLoop() {
    if (!gameActive) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    updateTargets();
    drawEnvironment();
    drawTargets();
    drawCrosshair();
    
    requestAnimationFrame(gameLoop);
}

function updateHUD() {
    scoreElement.textContent = score;
    ammoElement.textContent = ammo;
    timeElement.textContent = timeLeft;
}

function startTimer() {
    const timer = setInterval(() => {
        if (!gameActive) {
            clearInterval(timer);
            return;
        }
        
        timeLeft--;
        updateHUD();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameActive = false;
    targets = [];
    
    finalScoreElement.textContent = score;
    targetsKilledElement.textContent = targetsKilled;
    gameOverScreen.classList.remove('hidden');
    
    console.log('Game ended. Score:', score);
}

function restartGame() {
    gameActive = true;
    score = 0;
    ammo = 5;
    timeLeft = 60;
    targetsKilled = 0;
    targets = [];
    
    gameOverScreen.classList.add('hidden');
    updateHUD();
    startTimer();
    createTarget();
    
    console.log('Game restarted');
}

function onWindowResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Start when page loads
document.addEventListener('DOMContentLoaded', init);
