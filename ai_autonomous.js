// Simple AI System for 3D Sniper Game - COMPLETELY FIXED

// Configuration
const AI_CONFIG = {
    SPAWN_INTERVAL: 3000,
    SPAWN_DISTANCE_MIN: 50,
    SPAWN_DISTANCE_MAX: 115,
    ATTACK_RANGE: 40,
    FORMATION_SPACING: 1.5,
    PATHFINDING: {
        UPDATE_INTERVAL: 500, // Faster path updates
        WAYPOINT_DISTANCE: 0.5, // Much smaller waypoint distance
        MAX_SEARCH_RADIUS: 10,
        OBSTACLE_AVOIDANCE: 3.0
    }
};

// Global tracking
window.AI = window.AI || {};
window.AI.formations = [];
window.AI.formationId = 0;
window.AI.lastSpawn = 0;
window.AI.formationCount = 0;

// Create enemy
function createEnemy(x, z, formationId) {
    const enemyGroup = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.0, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    enemyGroup.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    enemyGroup.add(head);
    
    // Weapon (gun)
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.2);
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.6, 1.5, 0);
    weapon.rotation.y = Math.PI / 4;
    enemyGroup.add(weapon);
    
    // Weapon barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0.6, 1.5, 0.6);
    barrel.rotation.x = Math.PI / 2;
    enemyGroup.add(barrel);
    
    // Position
    enemyGroup.position.set(x, 0, z);
    
    // AI Data with pathfinding
    enemyGroup.userData = {
        formationId: formationId,
        isAlerted: false,
        lastShoot: 0,
        originalX: x,
        originalZ: z,
        // Pathfinding data
        currentPath: [],
        currentWaypoint: 0,
        lastPathUpdate: 0,
        targetX: x,
        targetZ: z,
        isMoving: true, // Start moving immediately
        moveSpeed: 0.2 + Math.random() * 0.1, // Much faster movement
        huntingSpeed: 0.4 + Math.random() * 0.2, // Very fast when hunting
        // Hunting behavior
        isHunting: false,
        detectionRadius: 15,
        lastPlayerSeen: 0,
        huntingTarget: null
    };
    
    // Give initial patrol path with guaranteed valid position
    const initialAngle = Math.random() * Math.PI * 2;
    const initialRadius = 8; // Larger radius
    let targetX = x + Math.cos(initialAngle) * initialRadius;
    let targetZ = z + Math.sin(initialAngle) * initialRadius;
    
    // Force valid target position
    if (!isValidPosition(targetX, targetZ)) {
        targetX = x + 10; // Simple fallback
        targetZ = z + 10;
    }
    
    enemyGroup.userData.targetX = targetX;
    enemyGroup.userData.targetZ = targetZ;
    enemyGroup.userData.currentPath = generatePath(x, z, targetX, targetZ);
    enemyGroup.userData.lastPathUpdate = Date.now() - 1000; // Force immediate path update
    
    console.log(`🆕 Enemy ${formationId} created at (${x}, ${z}) with ${enemyGroup.userData.currentPath.length} waypoint path to (${targetX}, ${targetZ})`);
    
    window.scene.add(enemyGroup);
    window.targets.push(enemyGroup);
    
    return enemyGroup;
}

// Formation positions
function getFormationPositions(type, centerX, centerZ) {
    const positions = [];
    const spacing = AI_CONFIG.FORMATION_SPACING;
    
    if (type === 'duo') {
        // Line formation
        positions.push({ x: centerX - spacing/2, z: centerZ });
        positions.push({ x: centerX + spacing/2, z: centerZ });
    } else if (type === 'trio') {
        // Triangle formation  
        positions.push({ x: centerX, z: centerZ + spacing/2 });
        positions.push({ x: centerX - spacing/2, z: centerZ - spacing/2 });
        positions.push({ x: centerX + spacing/2, z: centerZ - spacing/2 });
    } else if (type === 'squad') {
        // Square formation
        positions.push({ x: centerX - spacing/2, z: centerZ - spacing/2 });
        positions.push({ x: centerX + spacing/2, z: centerZ - spacing/2 });
        positions.push({ x: centerX - spacing/2, z: centerZ + spacing/2 });
        positions.push({ x: centerX + spacing/2, z: centerZ + spacing/2 });
    }
    
    return positions;
}

