// 3D Tower Sniper Game with WASD Movement and Zoom
let scene, camera, renderer, raycaster, clock;
let targets = [];
window.targets = targets;
let gameActive = true;
let score = 0;
let currentAmmo = 15;
let playerHealth = 100;
let magazines = 3;
let maxAmmoPerMag = 15;
let timeLeft = 60;
let targetsKilled = 0;
let gunGroup;
let isReloading = false;
let lastShotTime = 0;
let shotCooldown = 700; // 0.7 seconds between shots
let ammoBox;
let nearAmmoBox = false;

// Player controls
let keys = {};
let playerPosition = { x: 0, y: 29, z: 0 }; // Raised above platform surface
let cameraRotation = { x: 0, y: 0 };
let isZoomed = false;
let normalFOV = 45;
let zoomFOV = 15; // 3x magnification scope

// Mouse controls
let mouse = new THREE.Vector2();
let mouseX = 0, mouseY = 0;
let isPointerLocked = false;

// DOM elements
const scoreElement = document.getElementById('score');
const ammoElement = document.getElementById('ammo');
const magazinesElement = document.getElementById('magazines');
const timeElement = document.getElementById('timer');
const killsElement = document.getElementById('kills');
const healthElement = document.getElementById('health');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const targetsKilledElement = document.getElementById('targetsKilled');
const restartBtn = document.getElementById('restartBtn');
const loadingElement = document.getElementById('loading');

function init() {
    // Don't auto-initialize if menu hasn't been dismissed
    if (!window.gameStarted) {
        console.log('Waiting for menu to start game...');
        return;
    }
    console.log('Starting 3D Tower Sniper Game...');
    
    // Log current sensitivity setting
    const savedSensitivity = localStorage.getItem('mouseSensitivity');
    const sensitivity = savedSensitivity ? parseFloat(savedSensitivity) : 1.0;
    console.log(`Mouse sensitivity loaded: ${sensitivity}x`);
    
    // Create scene with dark military aesthetic
    scene = new THREE.Scene();
    window.scene = scene;
    scene.background = new THREE.Color(0x2d3561); // Lighter navy
    scene.fog = new THREE.Fog(0x2a3a5e, 30, 150); // Lighter blue fog
    
    // Create camera
    camera = new THREE.PerspectiveCamera(normalFOV, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    window.camera = camera;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87CEEB);
    
    document.getElementById('gameContainer').appendChild(renderer.domElement);
    
    // Raycaster for mouse picking
    raycaster = new THREE.Raycaster();
    clock = new THREE.Clock();
    
    // Create environment
    createEnvironment();
    createTower();
    createGun();
    
    // Hide loading
    loadingElement.style.display = 'none';
    
    // Hide scope crosshair initially, show hip crosshair
    document.getElementById('crosshair').style.display = 'none';
    const hipCrosshair = document.getElementById('hipCrosshair');
    hipCrosshair.style.display = 'block';
    hipCrosshair.style.opacity = '1'; // Make visible for hip fire
    
    // Setup controls
    setupControls();
    
    // Start game
    updateHUD();
    animate();
    startTimer();
    
    console.log('Game fully initialized and started!');
    
    // Spawn initial enemy squad - wait for AI to load
    setTimeout(() => {
        if (window.AI && window.AI.spawnFormation) {
            window.AI.spawnFormation();
        } else {
            console.log('AI not loaded yet, will spawn automatically');
        }
    }, 3000);
    
    console.log('3D Tower Game initialized successfully!');
}

function createEnvironment() {
    // Ground plane with military colors
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d4a22 }); // Dark military green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Buildings removed - now pure forest environment
    
    // Brighter military lighting
    const ambientLight = new THREE.AmbientLight(0x404080, 0.8); // Brighter blue ambient
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffa500, 0.9); // Brighter orange sunset light
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);
    
    // Add rim lighting for dramatic effect
    const rimLight = new THREE.DirectionalLight(0x0066ff, 0.6); // Brighter blue rim light
    rimLight.position.set(-50, 30, -50);
    scene.add(rimLight);
}

function createGun() {
    gunGroup = new THREE.Group();
    
    // Skip 3D model loading - no gun model will be displayed
    console.log('🎯 3D sniper rifle model removed - using minimal gun setup');
    
    // Create a simple scope for zoom functionality only
    const scopeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const scopeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0.3, 0.1, 0);
    scope.visible = false;
    gunGroup.scope = scope;
    gunGroup.add(scope);
    
    // Position gun group (empty but needed for scope functionality)
    gunGroup.position.set(0.4, -0.4, -0.6);
    gunGroup.rotation.y = 0.2;
    gunGroup.rotation.x = 0.1;
    gunGroup.rotation.z = -0.05;
    gunGroup.scale.set(1.5, 1.5, 1.5);
    
    camera.add(gunGroup);
    scene.add(camera);
    
    console.log('🔫 Gun setup complete (no 3D model)');
}

