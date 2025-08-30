// 3D Sniper Game using Three.js
let scene, camera, renderer, raycaster;
let targets = [];
let buildings = [];
let mouse = new THREE.Vector2();
let gameActive = true;
let score = 0;
let ammo = 5;
let timeLeft = 60;
let targetsKilled = 0;
let targetSpawnRate = 3000;
let lastTargetSpawn = 0;

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

// Audio
const sniperSounds = {
    shot: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaGjyR2+i5aiAEOHi36f2nUS8OEGu12PqtSy8PEmm22Py/dSUFOms24Py4eCMGN2k34fmwcSAEQWss3fi0byAER28q3/e6dCEFVGoE2/q4dCMGX3MT1/SvcyAEWGgH2P6/dy'),
    hit: new Audio('data:audio/wav;base64,UklGRlIEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YS4EAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaGjyR2+i5aiAEOHi36f2nUS8OEGu12PqtSy8PEmm22Py/dSUFOms24Py4eCMGN2k34fmwcSAEQWss3fi0byAER28q3/e6dCEFVGoE2/q4dCMGX3MT1/SvcyAEWGgH2P6/dyQGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEGaFgB1/u2dyEFZmcC2PywdSEGc1sH2PmwdyEG')
};

function init() {
    console.log('Starting 3D Sniper Game initialization...');
    
    try {
        // Create scene
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        console.log('Scene created');
        
        // Create camera (sniper scope perspective)
        camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 25, 0); // High up on tower
        camera.lookAt(0, 0, -50);
        console.log('Camera created');
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x87CEEB);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        console.log('Renderer created');
        
        document.getElementById('gameContainer').appendChild(renderer.domElement);
        console.log('Renderer added to DOM');
        
        // Create raycaster for mouse interaction
        raycaster = new THREE.Raycaster();
        
        // Create lighting
        createLighting();
        console.log('Lighting created');
        
        // Create environment
        createEnvironment();
        console.log('Environment created');
        
        // Hide loading screen
        loadingElement.style.display = 'none';
        console.log('Loading screen hidden');
        
        // Event listeners
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', shoot);
        restartBtn.addEventListener('click', restartGame);
        window.addEventListener('resize', onWindowResize);
        
        // Start game
        updateHUD();
        gameLoop();
        startTimer();
        
        // Spawn first target immediately for testing
        setTimeout(() => {
            createTarget();
        }, 1000);
        
        console.log('3D Sniper Game initialized successfully!');
        
    } catch (error) {
        console.error('Error initializing game:', error);
        loadingElement.innerHTML = 'Error loading 3D environment: ' + error.message;
    }
}

function createLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
}

function createEnvironment() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create buildings
    createBuildings();
    
    // Create sky
    const skyGeometry = new THREE.SphereGeometry(150, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x87CEEB, 
        side: THREE.BackSide 
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

function createBuildings() {
    const buildingPositions = [
        { x: -30, z: -40, width: 8, height: 20, depth: 6 },
        { x: -10, z: -60, width: 12, height: 25, depth: 8 },
        { x: 15, z: -45, width: 6, height: 18, depth: 10 },
        { x: 30, z: -70, width: 10, height: 30, depth: 7 },
        { x: -45, z: -80, width: 15, height: 22, depth: 12 },
        { x: 45, z: -55, width: 9, height: 28, depth: 9 },
        { x: 0, z: -90, width: 20, height: 35, depth: 15 }
    ];
    
    buildingPositions.forEach(pos => {
        const buildingGeometry = new THREE.BoxGeometry(pos.width, pos.height, pos.depth);
        const buildingMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0, 0, Math.random() * 0.2 + 0.3)
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.set(pos.x, pos.height / 2, pos.z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        buildings.push(building);
    });
}

function createTarget() {
    if (targets.length >= 3) return;
    
    const targetGroup = new THREE.Group();
    
    // Create bad guy body
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.2, 3, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.castShadow = true;
    targetGroup.add(body);
    
    // Create head
    const headGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xf4c2a1 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 3.5;
    head.castShadow = true;
    targetGroup.add(head);
    
    // Create weapon
    const weaponGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 6);
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(1.2, 2, 0);
    weapon.rotation.z = Math.PI / 2;
    weapon.castShadow = true;
    targetGroup.add(weapon);
    
    // Random position near buildings
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const offset = (Math.random() - 0.5) * 20;
    targetGroup.position.set(
        building.position.x + offset,
        0,
        building.position.z + Math.random() * 10 - 5
    );
    
    // Add movement animation
    targetGroup.userData = {
        originalX: targetGroup.position.x,
        moveDirection: Math.random() > 0.5 ? 1 : -1,
        moveSpeed: 0.02 + Math.random() * 0.02,
        spawnTime: Date.now(),
        health: 100
    };
    
    scene.add(targetGroup);
    targets.push(targetGroup);
}