// Pathfinding functions with explicit 40m targeting
function generatePath(startX, startZ, targetX, targetZ, isHunting = false) {
    const path = [];
    let steps = Math.max(Math.abs(targetX - startX), Math.abs(targetZ - startZ)) / 3;
    steps = Math.max(steps, 3); // Minimum 3 waypoints
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = startX + (targetX - startX) * t;
        const z = startZ + (targetZ - startZ) * t;
        
        // Reduce randomness when hunting for more direct paths
        const randomOffset = isHunting ? 0.8 : 1.5;
        path.push({
            x: x + (Math.random() - 0.5) * randomOffset,
            z: z + (Math.random() - 0.5) * randomOffset
        });
    }
    
    return path;
}

// Calculate optimal 40m attack position
function calculate40mPosition(enemy, playerPos) {
    const currentDistance = enemy.position.distanceTo(playerPos);
    
    if (currentDistance <= 45) {
        // Already close, find best 40m position
        const angle = Math.atan2(enemy.position.z - playerPos.z, enemy.position.x - playerPos.x);
        
        // Add some spread so multiple enemies don't all go to same spot
        const spreadAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
        
        return {
            x: playerPos.x + Math.cos(spreadAngle) * 40,
            z: playerPos.z + Math.sin(spreadAngle) * 40
        };
    } else {
        // Far away, approach directly first
        const directionX = (playerPos.x - enemy.position.x);
        const directionZ = (playerPos.z - enemy.position.z);
        const distance = Math.sqrt(directionX * directionX + directionZ * directionZ);
        
        // Position 40m away in the direction of approach
        const approachX = playerPos.x - (directionX / distance) * 40;
        const approachZ = playerPos.z - (directionZ / distance) * 40;
        
        return { x: approachX, z: approachZ };
    }
}

function isValidPosition(x, z) {
    // Much more permissive validation
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 8) return false; // Reduced from 15
    
    // Larger bounds
    if (Math.abs(x) > 200 || Math.abs(z) > 200) return false;
    
    return true;
}

function updateEnemyPath(enemy) {
    const ai = enemy.userData;
    const currentTime = Date.now();
    
    // Only update path periodically
    if (currentTime - ai.lastPathUpdate < AI_CONFIG.PATHFINDING.UPDATE_INTERVAL) {
        return;
    }
    
    ai.lastPathUpdate = currentTime;
    
    if (!ai.isAlerted) {
        // Random patrol movement
        const patrolRadius = 8;
        const angle = Math.random() * Math.PI * 2;
        ai.targetX = ai.originalX + Math.cos(angle) * patrolRadius;
        ai.targetZ = ai.originalZ + Math.sin(angle) * patrolRadius;
        
        // Ensure valid position
        if (!isValidPosition(ai.targetX, ai.targetZ)) {
            ai.targetX = ai.originalX;
            ai.targetZ = ai.originalZ;
        }
    } else {
        // Advanced hunting behavior - path to exactly 40m from player
        const playerPos = window.camera.position;
        const distanceToPlayer = Math.sqrt(
            Math.pow(playerPos.x - enemy.position.x, 2) + 
            Math.pow(playerPos.z - enemy.position.z, 2)
        );
        
        ai.isHunting = true;
        ai.lastPlayerSeen = currentTime;
        ai.huntingTarget = { x: playerPos.x, z: playerPos.z };
        
        // Calculate optimal 40m attack position
        const attackPosition = calculate40mPosition(enemy, playerPos);
        ai.targetX = attackPosition.x;
        ai.targetZ = attackPosition.z;
        
        // Validate and adjust position if needed
        if (!isValidPosition(ai.targetX, ai.targetZ)) {
            // Fallback to simple 40m positioning
            const angle = Math.atan2(enemy.position.z - playerPos.z, enemy.position.x - playerPos.x);
            ai.targetX = playerPos.x + Math.cos(angle) * 40;
            ai.targetZ = playerPos.z + Math.sin(angle) * 40;
        }
        
        console.log(`🎯 Enemy ${ai.formationId} pathfinding to 40m attack position at (${Math.round(ai.targetX)}, ${Math.round(ai.targetZ)})`);
    }
    
    // Generate new path with hunting flag for more direct pathing
    ai.currentPath = generatePath(
        enemy.position.x, enemy.position.z,
        ai.targetX, ai.targetZ,
        ai.isHunting
    );
    ai.currentWaypoint = 0;
    ai.isMoving = ai.currentPath.length > 1;
    
    console.log(`🗺️ Enemy ${ai.formationId} generated path: ${ai.currentPath.length} waypoints, moving: ${ai.isMoving}`);
    
    // Debug logging for 40m pathfinding
    if (ai.isHunting) {
        const currentDist = Math.sqrt(
            Math.pow(enemy.position.x - window.camera.position.x, 2) + 
            Math.pow(enemy.position.z - window.camera.position.z, 2)
        );
        const targetDist = Math.sqrt(
            Math.pow(ai.targetX - window.camera.position.x, 2) + 
            Math.pow(ai.targetZ - window.camera.position.z, 2)
        );
        console.log(`📍 Enemy ${ai.formationId}: Current ${Math.round(currentDist)}m → Target ${Math.round(targetDist)}m from player`);
    }
}