// Fallback function for basic gun geometry
function createBasicGun() {
    console.log('🔧 Using fallback basic gun geometry');
    
    // Clear any existing content
    while(gunGroup.children.length > 0) {
        gunGroup.remove(gunGroup.children[0]);
    }
    
    // Sniper rifle barrel (positioned to be visible)
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.06, 2.5, 8);
    const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(1.0, 0, 0);
    gunGroup.add(barrel);
    
    // Gun body (receiver)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.25, 0.1);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x34495e });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0, 0);
    gunGroup.add(body);
    
    // Stock (wooden) - made smaller and repositioned
    const stockGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
    const stockMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(-0.8, -0.1, 0);
    gunGroup.add(stock);
    
    // Scope for zoom functionality
    const scopeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const scopeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0.3, 0.1, 0);
    scope.visible = false;
    gunGroup.scope = scope;
    gunGroup.add(scope);
}

function createTower() {
    // Natural grass terrain
    const floorGeometry = new THREE.PlaneGeometry(300, 300);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x4a7c59 }); // Brighter forest green
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Simple tower structure
    const towerGeometry = new THREE.CylinderGeometry(6, 8, 30, 8);
    const towerMaterial = new THREE.MeshLambertMaterial({ color: 0x8B7355 }); // Stone brown
    const tower = new THREE.Mesh(towerGeometry, towerMaterial);
    tower.position.set(0, 10, 0);
    tower.castShadow = true;
    scene.add(tower);
    
    // Platform on top
    const platformGeometry = new THREE.CylinderGeometry(10, 10, 2, 8);
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 }); // Stone gray
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 26, 0);
    platform.receiveShadow = true;
    scene.add(platform);
    
    // Add simple railing around platform
    const railingGeometry = new THREE.TorusGeometry(9.2, 0.1, 8, 16);
    const railingMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
    const railing = new THREE.Mesh(railingGeometry, railingMaterial);
    railing.position.set(0, 28.2, 0);
    railing.rotation.x = Math.PI / 2;
    railing.castShadow = true;
    scene.add(railing);
    
    // Add some scattered rocks around base
    for (let i = 0; i < 15; i++) {
        const smallRockGeometry = new THREE.SphereGeometry(
            0.5 + Math.random() * 2, 
            6 + Math.floor(Math.random() * 4), 
            4 + Math.floor(Math.random() * 4)
        );
        const smallRockMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(0, 0, 0.2 + Math.random() * 0.3) 
        });
        const smallRock = new THREE.Mesh(smallRockGeometry, smallRockMaterial);
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 40;
        smallRock.position.set(
            Math.cos(angle) * distance,
            -5 + Math.random() * 2,
            Math.sin(angle) * distance
        );
        smallRock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        scene.add(smallRock);
    }
    
    // Create forest trees around the perimeter
    for (let i = 0; i < 25; i++) {
        createTree(
            (Math.random() - 0.5) * 280, // X position
            -5, // Y position (ground level)
            (Math.random() - 0.5) * 280  // Z position
        );
    }
    
    // Ammo crate on platform
    const ammoBoxGeometry = new THREE.BoxGeometry(1, 0.8, 0.8);
    const ammoBoxMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Wood color
    ammoBox = new THREE.Mesh(ammoBoxGeometry, ammoBoxMaterial);
    ammoBox.position.set(-6, 27.4, -2); // On platform surface
    ammoBox.castShadow = true;
    scene.add(ammoBox);
    
    // Ammo box label - removed the floating yellow roof
}

// Create individual trees for forest environment
function createTree(x, y, z) {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 8 + Math.random() * 4, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3429 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y + 4, z);
    trunk.castShadow = true;
    scene.add(trunk);
    
    // Tree canopy
    const canopyGeometry = new THREE.SphereGeometry(3 + Math.random() * 2, 8, 6);
    const canopyMaterial = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(0.3, 0.6, 0.2 + Math.random() * 0.2) // Various green shades
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(x, y + 9 + Math.random() * 2, z);
    canopy.castShadow = true;
    scene.add(canopy);
}

// AI functions now handled by ai.js

function createTarget(angle = null, distance = null) {
    if (targets.length >= 8) return;
    
    const targetGroup = new THREE.Group();
    
    // Body (larger hitbox)
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.0, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 }); // Green for visibility
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    targetGroup.add(body);
    
    // Head (larger hitbox)
    const headGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xf4c2a1 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.8;
    head.castShadow = true;
    targetGroup.add(head);
    
    // Weapon
    const weaponGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.2);
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(1.0, 1.5, 0);
    targetGroup.add(weapon);
    
    // Add invisible larger hitbox for easier targeting
    const hitboxGeometry = new THREE.BoxGeometry(2, 3, 1);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.0,
        visible: false
    });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.y = 1.5;
    targetGroup.add(hitbox);
    
    // Use provided angle/distance or generate random
    if (angle === null) angle = Math.random() * Math.PI * 2;
    if (distance === null) distance = 40 + Math.random() * 30;
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    targetGroup.position.set(x, 0, z);
    
    // Add AI behavior data
    targetGroup.userData = {
        originalX: x,
        originalZ: z,
        moveSpeed: 0.12 + Math.random() * 0.08, // Much faster, smoother movement
        spawnTime: Date.now(),
        state: 'hunting', // hunting, advancing, taking_cover, shooting, flanking, rushing
        alertTimer: 0,
        lastPlayerCheck: 0,
        shootCooldown: 0,
        lastPathUpdate: 0,
        targetX: x,
        targetZ: z,
        coverPoint: null,
        lastShotAt: 0,
        aggressionLevel: Math.random(), // 0-1, higher = more aggressive
        health: 100,
        detectionRadius: 60,
        attackRange: 35, // Increased attack range
        beenShotAt: false, // Track if this enemy has been shot at
        coverRadius: 15
    };
    
    scene.add(targetGroup);
    targets.push(targetGroup);
    
    console.log('*** TARGET SUCCESSFULLY CREATED AT:', x, z, 'Total targets now:', targets.length);
}