function updateTargets() {
    const currentTime = Date.now();
    
    targets.forEach((target, index) => {
        // Move targets
        const userData = target.userData;
        target.position.x += userData.moveDirection * userData.moveSpeed;
        
        // Reverse direction if moved too far
        if (Math.abs(target.position.x - userData.originalX) > 8) {
            userData.moveDirection *= -1;
        }
        
        // Remove old targets
        if (currentTime - userData.spawnTime > 10000) { // 10 seconds
            scene.remove(target);
            targets.splice(index, 1);
        }
    });
    
    // Spawn new targets
    if (currentTime - lastTargetSpawn > targetSpawnRate && targets.length < 3) {
        createTarget();
        lastTargetSpawn = currentTime;
        
        // Increase difficulty
        if (targetSpawnRate > 1500) {
            targetSpawnRate -= 50;
        }
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update distance reading
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
        const distance = Math.round(camera.position.distanceTo(intersects[0].object.parent.position));
        distanceElement.textContent = distance;
    } else {
        distanceElement.textContent = '--';
    }
}

function shoot(event) {
    if (!gameActive || ammo <= 0) return;
    
    // Play sound
    try {
        sniperSounds.shot.currentTime = 0;
        sniperSounds.shot.volume = 0.3;
        sniperSounds.shot.play().catch(() => {});
    } catch (error) {}
    
    ammo--;
    updateHUD();
    
    // Raycast to check for hits
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
        hitTarget(intersects[0].object.parent);
    }
    
    // Add muzzle flash effect
    createMuzzleFlash();
    
    if (ammo <= 0 && targets.length === 0) {
        setTimeout(endGame, 1000);
    }
}

function hitTarget(targetGroup) {
    // Play hit sound
    try {
        sniperSounds.hit.currentTime = 0;
        sniperSounds.hit.volume = 0.4;
        sniperSounds.hit.play().catch(() => {});
    } catch (error) {}
    
    // Calculate points based on distance
    const distance = camera.position.distanceTo(targetGroup.position);
    const basePoints = 15;
    const distanceBonus = Math.floor(distance / 10) * 5;
    const totalPoints = basePoints + distanceBonus;
    
    score += totalPoints;
    targetsKilled++;
    updateHUD();
    
    // Show hit indicator
    showHitIndicator(targetGroup, totalPoints, distance);
    
    // Remove target
    const targetIndex = targets.indexOf(targetGroup);
    if (targetIndex > -1) {
        scene.remove(targetGroup);
        targets.splice(targetIndex, 1);
    }
    
    // Ammo bonus every 100 points
    if (score % 100 === 0) {
        ammo += 3;
        updateHUD();
    }
}

function showHitIndicator(targetGroup, points, distance) {
    const indicator = document.createElement('div');
    indicator.textContent = `+${points} (${Math.round(distance)}m)`;
    indicator.style.position = 'fixed';
    indicator.style.left = '50%';
    indicator.style.top = '40%';
    indicator.style.transform = 'translateX(-50%)';
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

function createMuzzleFlash() {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.background = 'rgba(255, 255, 0, 0.1)';
    flash.style.zIndex = '999';
    flash.style.pointerEvents = 'none';
    
    document.body.appendChild(flash);
    
    setTimeout(() => {
        if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
        }
    }, 50);
}

function updateHUD() {
    scoreElement.textContent = score;
    ammoElement.textContent = ammo;
    timeElement.textContent = timeLeft;
}

function startTimer() {
    const timer = setInterval(() => {
        timeLeft--;
        updateHUD();
        
        if (timeLeft <= 0 || !gameActive) {
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
}

function restartGame() {
    // Reset game state
    gameActive = true;
    score = 0;
    ammo = 5;
    timeLeft = 60;
    targetsKilled = 0;
    targetSpawnRate = 3000;
    lastTargetSpawn = 0;
    
    // Clear scene
    targets.forEach(target => scene.remove(target));
    targets = [];
    
    // Hide game over screen
    gameOverScreen.classList.add('hidden');
    
    // Update HUD
    updateHUD();
    
    // Restart game loops
    startTimer();
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    if (!gameActive) return;
    
    updateTargets();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