function moveEnemyAlongPath(enemy) {
    const ai = enemy.userData;
    
    if (!ai.isMoving || ai.currentPath.length === 0) {
        return;
    }
    
    const currentWaypoint = ai.currentPath[ai.currentWaypoint];
    if (!currentWaypoint) {
        ai.isMoving = false;
        return;
    }
    
    // Calculate distance to current waypoint
    const dx = currentWaypoint.x - enemy.position.x;
    const dz = currentWaypoint.z - enemy.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Move toward waypoint - use appropriate speed based on state
    if (distance > AI_CONFIG.PATHFINDING.WAYPOINT_DISTANCE) {
        let currentSpeed;
        if (ai.isCharging) {
            currentSpeed = ai.chargingSpeed || 0.12; // Fixed charging speed
        } else if (ai.isHunting) {
            currentSpeed = ai.huntingSpeed;
        } else {
            currentSpeed = ai.moveSpeed;
        }
        
        const moveX = (dx / distance) * currentSpeed;
        const moveZ = (dz / distance) * currentSpeed;
        
        const newX = enemy.position.x + moveX;
        const newZ = enemy.position.z + moveZ;
        
        // Always move - don't let validation block movement
        enemy.position.x = newX;
        enemy.position.z = newZ;
        
        // Face movement direction
        if (distance > 1) {
            enemy.lookAt(currentWaypoint.x, enemy.position.y, currentWaypoint.z);
        }
        
        console.log(`➡️ Enemy ${ai.formationId} moved to (${newX.toFixed(1)}, ${newZ.toFixed(1)}) speed: ${currentSpeed.toFixed(3)}`);
    } else {
        // Reached waypoint, move to next
        ai.currentWaypoint++;
        if (ai.currentWaypoint >= ai.currentPath.length) {
            ai.isMoving = false;
            ai.currentPath = [];
            ai.currentWaypoint = 0;
        }
    }
}