// ...
// Enemy bullet system moved to ai.js

function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        // Zoom with Shift key
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            if (!isZoomed) {
                // Start zooming like right mouse button
                isZoomed = true;
                
                // Hide hip crosshair and show scope crosshair
                const crosshair = document.getElementById('crosshair');
                const hipCrosshair = document.getElementById('hipCrosshair');
                crosshair.style.display = 'block';
                hipCrosshair.style.display = 'none';
                document.getElementById('scopeAmmo').style.display = 'block';
                
                // Zoom in animation
                const startFOV = camera.fov;
                const targetFOV = zoomFOV;
                const zoomDuration = 300;
                const startTime = Date.now();
                
                function animateZoom() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / zoomDuration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    
                    camera.fov = startFOV + (targetFOV - startFOV) * easeProgress;
                    camera.updateProjectionMatrix();
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateZoom);
                    }
                }
                
                animateZoom();
                console.log('Aiming with Shift - release to stop');
            }
        }
        
        // Reload with R key
        if (event.code === 'KeyR' && !isReloading && currentAmmo < maxAmmoPerMag && magazines > 0) {
            reload();
        }
        
        // Interact with ammo box
        if (event.code === 'KeyE' && nearAmmoBox && magazines < 3) {
            refillAmmo();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
        
        // Stop zooming when Shift is released
        if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') && isZoomed) {
            isZoomed = false;
            
            // Hide scope and ammo display
            const crosshair = document.getElementById('crosshair');
            const hipCrosshair = document.getElementById('hipCrosshair');
            crosshair.style.display = 'none';
            hipCrosshair.style.display = 'block';
            document.getElementById('scopeAmmo').style.display = 'none';
            
            // Zoom out animation
            const startFOV = camera.fov;
            const targetFOV = normalFOV;
            const zoomDuration = 200;
            const startTime = Date.now();
            
            function animateZoomOut() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / zoomDuration, 1);
                const easeProgress = Math.pow(progress, 2);
                
                camera.fov = startFOV + (targetFOV - startFOV) * easeProgress;
                camera.updateProjectionMatrix();
                
                if (progress < 1) {
                    requestAnimationFrame(animateZoomOut);
                }
            }
            
            animateZoomOut();
            console.log('Stopped aiming');
        }
    });
    
    // Mouse controls
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onClick);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    
    // Auto-enable pointer lock on first click
    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });
    
    // Handle pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
            isPointerLocked = true;
            console.log('Pointer locked - you can now aim!');
        } else {
            isPointerLocked = false;
            console.log('Pointer unlocked');
        }
    });
    
    // Prevent context menu
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Restart button
    restartBtn.addEventListener('click', restartGame);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function handleMovement() {
    const moveSpeed = 0.3;
    
    // Load mouse sensitivity from localStorage (default 1.0)
    const savedSensitivity = localStorage.getItem('mouseSensitivity');
    const sensitivityMultiplier = savedSensitivity ? parseFloat(savedSensitivity) : 1.0;
    const baseSensitivity = 0.0015; // Base sensitivity we set earlier
    const rotationSpeed = baseSensitivity * sensitivityMultiplier;
    
    // WASD movement on tower platform
    if (keys['KeyW']) {
        playerPosition.z -= Math.cos(cameraRotation.y) * moveSpeed;
        playerPosition.x -= Math.sin(cameraRotation.y) * moveSpeed;
    }
    if (keys['KeyS']) {
        playerPosition.z += Math.cos(cameraRotation.y) * moveSpeed;
        playerPosition.x += Math.sin(cameraRotation.y) * moveSpeed;
    }
    if (keys['KeyA']) {
        playerPosition.x -= Math.cos(cameraRotation.y) * moveSpeed;
        playerPosition.z += Math.sin(cameraRotation.y) * moveSpeed;
    }
    if (keys['KeyD']) {
        playerPosition.x += Math.cos(cameraRotation.y) * moveSpeed;
        playerPosition.z -= Math.sin(cameraRotation.y) * moveSpeed;
    }
    
    // Keep player on tower platform
    const platformRadius = 9; // Match new platform size
    const distanceFromCenter = Math.sqrt(playerPosition.x * playerPosition.x + playerPosition.z * playerPosition.z);
    if (distanceFromCenter > platformRadius) {
        const angle = Math.atan2(playerPosition.z, playerPosition.x);
        playerPosition.x = Math.cos(angle) * platformRadius;
        playerPosition.z = Math.sin(angle) * platformRadius;
    }
    
    // Update camera position
    camera.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    
    // Mouse look
    cameraRotation.y -= mouseX * rotationSpeed;
    cameraRotation.x -= mouseY * rotationSpeed;
    cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation.x));
    
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraRotation.y;
    camera.rotation.x = cameraRotation.x;
    
    mouseX *= 0.9;
    mouseY *= 0.9;
}

