// Sniper Game JavaScript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const crosshair = document.getElementById('crosshair');
const scoreElement = document.getElementById('scoreValue');
const ammoElement = document.getElementById('ammoValue');
const timeElement = document.getElementById('timeValue');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');

// Game state
let gameActive = true;
let score = 0;
let ammo = 5;
let timeLeft = 60;
let targets = [];
let targetSpawnRate = 2000; // milliseconds
let lastTargetSpawn = 0;

// Game settings
const maxTargets = 4;
const targetLifetime = 4000; // 4 seconds before bad guy escapes
const sniperSounds = {
    shot: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaGjyR2+i5aiAEOHi36f2nUS8OEGu12PqtSy8PEmm22Py/dSUFOms24Py4eCMGN2k34fmwcSAEQWss3fi0byAER28q3/e6dCEFVGoE2/q4dCMGX3MT1/SvcyAEWGgH2P6/dy'),
    hit: new Audio('data:audio/wav;base64,UklGRlIEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YS4EAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaGjyR2+i5aiAEOHi36f2nUS8OEGu12PqtSy8PEmm22Py/dSUFOms24Py4eCMGN2k34fmwcSAEQWss3fi0byAER28q3/e6dCEFVGoE2/q4dCMGX3MT1/SvcyAEWGgH2P6/dyQGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEG'),
    reload: new Audio('data:audio/wav;base64,UklGRjIDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQ4DAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaGjyR2+i5aiAEOHi36f2nUS8OEGu12PqtSy8PEmm22Py/dSUFOms24Py4eCMGN2k34fmwcSAEQWss3fi0byAER28q3/e6dCEFVGoE2/q4dCMGX3MT1/SvcyAEWGgH2P6/dyQGaFgB1/u2dyEFZmcC2PywdSEGc1sH2Pm')
};

// Initialize game
function init() {
    updateCrosshair();
    gameLoop();
    spawnTarget();
    startTimer();
    
    // Event listeners
    document.addEventListener('mousemove', updateCrosshair);
    document.addEventListener('click', shoot);
    restartBtn.addEventListener('click', restartGame);
}

// Update crosshair position
function updateCrosshair(e) {
    if (e) {
        crosshair.style.left = e.clientX + 'px';
        crosshair.style.top = e.clientY + 'px';
    }
}

// Spawn a new target
function spawnTarget() {
    if (!gameActive || targets.length >= maxTargets) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const target = {
        id: Date.now(),
        x: Math.random() * (canvas.width - 60) + 30,
        y: Math.random() * (canvas.height - 60) + 30,
        size: 60,
        spawnTime: Date.now(),
        element: null
    };
    
    // Create target element
    const targetElement = document.createElement('div');
    targetElement.className = 'target';
    targetElement.style.left = (canvasRect.left + target.x) + 'px';
    targetElement.style.top = (canvasRect.top + target.y) + 'px';
    targetElement.dataset.targetId = target.id;
    
    target.element = targetElement;
    document.body.appendChild(targetElement);
    targets.push(target);
    
    // Remove target after lifetime expires
    setTimeout(() => {
        removeTarget(target.id);
    }, targetLifetime);
}

// Remove target by ID
function removeTarget(targetId) {
    const targetIndex = targets.findIndex(t => t.id === targetId);
    if (targetIndex === -1) return;
    
    const target = targets[targetIndex];
    if (target.element && target.element.parentNode) {
        target.element.parentNode.removeChild(target.element);
    }
    targets.splice(targetIndex, 1);
}

// Shoot function
function shoot(e) {
    if (!gameActive || ammo <= 0) return;
    
    // Play shot sound
    try {
        sniperSounds.shot.currentTime = 0;
        sniperSounds.shot.volume = 0.3;
        sniperSounds.shot.play().catch(() => {}); // Ignore audio errors
    } catch (error) {}
    
    // Add muzzle flash effect
    showMuzzleFlash(e.clientX, e.clientY);
    
    ammo--;
    updateHUD();
    
    // Check if we hit a target
    const targetHit = document.elementFromPoint(e.clientX, e.clientY);
    if (targetHit && targetHit.classList.contains('target')) {
        hitTarget(targetHit);
    }
    
    // Game over if no ammo left
    if (ammo <= 0 && targets.length === 0) {
        setTimeout(endGame, 500);
    }
}