// Spawn formation
function spawnFormation() {
    const types = ['duo', 'trio', 'squad'];
    const formationType = types[Math.floor(Math.random() * types.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const distance = AI_CONFIG.SPAWN_DISTANCE_MIN + Math.random() * (AI_CONFIG.SPAWN_DISTANCE_MAX - AI_CONFIG.SPAWN_DISTANCE_MIN);
    const centerX = Math.cos(angle) * distance;
    const centerZ = Math.sin(angle) * distance;
    
    const positions = getFormationPositions(formationType, centerX, centerZ);
    
    const formation = {
        id: window.AI.formationId++,
        type: formationType,
        members: [],
        isAlerted: false
    };
    
    for (const pos of positions) {
        const enemy = createEnemy(pos.x, pos.z, formation.id);
        formation.members.push(enemy);
    }
    
    window.AI.formations.push(formation);
    window.AI.formationCount++; // Increment formation counter
    
    console.log(`Formation ${formation.id} (${formationType}) spawned with ${positions.length} enemies - Total formations: ${window.AI.formationCount}`);
}

// Update AI
function updateEnemyAI() {
    if (!window.targets || !window.scene || !window.camera) {
        return;
    }
    
    const currentTime = Date.now();
    
    // Dynamic spawn timing: 4 seconds for first 3 formations, then 7 seconds
    const currentSpawnInterval = window.AI.formationCount < 3 ? 4000 : 7000;
    
    if (currentTime - window.AI.lastSpawn >= currentSpawnInterval) {
        spawnFormation();
        window.AI.lastSpawn = currentTime;
        console.log(`Next spawn in ${window.AI.formationCount < 3 ? 4 : 7} seconds...`);
    }
    
    // Update simple bullets every frame
    updateSimpleBullets();
    
    // AI behavior with pathfinding and hunting - process all enemies for smooth movement
    window.targets.forEach(enemy => {
        if (!enemy || !enemy.userData) return;
        
        const ai = enemy.userData;
        const distanceToPlayer = enemy.position.distanceTo(window.camera.position);
        
        // Enhanced proximity detection with formation communication
        if (!ai.isAlerted && !ai.isHunting) {
            if (distanceToPlayer <= 25) { // Increased detection range
                ai.isAlerted = true;
                ai.isHunting = true;
                ai.lastPlayerSeen = currentTime;
                console.log(`🚨 ENEMY ${ai.formationId} DETECTED PLAYER at ${Math.round(distanceToPlayer)}m - STARTING HUNT!`);
                
                // Change color to indicate hunting
                if (enemy.children[0]) {
                    enemy.children[0].material.color.setHex(0xff4444);
                }
                
                // Force immediate path update to start hunting
                ai.lastPathUpdate = 0;
                
                // Immediately communicate with entire formation
                alertFormation(ai.formationId, "proximity detection");
                
                // Force all formation members to start hunting
                const formation = window.AI.formations.find(f => f.id === ai.formationId);
                if (formation) {
                    formation.members.forEach(member => {
                        if (member.userData) {
                            member.userData.isAlerted = true;
                            member.userData.isHunting = true;
                            member.userData.lastPlayerSeen = currentTime;
                            if (member.children[0]) {
                                member.children[0].material.color.setHex(0xff4444);
                            }
                        }
                    });
                }
            }
        }
        
        // Hunting behavior updates
        if (ai.isHunting) {
            if (distanceToPlayer <= 20) { // Increased hunting range
                // Player still in range, update last seen
                ai.lastPlayerSeen = currentTime;
                ai.huntingTarget = { 
                    x: window.camera.position.x, 
                    z: window.camera.position.z 
                };
            } else if (currentTime - ai.lastPlayerSeen > 10000) {
                // Lost player for 10 seconds, stop hunting
                ai.isHunting = false;
                ai.isAlerted = false;
                ai.huntingTarget = null;
                console.log(`Enemy ${ai.formationId} lost player - returning to patrol`);
                
                // Change back to normal color
                if (enemy.children[0]) {
                    enemy.children[0].material.color.setHex(0xff0000); // Back to red
                }
            }
        }
        
        // Update pathfinding for this enemy (faster updates)
        if (currentTime - ai.lastPathUpdate > 500) {
            updateEnemyPath(enemy);
            console.log(`📍 Enemy ${ai.formationId} updating path - hunting: ${ai.isHunting}, moving: ${ai.isMoving}, waypoints: ${ai.currentPath.length}`);
        }
        
        // Move enemy along current path
        moveEnemyAlongPath(enemy);
        
        // Debug movement - show position changes
        if (ai.isMoving && ai.currentPath.length > 0) {
            const oldX = enemy.position.x;
            const oldZ = enemy.position.z;
            console.log(`🚶 Enemy ${ai.formationId} at (${oldX.toFixed(1)}, ${oldZ.toFixed(1)}) moving to waypoint ${ai.currentWaypoint}/${ai.currentPath.length}`);
        } else if (!ai.isMoving) {
            console.log(`⏸️ Enemy ${ai.formationId} NOT MOVING - path length: ${ai.currentPath.length}`);
        }
        
        // SIMPLE SHOOTING SYSTEM - JUST SHOOT!
        if (distanceToPlayer <= AI_CONFIG.ATTACK_RANGE && currentTime - ai.lastShoot > 1000) {
            ai.lastShoot = currentTime;
            console.log(`💥 SIMPLE SHOT! Enemy ${ai.formationId} shooting at ${Math.round(distanceToPlayer)}m!`);
            
            // Just shoot a simple bullet!
            shootSimpleBullet(enemy);
            
            // Visual feedback - muzzle flash color
            if (enemy.children[0]) {
                enemy.children[0].material.color.setHex(0xffaa00);
                setTimeout(() => {
                    if (enemy.children[0]) {
                        enemy.children[0].material.color.setHex(0xff0000); // Changed back to red
                    }
                }, 200);
            }
        }
    });
}

// Line of sight check for shooting - simplified for guaranteed AI shooting
function hasLineOfSight(enemy, targetPos) {
    // Always return true to ensure AI shoots when in range
    return true;
}

// REMOVED COMPLEX FUNCTIONS - USING SIMPLE SYSTEM ONLY

// Create muzzle flash effect
function createEnemyMuzzleFlash(position) {
    const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 0.8 
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    
    window.scene.add(flash);
    
    // Remove flash after brief moment
    setTimeout(() => {
        window.scene.remove(flash);
    }, 100);
}

// SUPER SIMPLE BULLET SYSTEM - JUST GOES FROM A TO B!
function shootSimpleBullet(enemy) {
    // Get enemy position (point A)
    const startPos = enemy.position.clone();
    startPos.y += 1.5; // Shoot from chest height
    
    // Get player position (point B) 
    const targetPos = window.camera.position.clone();
    
    // Calculate direction from A to B
    const direction = targetPos.sub(startPos).normalize();
    
    // Create simple red bullet
    const bulletGeometry = new THREE.SphereGeometry(0.1, 6, 6);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(startPos);
    window.scene.add(bullet);
    
    // Store bullet data
    bullet.userData = {
        direction: direction,
        speed: 0.5, // Units per frame
        life: 300, // frames
        age: 0
    };
    
    // Add to simple bullets array
    if (!window.simpleBullets) window.simpleBullets = [];
    window.simpleBullets.push(bullet);
    
    console.log(`🔫 Simple bullet fired from enemy!`);
}

// Update simple bullets every frame
function updateSimpleBullets() {
    if (!window.simpleBullets) return;
    
    for (let i = window.simpleBullets.length - 1; i >= 0; i--) {
        const bullet = window.simpleBullets[i];
        const data = bullet.userData;
        
        // Move bullet from A towards B
        const movement = data.direction.clone().multiplyScalar(data.speed);
        bullet.position.add(movement);
        
        // Age the bullet
        data.age++;
        
        // Check if hit player (simple distance check)
        const distToPlayer = bullet.position.distanceTo(window.camera.position);
        if (distToPlayer < 2) {
            console.log("💥 SIMPLE BULLET HIT PLAYER!");
            
            // Damage player
            if (window.playerHealth !== undefined) {
                window.playerHealth = Math.max(0, window.playerHealth - 5);
                console.log(`🩸 Player health: ${window.playerHealth}/100`);
                
                if (typeof updateHUD === 'function') {
                    updateHUD();
                }
                
                if (window.playerHealth <= 0) {
                    console.log("💀 PLAYER KILLED BY SIMPLE BULLET!");
                    if (typeof endGame === 'function') {
                        endGame();
                    }
                }
            }
            
            // Remove bullet
            window.scene.remove(bullet);
            window.simpleBullets.splice(i, 1);
            continue;
        }
        
        // Remove old bullets
        if (data.age > data.life) {
            window.scene.remove(bullet);
            window.simpleBullets.splice(i, 1);
        }
    }
}

// Create enemy impact burst effect (red themed)
function createEnemyImpactBurst(position) {
    const particleCount = 12;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.08, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3333, // Red particles for enemy impacts
            transparent: true, 
            opacity: 0.8 
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);
        
        // Random directions for burst effect
        const angle = (i / particleCount) * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
        particle.userData = {
            velocity: new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * (2 + Math.random() * 3),
                Math.sin(elevation) * (2 + Math.random() * 3),
                Math.sin(angle) * Math.cos(elevation) * (2 + Math.random() * 3)
            ),
            life: 800 + Math.random() * 400
        };
        
        particles.push(particle);
        window.scene.add(particle);
    }
    
    // Animate particles
    const startTime = Date.now();
    function animateParticles() {
        const elapsed = Date.now() - startTime;
        let activeParticles = 0;
        
        particles.forEach(particle => {
            if (elapsed < particle.userData.life) {
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.02));
                particle.userData.velocity.y -= 0.05; // Gravity
                particle.material.opacity = 1 - (elapsed / particle.userData.life);
                activeParticles++;
            } else {
                window.scene.remove(particle);
            }
        });
        
        if (activeParticles > 0) {
            requestAnimationFrame(animateParticles);
        }
    }
    
    animateParticles();
}