function onMouseMove(event) {
    if (isPointerLocked) {
        mouseX += event.movementX || 0;
        mouseY += event.movementY || 0;
    }
    
    // Always update mouse position for UI
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
    if (event.button === 0) { // Left click - shoot
        // Always shoot at screen center for accuracy
        shoot(window.innerWidth / 2, window.innerHeight / 2);
    }
}

function onMouseDown(event) {
    if (event.button === 2) { // Right mouse button - start aiming
        event.preventDefault();
        if (!isZoomed) { // Only zoom if not already zoomed
            isZoomed = true;
            
            // Hide hip crosshair and show scope crosshair immediately
            const crosshair = document.getElementById('crosshair');
            const hipCrosshair = document.getElementById('hipCrosshair');
            crosshair.style.display = 'block';
            hipCrosshair.style.display = 'none';
            document.getElementById('scopeAmmo').style.display = 'block';
            
            // Smooth zoom transition
            const startFOV = camera.fov;
            const targetFOV = zoomFOV;
            const zoomDuration = 300; // ms
            const startTime = Date.now();
            
            function animateZoom() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / zoomDuration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                
                camera.fov = startFOV + (targetFOV - startFOV) * easeProgress;
                camera.updateProjectionMatrix();
                
                if (progress < 1) {
                    requestAnimationFrame(animateZoom);
                }
            }
            
            animateZoom();
            console.log('Aiming with right-click - release to stop');
        }
    }
}

function onMouseUp(event) {
    if (event.button === 2) { // Right mouse button - stop aiming
        event.preventDefault();
        isZoomed = false;

        // Hide scope and ammo display immediately
        const crosshair = document.getElementById('crosshair');
        const hipCrosshair = document.getElementById('hipCrosshair');
        crosshair.style.display = 'none';
        hipCrosshair.style.display = 'block';
        document.getElementById('scopeAmmo').style.display = 'none';

        if (gunGroup && gunGroup.scope) {
            gunGroup.scope.visible = false;
        }

        // Smooth zoom out transition
        const startFOV = camera.fov;
        const targetFOV = normalFOV;
        const zoomDuration = 200; // Faster zoom out
        const startTime = Date.now();

        function animateZoomOut() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / zoomDuration, 1);
            const easeProgress = Math.pow(progress, 2); // Ease in quadratic

            camera.fov = startFOV + (targetFOV - startFOV) * easeProgress;
            camera.updateProjectionMatrix();

            if (progress < 1) {
                requestAnimationFrame(animateZoomOut);
            } else {
                // Remove scope overlay and show hip crosshair
                removeScopeOverlay();
                hipCrosshair.style.display = 'block';
                hipCrosshair.style.opacity = '1';
                
                // Show gun model again
                if (gunGroup) {
                    gunGroup.visible = true;
                }
            }
        }
        
        animateZoomOut();
        console.log('Stopped aiming');
    }
}

