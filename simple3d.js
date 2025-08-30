// Simple 3D Sniper Game - Guaranteed to work
let scene, camera, renderer, raycaster, clock;
let targets = [];
let gameActive = true;
let score = 0;
let ammo = 5;
let timeLeft = 60;
let targetsKilled = 0;

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

// Mouse position
let mouse = new THREE.Vector2();

function init() {
    console.log('Initializing Simple 3D Sniper Game...');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 0);
    camera.lookAt(0, 0, -30);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // Raycaster for mouse picking
    raycaster = new THREE.Raycaster();
    clock = new THREE.Clock();
    
    // Create simple environment
    createSimpleEnvironment();
    
    // Hide loading
    loadingElement.style.display = 'none';
    
    // Event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', shoot);
    restartBtn.addEventListener('click', restartGame);
    
    // Start game
    updateHUD();
    animate();
    startTimer();
    
    // Create first target
    setTimeout(() => createTarget(), 500);
    
    console.log('Game initialized successfully!');
}

function createSimpleEnvironment() {
    // Simple ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Simple buildings (boxes)
    const buildingPositions = [
        { x: -20, z: -30, color: 0x555555 },
        { x: 0, z: -40, color: 0x666666 },
        { x: 20, z: -35, color: 0x444444 },
        { x: -30, z: -50, color: 0x777777 },
        { x: 30, z: -45, color: 0x333333 }
    ];
    
    buildingPositions.forEach(pos => {
        const geometry = new THREE.BoxGeometry(8, 15, 8);
        const material = new THREE.MeshBasicMaterial({ color: pos.color });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(pos.x, 7.5, pos.z);
        scene.add(building);
    });
    
    // Add some light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
}

function createTarget() {
    if (targets.length >= 2) return;
    
    // Simple target - red cube with a head
    const targetGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.8, 2, 8);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    targetGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffaaaa });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    targetGroup.add(head);
    
    // Random position
    const positions = [
        { x: -20, z: -25 },
        { x: 0, z: -35 },
        { x: 20, z: -30 },
        { x: -30, z: -45 },
        { x: 30, z: -40 }
    ];
    
    const pos = positions[Math.floor(Math.random() * positions.length)];
    targetGroup.position.set(pos.x, 0, pos.z);
    
    // Add movement data
    targetGroup.userData = {
        originalX: pos.x,
        moveDirection: Math.random() > 0.5 ? 1 : -1,
        moveSpeed: 0.02,
        spawnTime: Date.now()
    };
    
    scene.add(targetGroup);
    targets.push(targetGroup);
    
    console.log('Target created at:', pos.x, pos.z);
}

function updateTargets() {
    const currentTime = Date.now();
    
    targets.forEach((target, index) => {
        if (!target.userData) return;
        
        // Move target
        target.position.x += target.userData.moveDirection * target.userData.moveSpeed;
        
        // Bounce off limits
        if (Math.abs(target.position.x - target.userData.originalX) > 5) {
            target.userData.moveDirection *= -1;
        }
        
        // Remove old targets
        if (currentTime - target.userData.spawnTime > 8000) {
            scene.remove(target);
            targets.splice(index, 1);
        }
    });
    
    // Spawn new targets
    if (Math.random() < 0.01 && targets.length < 2) { // 1% chance per frame
        createTarget();
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update distance display
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
        const distance = Math.round(camera.position.distanceTo(intersects[0].object.parent.position));
        distanceElement.textContent = distance;
    } else {
        distanceElement.textContent = '--';
    }
}

function shoot() {
    if (!gameActive || ammo <= 0) return;
    
    console.log('Shot fired!');
    ammo--;
    updateHUD();
    
    // Check for hits
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
        hitTarget(intersects[0].object.parent);
    }
    
    // Flash effect
    document.body.style.background = 'rgba(255,255,0,0.3)';
    setTimeout(() => {
        document.body.style.background = '';
    }, 50);
    
    if (ammo <= 0 && targets.length === 0) {
        setTimeout(endGame, 1000);
    }
}

function hitTarget(targetGroup) {
    console.log('Target hit!');
    
    const distance = Math.round(camera.position.distanceTo(targetGroup.position));
    const points = 15 + Math.floor(distance / 5) * 5;
    
    score += points;
    targetsKilled++;
    updateHUD();
    
    // Show hit indicator
    showHitIndicator(points, distance);
    
    // Remove target
    const index = targets.indexOf(targetGroup);
    if (index > -1) {
        scene.remove(targetGroup);
        targets.splice(index, 1);
    }
    
    // Ammo bonus
    if (score % 50 === 0) {
        ammo += 2;
        updateHUD();
    }
}

function showHitIndicator(points, distance) {
    const indicator = document.createElement('div');
    indicator.textContent = `+${points} (${distance}m)`;
    indicator.style.position = 'fixed';
    indicator.style.left = '50%';
    indicator.style.top = '30%';
    indicator.style.transform = 'translateX(-50%)';
    indicator.style.color = '#00ff00';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '24px';
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
    
    // Remove all targets
    targets.forEach(target => scene.remove(target));
    targets = [];
    
    // Show game over screen
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
    
    // Clear targets
    targets.forEach(target => scene.remove(target));
    targets = [];
    
    gameOverScreen.classList.add('hidden');
    updateHUD();
    startTimer();
    
    // Create first target
    setTimeout(() => createTarget(), 1000);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameActive) {
        updateTargets();
    }
    
    renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start when page loads
if (typeof THREE !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    console.error('THREE.js not loaded!');
    document.getElementById('loading').innerHTML = 'Error: THREE.js library not loaded!';
}