// Update enemy bullets (now handled by individual bullet animations)
function updateEnemyBullets() {
    // This function is now mostly handled by individual bullet animations
    // Keep for compatibility but bullets self-manage their lifecycle
}

// Alert formation when shot at or member killed
function alertFormation(formationId, reason = "unknown") {
    const formation = window.AI.formations.find(f => f.id === formationId);
    if (formation && !formation.isAlerted) {
        formation.isAlerted = true;
        formation.members.forEach(enemy => {
            if (enemy.userData) {
                enemy.userData.isAlerted = true;
                enemy.userData.isHunting = true;
                enemy.userData.lastPlayerSeen = Date.now();
                if (enemy.children[0]) {
                    enemy.children[0].material.color.setHex(0xff4444); // Red when alerted
                }
            }
        });
        console.log(`🚨 Formation ${formationId} alerted due to: ${reason}`);
    }
}

// Function to call when enemy is hit/killed - improved version
function onEnemyHit(hitEnemy) {
    if (!hitEnemy.userData) return;
    
    const formationId = hitEnemy.userData.formationId;
    console.log(`💥 Enemy from formation ${formationId} was shot! Alerting formation...`);
    
    // Immediately alert the hit enemy's formation
    alertFormation(formationId, "member shot");
    
    // Force all members of this formation to hunt immediately
    const formation = window.AI.formations.find(f => f.id === formationId);
    if (formation) {
        formation.members.forEach(member => {
            if (member.userData && member !== hitEnemy) {
                member.userData.isAlerted = true;
                member.userData.isHunting = true;
                member.userData.lastPlayerSeen = Date.now();
                console.log(`🚨 Formation member ${member.userData.formationId} now hunting due to teammate shot!`);
                
                // Change color immediately
                if (member.children[0]) {
                    member.children[0].material.color.setHex(0xff4444);
                }
            }
        });
    }
    
    // Also alert nearby formations within detection range
    window.targets.forEach(enemy => {
        if (!enemy.userData || enemy === hitEnemy) return;
        
        const distance = enemy.position.distanceTo(hitEnemy.position);
        if (distance <= 25) { // 25m alert radius for nearby formations
            console.log(`🔊 Formation ${enemy.userData.formationId} heard gunfire ${Math.round(distance)}m away`);
            alertFormation(enemy.userData.formationId, "nearby gunfire");
        }
    });
}