function createScopeOverlay() {
    // Create advanced scope overlay with cool effects
    const scopeOverlay = document.createElement('div');
    scopeOverlay.id = 'scopeOverlay';
    scopeOverlay.style.position = 'fixed';
    scopeOverlay.style.top = '0';
    scopeOverlay.style.left = '0';
    scopeOverlay.style.width = '100%';
    scopeOverlay.style.height = '100%';
    scopeOverlay.style.zIndex = '1000';
    scopeOverlay.style.pointerEvents = 'none';
    
    // Create scope mask with gradient and border
    const scopeMask = document.createElement('div');
    scopeMask.style.position = 'absolute';
    scopeMask.style.top = '0';
    scopeMask.style.left = '0';
    scopeMask.style.width = '100%';
    scopeMask.style.height = '100%';
    scopeMask.style.background = `
        radial-gradient(circle 200px at center, 
            transparent 195px, 
            rgba(50, 50, 50, 0.3) 196px,
            rgba(0, 0, 0, 0.9) 200px,
            rgba(0, 0, 0, 0.95) 100%)
    `;
    
    // Add scope ring
    const scopeRing = document.createElement('div');
    scopeRing.style.position = 'absolute';
    scopeRing.style.top = '50%';
    scopeRing.style.left = '50%';
    scopeRing.style.width = '400px';
    scopeRing.style.height = '400px';
    scopeRing.style.borderRadius = '50%';
    scopeRing.style.border = '3px solid rgba(255, 255, 255, 0.3)';
    scopeRing.style.transform = 'translate(-50%, -50%)';
    scopeRing.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 255, 0.1)';
    
    // Enhanced crosshairs with multiple lines
    const createCrosshair = (width, height, length, opacity = 0.8) => {
        const crosshair = document.createElement('div');
        crosshair.style.position = 'absolute';
        crosshair.style.top = '50%';
        crosshair.style.left = '50%';
        crosshair.style.width = width;
        crosshair.style.height = height;
        crosshair.style.backgroundColor = '#00ff00';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.opacity = opacity;
        crosshair.style.boxShadow = '0 0 3px #00ff00';
        crosshair.style.zIndex = '1001';
        return crosshair;
    };
    
    // Main crosshairs
    const crosshairV = createCrosshair('2px', '100px');
    const crosshairH = createCrosshair('100px', '2px');
    
    // Secondary tick marks
    const tickV1 = createCrosshair('1px', '20px', 0.6);
    tickV1.style.top = 'calc(50% - 60px)';
    const tickV2 = createCrosshair('1px', '20px', 0.6);
    tickV2.style.top = 'calc(50% + 60px)';
    const tickH1 = createCrosshair('20px', '1px', 0.6);
    tickH1.style.left = 'calc(50% - 60px)';
    const tickH2 = createCrosshair('20px', '1px', 0.6);
    tickH2.style.left = 'calc(50% + 60px)';
    
    // Center dot with glow
    const centerDot = document.createElement('div');
    centerDot.style.position = 'absolute';
    centerDot.style.top = '50%';
    centerDot.style.left = '50%';
    centerDot.style.width = '4px';
    centerDot.style.height = '4px';
    centerDot.style.backgroundColor = '#00ff00';
    centerDot.style.borderRadius = '50%';
    centerDot.style.transform = 'translate(-50%, -50%)';
    centerDot.style.boxShadow = '0 0 8px #00ff00, 0 0 16px #00ff00';
    centerDot.style.zIndex = '1001';
    
    // Range finder marks
    const createRangeMark = (distance, size) => {
        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        mark.style.top = '50%';
        mark.style.left = '50%';
        mark.style.width = size;
        mark.style.height = '1px';
        mark.style.backgroundColor = 'rgba(0, 255, 0, 0.4)';
        mark.style.transform = `translate(-50%, ${distance}px)`;
        mark.style.zIndex = '1001';
        return mark;
    };
    
    const range1 = createRangeMark(-30, '20px');
    const range2 = createRangeMark(-15, '15px');
    const range3 = createRangeMark(15, '15px');
    const range4 = createRangeMark(30, '20px');
    
    // Assemble scope
    scopeOverlay.appendChild(scopeMask);
    scopeOverlay.appendChild(scopeRing);
    scopeOverlay.appendChild(crosshairV);
    scopeOverlay.appendChild(crosshairH);
    scopeOverlay.appendChild(tickV1);
    scopeOverlay.appendChild(tickV2);
    scopeOverlay.appendChild(tickH1);
    scopeOverlay.appendChild(tickH2);
    scopeOverlay.appendChild(centerDot);
    scopeOverlay.appendChild(range1);
    scopeOverlay.appendChild(range2);
    scopeOverlay.appendChild(range3);
    scopeOverlay.appendChild(range4);
    
    document.body.appendChild(scopeOverlay);
}

function removeScopeOverlay() {
    const scopeOverlay = document.getElementById('scopeOverlay');
    if (scopeOverlay) {
        document.body.removeChild(scopeOverlay);
    }
}