// Handle target hit
function hitTarget(targetElement) {
    const targetId = parseInt(targetElement.dataset.targetId);
    
    // Play hit sound
    try {
        sniperSounds.hit.currentTime = 0;
        sniperSounds.hit.volume = 0.4;
        sniperSounds.hit.play().catch(() => {}); // Ignore audio errors
    } catch (error) {}
    
    // Add hit animation
    targetElement.classList.add('hit-animation');
    
    // Increase score (more points for headshots)
    const isHeadshot = Math.random() > 0.7; // 30% chance for headshot
    score += isHeadshot ? 25 : 15;
    updateHUD();
    
    // Show hit indicator
    showHitIndicator(targetElement, isHeadshot);
    
    // Remove target after animation
    setTimeout(() => {
        removeTarget(targetId);
    }, 300);
    
    // Reload ammo bonus
    if (score % 75 === 0) {
        ammo += 2;
        updateHUD();
        // Play reload sound
        try {
            sniperSounds.reload.currentTime = 0;
            sniperSounds.reload.volume = 0.3;
            sniperSounds.reload.play().catch(() => {}); // Ignore audio errors
        } catch (error) {}
    }
}

// Show hit indicator
function showHitIndicator(targetElement, isHeadshot) {
    const indicator = document.createElement('div');
    indicator.textContent = isHeadshot ? '+25 HEADSHOT!' : '+15';
    indicator.style.position = 'absolute';
    indicator.style.left = targetElement.style.left;
    indicator.style.top = (parseInt(targetElement.style.top) - 30) + 'px';
    indicator.style.color = isHeadshot ? '#ff6b6b' : '#4ecdc4';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = isHeadshot ? '18px' : '14px';
    indicator.style.zIndex = '1000';
    indicator.style.animation = 'fadeUp 1s ease-out forwards';
    indicator.style.pointerEvents = 'none';
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 1000);
}

// Show muzzle flash effect
function showMuzzleFlash(x, y) {
    const flash = document.createElement('div');
    flash.className = 'muzzle-flash';
    flash.style.left = (x - 50) + 'px';
    flash.style.top = (y - 50) + 'px';
    
    document.body.appendChild(flash);
    
    setTimeout(() => {
        if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
        }
    }, 100);
}

// Update HUD display
function updateHUD() {
    scoreElement.textContent = score;
    ammoElement.textContent = ammo;
    timeElement.textContent = timeLeft;
}

// Start game timer
function startTimer() {
    const timer = setInterval(() => {
        timeLeft--;
        updateHUD();
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

// Main game loop
function gameLoop() {
    if (!gameActive) return;
    
    const currentTime = Date.now();
    
    // Spawn new targets periodically
    if (currentTime - lastTargetSpawn > targetSpawnRate && targets.length < maxTargets) {
        spawnTarget();
        lastTargetSpawn = currentTime;
        
        // Increase difficulty over time
        if (targetSpawnRate > 800) {
            targetSpawnRate -= 10;
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
    gameActive = false;
    
    // Remove all targets
    targets.forEach(target => {
        if (target.element && target.element.parentNode) {
            target.element.parentNode.removeChild(target.element);
        }
    });
    targets = [];
    
    // Show game over screen
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Restart game
function restartGame() {
    // Reset game state
    gameActive = true;
    score = 0;
    ammo = 5;
    timeLeft = 60;
    targets = [];
    targetSpawnRate = 2000;
    lastTargetSpawn = 0;
    
    // Hide game over screen
    gameOverScreen.classList.add('hidden');
    
    // Update HUD
    updateHUD();
    
    // Restart game
    init();
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', init);