// Enhanced shot detection system
function checkEnemyShotDetection(hitTarget = null) {
    if (hitTarget && hitTarget.userData) {
        // Direct hit on enemy - trigger immediate hunting
        onEnemyHit(hitTarget);
    } else {
        // Missed shot - alert enemies near player position
        const playerPos = window.camera.position;
        let alertedFormations = [];
        
        window.targets.forEach(enemy => {
            if (!enemy.userData) return;
            
            const distanceToPlayer = enemy.position.distanceTo(playerPos);
            if (distanceToPlayer <= 30) { // 30m radius for missed shots
                const formationId = enemy.userData.formationId;
                if (!alertedFormations.includes(formationId)) {
                    alertedFormations.push(formationId);
                    console.log(`🔫 Formation ${formationId} detected gunfire from ${Math.round(distanceToPlayer)}m away`);
                    alertFormation(formationId, "gunfire detected");
                }
            }
        });
    }
}

// Export
window.AI.updateEnemyAI = updateEnemyAI;
window.AI.spawnFormation = spawnFormation;
window.AI.spawnEnemyGroup = spawnFormation; // Alias for compatibility
window.AI.alertFormation = alertFormation;
window.AI.onEnemyHit = onEnemyHit; // For when enemies are shot
window.AI.hasLineOfSight = hasLineOfSight;
window.AI.checkEnemyShotDetection = checkEnemyShotDetection; // Enhanced shot detection