function createBullet(startPos, direction, distance = 200) {
    // Create larger, more visible bullet geometry
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.9
    });
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(startPos);
    scene.add(bullet);
    
    // Enhanced glowing effect with multiple layers
    const innerGlowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.5
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.position.copy(startPos);
    scene.add(innerGlow);
    
    const outerGlowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffa500,
        transparent: true,
        opacity: 0.2
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.copy(startPos);
    scene.add(outerGlow);
    
    // Bullet speed for realistic travel time
    const bulletSpeed = 6; // Fast enough to see but with delay
    let currentDistance = 0;
    const trailPoints = [startPos.clone()];
    
    // Create dynamic trail that follows bullet
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffcc00,
        transparent: true,
        opacity: 0.8,
        linewidth: 3
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);
    
    // Raycaster for collision detection
    const bulletRaycaster = new THREE.Raycaster();
    
    function animateBullet() {
        if (currentDistance >= distance) {
            scene.remove(bullet);
            scene.remove(innerGlow);
            scene.remove(outerGlow);
            scene.remove(trail);
            return;
        }
        
        const moveVector = direction.clone().multiplyScalar(bulletSpeed);
        
        // Check for collisions before moving
        bulletRaycaster.set(bullet.position, direction);
        const intersects = bulletRaycaster.intersectObjects(scene.children, true);
        
        // Check for enemy hits first
        const enemyHits = intersects.filter(intersect => {
            if (intersect.object === bullet || intersect.object === innerGlow || 
                intersect.object === outerGlow || intersect.object === trail) {
                return false;
            }
            
            let parentCheck = intersect.object;
            while (parentCheck) {
                if (targets.includes(parentCheck)) {
                    intersect.targetGroup = parentCheck; // Store the target group
                    return true; // This is an enemy hit
                }
                parentCheck = parentCheck.parent;
            }
            return false;
        });
        
        // Handle enemy hits
        if (enemyHits.length > 0 && enemyHits[0].distance < bulletSpeed) {
            const hitData = enemyHits[0];
            const hitObject = hitData.object;
            const targetGroup = hitData.targetGroup;
            
            let points;
            if (hitObject.userData && hitObject.userData.isHead) {
                points = 30;
                showHitIndicator('HEADSHOT! +' + points);
            } else {
                points = 15;
                showHitIndicator('+' + points);
            }
            
            score += points;
            targetsKilled++;
            
            // Create impact effect at hit point
            createImpactBurst(hitData.point);
            
            // Remove enemy
            scene.remove(targetGroup);
            const index = targets.indexOf(targetGroup);
            if (index > -1) {
                targets.splice(index, 1);
            }
            
            // Alert AI
            if (window.AI && window.AI.checkEnemyShotDetection) {
                window.AI.checkEnemyShotDetection(targetGroup);
            }
            
            updateHUD();
            
            // Remove bullet
            scene.remove(bullet);
            scene.remove(innerGlow);
            scene.remove(outerGlow);
            scene.remove(trail);
            return;
        }
        
        // Filter environment collision (non-enemies)
        const validIntersects = intersects.filter(intersect => {
            // Exclude bullet and its effects
            if (intersect.object === bullet || intersect.object === innerGlow || 
                intersect.object === outerGlow || intersect.object === trail) {
                return false;
            }
            
            // Exclude enemies (handled above)
            let parentCheck = intersect.object;
            while (parentCheck) {
                if (targets.includes(parentCheck)) {
                    return false;
                }
                parentCheck = parentCheck.parent;
            }
            
            return true;
        });
        
        if (validIntersects.length > 0 && validIntersects[0].distance < bulletSpeed) {
            // Hit something (not a target) - create impact effect
            const impactPoint = validIntersects[0].point;
            createImpactBurst(impactPoint);
            
            // Remove bullet
            scene.remove(bullet);
            scene.remove(innerGlow);
            scene.remove(outerGlow);
            scene.remove(trail);
            return;
        }
        
        // Move bullet and glows
        bullet.position.add(moveVector);
        innerGlow.position.add(moveVector);
        outerGlow.position.add(moveVector);
        
        // Update trail to follow bullet
        trailPoints.push(bullet.position.clone());
        if (trailPoints.length > 10) {
            trailPoints.shift(); // Keep only last 10 points
        }
        
        trailGeometry.setFromPoints(trailPoints);
        trailGeometry.attributes.position.needsUpdate = true;
        
        currentDistance += bulletSpeed;
        
        requestAnimationFrame(animateBullet);
    }
    
    animateBullet();
}

function createImpactBurst(position) {
    // Create spark particles
    for (let i = 0; i < 8; i++) {
        const sparkGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const sparkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffa500
        });
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.copy(position);
        
        const sparkDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 2
        ).normalize();
        
        scene.add(spark);
        
        // Animate sparks
        let sparkLife = 0;
        const maxSparkLife = 30;
        
        function animateSpark() {
            if (sparkLife > maxSparkLife) {
                scene.remove(spark);
                return;
            }
            
            spark.position.add(sparkDirection.clone().multiplyScalar(0.3));
            spark.material.opacity = 1 - (sparkLife / maxSparkLife);
            sparkLife++;
            
            requestAnimationFrame(animateSpark);
        }
        
        animateSpark();
    }
    
    // Create main burst flash
    const burstGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const burstMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
    });
    const burst = new THREE.Mesh(burstGeometry, burstMaterial);
    burst.position.copy(position);
    scene.add(burst);
    
    // Animate burst
    let burstScale = 0.1;
    function animateBurst() {
        if (burstScale > 2) {
            scene.remove(burst);
            return;
        }
        
        burstScale += 0.1;
        burst.scale.set(burstScale, burstScale, burstScale);
        burst.material.opacity = 0.8 - (burstScale / 2.5);
        
        requestAnimationFrame(animateBurst);
    }
    
    animateBurst();
}

function shoot(mouseX, mouseY, isAiming = false) {
    const currentTime = Date.now();
    
    // Check cooldown and game state
    if (currentTime - lastShotTime < shotCooldown) return;
    if (!gameActive || currentAmmo <= 0 || isReloading) return;
        
    lastShotTime = currentTime;
    currentAmmo--;
        
    // Quick visual feedback first (non-blocking)
    if (gunGroup) {
        gunGroup.position.z = -0.7;
        setTimeout(() => {
            gunGroup.position.z = -0.6;
        }, 100);
    }
    updateHUD();
        
    // Perform shooting calculations immediately for responsiveness
    performShootCalculations(mouseX, mouseY, isAiming);
}

function performShootCalculations(mouseX, mouseY, isAiming) {
    // Apply accuracy based on aim mode
    let aimOffset = new THREE.Vector2(0, 0);
    if (!isZoomed) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 0.2;
        aimOffset.x = Math.cos(angle) * distance;
        aimOffset.y = Math.sin(angle) * distance;
    } else {
        const spreadReduction = 0.02;
        aimOffset.x = (Math.random() - 0.5) * spreadReduction;
        aimOffset.y = (Math.random() - 0.5) * spreadReduction;
    }
        
    // Create raycaster for shooting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
        
    mouse.x = ((mouseX + aimOffset.x) / window.innerWidth) * 2 - 1;
    mouse.y = -((mouseY + aimOffset.y) / window.innerHeight) * 2 + 1;
        
    raycaster.setFromCamera(mouse, camera);
        
    // Create bullet visual from camera center (where crosshair points)
    const bulletStart = camera.position.clone();
    let bulletDirection = raycaster.ray.direction.clone();
    
    // Move bullet start slightly forward from camera to avoid clipping
    // Add spread for hip fire
    if (!isZoomed) {
        const spreadAngle = 0.1;
        const randomAngleX = (Math.random() - 0.5) * spreadAngle;
        const randomAngleY = (Math.random() - 0.5) * spreadAngle;
            
        const spreadMatrix = new THREE.Matrix4();
        spreadMatrix.makeRotationFromEuler(new THREE.Euler(randomAngleX, randomAngleY, 0));
        bulletDirection = bulletDirection.applyMatrix4(spreadMatrix);
    }
        
    createBullet(bulletStart, bulletDirection, 200);
    checkBulletNearMiss(bulletStart, bulletDirection);
        
    // NO INSTANT HIT DETECTION - bullets must travel to hit enemies
    // Only alert AI that a shot was fired (for missed shots)
    if (window.AI && window.AI.checkEnemyShotDetection) {
        window.AI.checkEnemyShotDetection(null); // null = missed shot
    }
}

function hitTargetGroup(targetGroup) {
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
    
    // No ammo bonus anymore - must use ammo box
}

function reload() {
    if (isReloading || currentAmmo >= maxAmmoPerMag || magazines <= 0) return;
    
    isReloading = true;
    magazines--;
    console.log('Reloading... Magazines left:', magazines);
    
    // Animate gun reloading
    if (gunGroup) {
        gunGroup.position.y = -0.5;
        gunGroup.rotation.x = -0.3;
    }
    
    // Show reload indicator
    const reloadIndicator = document.createElement('div');
    reloadIndicator.textContent = 'RELOADING...';
    reloadIndicator.style.position = 'fixed';
    reloadIndicator.style.left = '50%';
    reloadIndicator.style.top = '50%';
    reloadIndicator.style.transform = 'translate(-50%, -50%)';
    reloadIndicator.style.color = '#ff9900';
    reloadIndicator.style.fontWeight = 'bold';
    reloadIndicator.style.fontSize = '24px';
    reloadIndicator.style.zIndex = '1001';
    reloadIndicator.style.pointerEvents = 'none';
    document.body.appendChild(reloadIndicator);
    
    // Reload after 2.5 seconds
    setTimeout(() => {
        currentAmmo = maxAmmoPerMag;
        isReloading = false;
        
        // Reset gun position
        if (gunGroup) {
            gunGroup.position.set(0.4, -0.4, -0.6); // Reset to new position
            gunGroup.rotation.set(0.1, 0.2, -0.05); // Reset to new rotation
            gunGroup.scale.set(1.5, 1.5, 1.5); // Reset scale
        }
        
        updateHUD();
        document.body.removeChild(reloadIndicator);
        console.log('Reload complete!');
    }, 2500);
}

function refillAmmo() {
    const ammoToAdd = Math.min(2, 3 - magazines);
    magazines += ammoToAdd;
    
    // Show pickup indicator
    const pickupIndicator = document.createElement('div');
    pickupIndicator.textContent = `+${ammoToAdd} MAGAZINES`;
    pickupIndicator.style.position = 'fixed';
    pickupIndicator.style.left = '50%';
    pickupIndicator.style.top = '40%';
    pickupIndicator.style.transform = 'translate(-50%, -50%)';
    pickupIndicator.style.color = '#00ff00';
    pickupIndicator.style.fontWeight = 'bold';
    pickupIndicator.style.fontSize = '20px';
    pickupIndicator.style.zIndex = '1001';
    pickupIndicator.style.pointerEvents = 'none';
    document.body.appendChild(pickupIndicator);
    
    setTimeout(() => {
        document.body.removeChild(pickupIndicator);
    }, 2000);
    
    updateHUD();
    console.log('Picked up', ammoToAdd, 'magazines. Total:', magazines);
}

function showHitIndicator(text) {
    const indicator = document.createElement('div');
    indicator.textContent = text;
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
    indicator.style.textShadow = '0 0 10px #00ff00';
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 1500);
}

// Check for bullet near misses that alert AI formations (optimized)
function checkBulletNearMiss(bulletStart, bulletDirection) {
    if (!window.targets || window.targets.length === 0) return;
    
    // Use setTimeout to defer heavy calculation and avoid blocking main thread
    setTimeout(() => {
        const bulletVector = bulletDirection.clone().multiplyScalar(200);
        
        for (let i = 0; i < window.targets.length; i++) {
            const enemy = window.targets[i];
            if (!enemy.userData) continue;
            
            // Simple distance check first (faster)
            const enemyPos = enemy.position;
            const startToEnemy = enemyPos.clone().sub(bulletStart);
            
            // Quick distance approximation
            if (startToEnemy.lengthSq() > 10000) continue; // Skip if >100m away
            
            // Only do expensive calculation if enemy is nearby
            const projection = Math.max(0, Math.min(1, 
                startToEnemy.dot(bulletVector) / bulletVector.lengthSq()
            ));
            
            const closestPoint = bulletStart.clone().add(bulletVector.clone().multiplyScalar(projection));
            const distance = enemyPos.distanceTo(closestPoint);
            
            if (distance <= 8) {
                const ai = enemy.userData;
                
                // Alert formation efficiently
                if (window.AI && window.AI.alertFormation) {
                    window.AI.alertFormation(ai.formationId, "bullet near miss");
                    
                    const formation = window.AI.formations.find(f => f.id === ai.formationId);
                    if (formation) {
                        formation.members.forEach(member => {
                            if (member.userData && !member.userData.isCharging) {
                                member.userData.isCharging = true;
                                member.userData.chargingSpeed = 0.12;
                                member.userData.lastPlayerSeen = Date.now();
                            }
                        });
                    }
                }
                break; // Only alert one formation per shot
            }
        }
    }, 0);
}

function updateHUD() {
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('ammoValue').textContent = currentAmmo;
    document.getElementById('timeValue').textContent = timeLeft;
    
    // Update magazines display
    document.getElementById('magazinesValue').textContent = magazines;
    document.getElementById('killsValue').textContent = score; // Assuming kills = score
    
    // Update scope ammo display
    const scopeAmmoElement = document.getElementById('scopeAmmoValue');
    if (scopeAmmoElement) {
        scopeAmmoElement.textContent = currentAmmo;
    }
    
    // Update health bar
    const healthValue = window.playerHealth !== undefined ? window.playerHealth : 100;
    const healthBar = document.getElementById('healthBar');
    const healthText = document.getElementById('healthValue');
    
    if (healthBar && healthText) {
        const healthPercent = Math.max(0, Math.min(100, healthValue));
        healthBar.style.width = healthPercent + '%';
        healthText.textContent = Math.round(healthPercent);
        
        // Change health bar color based on health level
        if (healthPercent > 75) {
            healthBar.style.background = 'linear-gradient(90deg, #4a9a4a, #5cb85c)';
            healthBar.style.boxShadow = 'none';
        } else if (healthPercent > 50) {
            healthBar.style.background = 'linear-gradient(90deg, #d4a84a, #f0ad4e)';
            healthBar.style.boxShadow = 'none';
        } else if (healthPercent > 25) {
            healthBar.style.background = 'linear-gradient(90deg, #d2691e, #ff8c00)';
            healthBar.style.boxShadow = 'none';
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #c9302c, #d9534f)';
            healthBar.style.boxShadow = 'none';
        }
    }
    
    // Check if near ammo box
    if (ammoBox) {
        const distance = camera.position.distanceTo(ammoBox.position);
        nearAmmoBox = distance < 3;
        
        if (nearAmmoBox && magazines < 3) {
            // Show interaction prompt
            if (!document.getElementById('interactPrompt')) {
                const prompt = document.createElement('div');
                prompt.id = 'interactPrompt';
                prompt.textContent = 'Press E to pick up ammo';
                prompt.style.position = 'fixed';
                prompt.style.left = '50%';
                prompt.style.bottom = '20%';
                prompt.style.transform = 'translateX(-50%)';
                prompt.style.color = '#ffff00';
                prompt.style.fontWeight = 'bold';
                prompt.style.fontSize = '18px';
                prompt.style.zIndex = '1001';
                prompt.style.pointerEvents = 'none';
                document.body.appendChild(prompt);
            }
        } else {
            // Remove interaction prompt
            const prompt = document.getElementById('interactPrompt');
            if (prompt) {
                document.body.removeChild(prompt);
            }
        }
    }
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
    }, 1000); // Keep game timer at 1 second
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
    currentAmmo = maxAmmoPerMag;
    magazines = 3;
    timeLeft = 60;
    targetsKilled = 0;
    isZoomed = false;
    isReloading = false;
    nearAmmoBox = false;
    
    // Reset camera and UI
    camera.fov = normalFOV;
    camera.updateProjectionMatrix();
    document.getElementById('crosshair').style.display = 'none';
    const hipCrosshair = document.getElementById('hipCrosshair');
    hipCrosshair.style.display = 'block';
    hipCrosshair.style.opacity = '1'; // Make visible
    if (gunGroup && gunGroup.scope) {
        gunGroup.scope.visible = false;
    }
    
    // Reset cooldown
    lastShotTime = 0;
    
    // Clear targets
    targets.forEach(target => scene.remove(target));
    targets = [];
    
    gameOverScreen.classList.add('hidden');
    updateHUD();
    startTimer();
    
    // Spawn initial enemy squad - wait for AI to load
    setTimeout(() => {
        if (window.AI && window.AI.spawnFormation) {
            window.AI.spawnFormation();
        } else {
            console.log('AI not loaded yet, will spawn automatically');
        }
    }, 3000);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameActive) {
        try {
            handleMovement();
            
            // Only call AI if it exists and is properly initialized
            if (window.AI && typeof AI.updateEnemyAI === 'function') {
                AI.updateEnemyAI();
            }
        } catch (error) {
            console.error('Error in animate loop:', error);
            // Continue rendering even if AI fails
        }
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize when page loads - DISABLED: Now controlled by menu
// document.addEventListener('DOMContentLoaded', init);
