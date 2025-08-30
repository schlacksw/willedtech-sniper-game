// AI System for 3D Sniper Game
// Advanced enemy behavior and combat AI

// AI Configuration
const AI_CONFIG = {
    MAX_ENEMIES: 12,
    GROUP_SIZES: [2, 3, 4],
    SPAWN_CHANCE: 0.008, // Much higher spawn rate
    SPAWN_DISTANCE: {
        MIN: 50,  // Updated spawn range
        MAX: 115
    },
    GROUP_SEPARATION: 50,
    DETECTION_RADIUS: 40,
    ATTACK_RANGE: 40, // Updated to 40m shooting range
    PROXIMITY_ENGAGEMENT: 45,
    LOCALIZED_DETECTION: 5, // Updated to 5 units for hunting trigger
    ALERT_SPREAD_RANGE: 20,
    SHOT_DETECTION_RANGE: 50,
    TOWER_MIN_DISTANCE: 20,
    AIM_ERROR: { MIN: 0.3, MAX: 0.7 },
    DAMAGE_PER_HIT: 5,
    SHOOT_INTERVALS: { MIN: 3000, MAX: 3000 }, // 3 second cooldown
    SPEEDS: {
        NORMAL: 0.15,
        FAST: 0.25,
        HUNTING: 0.4,
        VARIATION: 0.05,
        RUSHING_MULTIPLIER: 2.2,
        ADVANCING_MULTIPLIER: 1.8
    }
};

// Group tracking
let enemyGroups = [];
let nextGroupId = 0;

// AI States
const AI_STATES = {
    HUNTING: 'hunting',
    ADVANCING: 'advancing', 
    RUSHING: 'rushing',
    SHOOTING: 'shooting',
    TAKING_COVER: 'taking_cover',
    PATROLLING: 'patrolling',
    ALERTED: 'alerted'
};

// AI Colors for visual feedback
const AI_COLORS = {
    NORMAL: 0xff0000,      // Red - default
    HUNTING: 0xff0000,     // Red - hunting
    ADVANCING: 0xff8800,   // Orange - advancing
    RUSHING: 0xff4400,     // Dark orange - rushing when shot at
    SHOOTING: 0xff0000,    // Bright red - shooting
    TAKING_COVER: 0xffff00, // Yellow - taking cover
    ALERTED: 0xff4444      // Light red - alerted
};

// Spawn enemy groups with formation tracking and separation
function spawnEnemyGroup() {
    if (targets.length >= AI_CONFIG.MAX_ENEMIES) return;
    
    // Random group size
    const groupSize = AI_CONFIG.GROUP_SIZES[Math.floor(Math.random() * AI_CONFIG.GROUP_SIZES.length)];
    
    // Find spawn location that's far from player AND other groups
    let baseAngle, baseDistance, spawnPos;
    let attempts = 0;
    do {
        baseAngle = Math.random() * Math.PI * 2;
        baseDistance = AI_CONFIG.SPAWN_DISTANCE.MIN + Math.random() * (AI_CONFIG.SPAWN_DISTANCE.MAX - AI_CONFIG.SPAWN_DISTANCE.MIN);
        spawnPos = {
            x: Math.cos(baseAngle) * baseDistance,
            z: Math.sin(baseAngle) * baseDistance
        };
        
        // Check if this location is far enough from existing groups
        let tooClose = false;
        for (let group of enemyGroups) {
            const distance = Math.sqrt(
                Math.pow(spawnPos.x - group.centerPosition.x, 2) + 
                Math.pow(spawnPos.z - group.centerPosition.z, 2)
            );
            if (distance < AI_CONFIG.GROUP_SEPARATION) {
                tooClose = true;
                break;
            }
        }
        
        if (!tooClose) break;
        attempts++;
    } while (attempts < 20); // More attempts to find good spawn location
    
    // Create group tracking
    const groupId = nextGroupId++;
    const groupData = {
        id: groupId,
        isAlerted: false,
        isEngaged: false,
        members: [],
        spawnTime: Date.now(),
        centerPosition: spawnPos
    };
    
    console.log(`🎯 Formation ${groupId}: Deploying ${groupSize} combatants at ${Math.round(baseDistance)} units (separated by ${AI_CONFIG.GROUP_SEPARATION}+ units)`);
    
    // Create tactical formations based on group size
    const formations = getTacticalFormation(groupSize, baseAngle, baseDistance);
    
    for (let i = 0; i < groupSize; i++) {
        const formationPos = formations[i];
        const enemy = createEnemy(formationPos.angle, formationPos.distance, i, groupId);
        if (enemy) {
            groupData.members.push(enemy);
        }
    }
    
    enemyGroups.push(groupData);
    console.log(`📋 Active formations: ${enemyGroups.length}`);
}

// Get tactical formation positions for different group sizes
function getTacticalFormation(groupSize, baseAngle, baseDistance) {
    const formationDistance = 1.7; // Units between formation members
    const formations = [];
    
    if (groupSize === 2) {
        // Duo: Side by side formation
        formations.push({
            angle: baseAngle,
            distance: baseDistance - formationDistance/2
        });
        formations.push({
            angle: baseAngle,
            distance: baseDistance + formationDistance/2
        });
    } 
    else if (groupSize === 3) {
        // Trio: Triangle formation
        formations.push({
            angle: baseAngle,
            distance: baseDistance // Front point
        });
        formations.push({
            angle: baseAngle + Math.atan(formationDistance / baseDistance),
            distance: baseDistance + formationDistance/2 // Back left
        });
        formations.push({
            angle: baseAngle - Math.atan(formationDistance / baseDistance),
            distance: baseDistance + formationDistance/2 // Back right
        });
    }
    else if (groupSize === 4) {
        // Squad: Box formation (2x2)
        const halfDist = formationDistance / 2;
        formations.push({
            angle: baseAngle + Math.atan(halfDist / baseDistance),
            distance: baseDistance - halfDist // Front left
        });
        formations.push({
            angle: baseAngle - Math.atan(halfDist / baseDistance),
            distance: baseDistance - halfDist // Front right
        });
        formations.push({
            angle: baseAngle + Math.atan(halfDist / baseDistance),
            distance: baseDistance + halfDist // Back left
        });
        formations.push({
            angle: baseAngle - Math.atan(halfDist / baseDistance),
            distance: baseDistance + halfDist // Back right
        });
    }
    
    return formations;
}

// Create individual enemy with group-based AI
function createEnemy(angle = null, distance = null, squadIndex = 0, groupId = 0) {
    if (targets.length >= AI_CONFIG.MAX_ENEMIES) return;
    
    const enemyGroup = new THREE.Group();
    
    // Enhanced body with more detail
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 1.0, 2, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
        color: AI_COLORS.NORMAL,
        transparent: true,
        opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    enemyGroup.add(body);
    
    // Head for better visual
    const headGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.2;
    head.castShadow = true;
    enemyGroup.add(head);
    
    // Invisible hitbox
    const hitboxGeometry = new THREE.CylinderGeometry(1.2, 1.2, 3, 8);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.0,
        visible: false
    });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.y = 1.5;
    enemyGroup.add(hitbox);
    
    // Position enemy
    if (angle === null) angle = Math.random() * Math.PI * 2;
    if (distance === null) distance = 40 + Math.random() * 30;
    
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    enemyGroup.position.set(x, 0, z);
    
    // Enhanced AI data with group-based behavior
    enemyGroup.userData = {
        // Group tracking
        groupId: groupId,
        squadIndex: squadIndex,
        
        // Basic info
        originalX: x,
        originalZ: z,
        spawnTime: Date.now(),
        
        // Movement
        moveSpeed: AI_CONFIG.SPEEDS.NORMAL + Math.random() * AI_CONFIG.SPEEDS.VARIATION,
        
        // AI State - starts as PATROLLING (idle)
        state: AI_STATES.PATROLLING,
        previousState: null,
        stateChangeTime: Date.now(),
        
        // Group awareness
        isAlerted: false,
        groupAlerted: false,
        
        // Timers
        lastPlayerCheck: 0,
        shootCooldown: 0,
        lastPathUpdate: 0,
        lastShotAt: 0,
        alertTimer: 0,
        
        // Position tracking
        targetX: x,
        targetZ: z,
        coverPoint: null,
        lastKnownPlayerPos: null,
        
        // Combat stats
        health: 100,
        beenShotAt: false,
        timesHit: 0,
        shotsFired: 0,
        
        // Personality traits
        aggressionLevel: Math.random(),
        courage: 0.3 + Math.random() * 0.7,
        accuracy: 0.2 + Math.random() * 0.4,
        alertness: 0.4 + Math.random() * 0.6,
        
        // Combat ranges
        attackRange: AI_CONFIG.ATTACK_RANGE,
        coverRadius: 15,
        fleeDistance: 25
    };
    
    scene.add(enemyGroup);
    targets.push(enemyGroup);
    
    console.log(`👤 Enemy soldier created at (${Math.round(x)}, ${Math.round(z)}) - Group: ${groupId} | Squad: ${squadIndex + 1}`);
    return enemyGroup;
}

// Group management functions
function getEnemyGroup(groupId) {
    return enemyGroups.find(group => group.id === groupId);
}

function removeEnemyFromGroup(enemy) {
    const group = getEnemyGroup(enemy.userData.groupId);
    if (group) {
        group.members = group.members.filter(member => member !== enemy);
    }
}

function updateGroupAwareness() {
    enemyGroups.forEach(group => {
        if (!group.isAlerted) {
            // Check if any group member is close enough to player
            const playerPos = camera.position;
            for (let member of group.members) {
                const distanceToPlayer = member.position.distanceTo(playerPos);
                if (distanceToPlayer < AI_CONFIG.PROXIMITY_ENGAGEMENT) {
                    alertGroup(group.id);
                    console.log(`🚨 Formation ${group.id} detected player at ${Math.round(distanceToPlayer)} units - engaging!`);
                    break;
                }
            }
        }
    });
}

function alertGroup(groupId) {
    const group = getEnemyGroup(groupId);
    if (group && !group.isAlerted) {
        group.isAlerted = true;
        group.isEngaged = true;
        
        // Alert only this specific group
        group.members.forEach(member => {
            if (member.userData) {
                member.userData.isAlerted = true;
                member.userData.groupAlerted = true;
                changeEnemyState(member, AI_STATES.HUNTING);
            }
        });
    }
}

// Smart movement with collision avoidance
function moveEnemyToward(enemy, targetX, targetZ, speed) {
    const currentX = enemy.position.x;
    const currentZ = enemy.position.z;
    
    // Calculate direction
    const deltaX = targetX - currentX;
    const deltaZ = targetZ - currentZ;
    const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
    
    if (distance > 0.5) {
        // Normalize and apply speed
        const moveX = (deltaX / distance) * speed;
        const moveZ = (deltaZ / distance) * speed;
        
        const newX = enemy.position.x + moveX;
        const newZ = enemy.position.z + moveZ;
        
        // Tower collision prevention
        const distanceFromCenter = Math.sqrt(newX * newX + newZ * newZ);
        if (distanceFromCenter > AI_CONFIG.TOWER_MIN_DISTANCE) {
            enemy.position.x = newX;
            enemy.position.z = newZ;
        }
        
        // Keep at ground level
        enemy.position.y = 0;
        
        // Face movement direction
        if (distance > 5) {
            enemy.lookAt(targetX, enemy.position.y, targetZ);
        }
    }
}

// Advanced group-based AI state machine
function updateEnemyAI() {
    // Early exit if game not ready
    if (!window.targets || !window.scene || !window.camera || !Array.isArray(targets)) {
        return;
    }
    
    const currentTime = Date.now();
    
    // Throttle AI updates to prevent performance issues
    if (!updateEnemyAI.lastUpdate || currentTime - updateEnemyAI.lastUpdate < 100) {
        return; // Only update every 100ms
    }
    updateEnemyAI.lastUpdate = currentTime;
    
    // Update group awareness with error handling
    try {
        updateGroupAwareness();
    } catch (error) {
        console.error('Error in group awareness:', error);
        return;
    }
    
    targets.forEach((enemy, index) => {
        if (!enemy.userData) {
            console.log('⚠️ Enemy missing AI data');
            return;
        }
        
        const ai = enemy.userData;
        const distanceToPlayer = enemy.position.distanceTo(camera.position);
        const playerPos = camera.position;
        const group = getEnemyGroup(ai.groupId);
        
        // Update group status
        if (group) {
            ai.groupAlerted = group.isAlerted;
        }
        
        // State machine with group-based logic
        switch (ai.state) {
            case AI_STATES.PATROLLING:
                handlePatrollingState(enemy, ai, distanceToPlayer, playerPos, currentTime, group);
                break;
                
            case AI_STATES.HUNTING:
                handleHuntingState(enemy, ai, distanceToPlayer, playerPos, currentTime);
                break;
                
            case AI_STATES.ADVANCING:
                handleAdvancingState(enemy, ai, distanceToPlayer, playerPos, currentTime);
                break;
                
            case AI_STATES.RUSHING:
                handleRushingState(enemy, ai, distanceToPlayer, playerPos, currentTime);
                break;
                
            case AI_STATES.SHOOTING:
                handleShootingState(enemy, ai, distanceToPlayer, playerPos, currentTime);
                break;
                
            case AI_STATES.TAKING_COVER:
                handleTakingCoverState(enemy, ai, distanceToPlayer, playerPos, currentTime);
                break;
        }
        
        // Remove old enemies
        if (currentTime - ai.spawnTime > 45000) {
            removeEnemyFromGroup(enemy);
            scene.remove(enemy);
            targets.splice(index, 1);
            console.log('💀 Enemy eliminated due to timeout');
        }
    });
    
    // Clean up empty groups
    enemyGroups = enemyGroups.filter(group => group.members.length > 0);
    
    // Spawn new groups aggressively
    const spawnChance = Math.random();
    if (targets.length < 4) {
        console.log('🚁 Force spawning formation!');
        spawnEnemyGroup();
    } else if (spawnChance < AI_CONFIG.SPAWN_CHANCE && targets.length < AI_CONFIG.MAX_ENEMIES) {
        console.log('🚁 Deploying reinforcements!');
        spawnEnemyGroup();
    }
}

// AI State Handlers
function handlePatrollingState(enemy, ai, distanceToPlayer, playerPos, currentTime, group) {
    // Idle behavior - small random movement
    if (currentTime - ai.lastPathUpdate > 2000) {
        const randomX = ai.originalX + (Math.random() - 0.5) * 10;
        const randomZ = ai.originalZ + (Math.random() - 0.5) * 10;
        moveEnemyToward(enemy, randomX, randomZ, ai.moveSpeed * 0.3);
        ai.lastPathUpdate = currentTime;
    }
    
    // Only become aware if group is alerted or shot at
    if (ai.groupAlerted || ai.beenShotAt) {
        changeEnemyState(enemy, AI_STATES.HUNTING);
    }
    
    // Set idle color
    setEnemyColor(enemy, 0x666666); // Gray for idle
}

function handleHuntingState(enemy, ai, distanceToPlayer, playerPos, currentTime) {
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    
    // Use faster hunting speed if group was shot at
    const huntingSpeed = ai.beenShotAt ? 
        ai.moveSpeed * AI_CONFIG.SPEEDS.RUSHING_MULTIPLIER : 
        ai.moveSpeed * AI_CONFIG.SPEEDS.ADVANCING_MULTIPLIER;
    
    // Aggressive movement toward player
    moveEnemyToward(enemy, playerPos.x, playerPos.z, huntingSpeed);
    
    // Set hunting color (more aggressive if shot at)
    setEnemyColor(enemy, ai.beenShotAt ? AI_COLORS.RUSHING : AI_COLORS.HUNTING);
    
    if (distanceToPlayer < ai.detectionRadius) {
        if (distanceToPlayer > ai.attackRange) {
            changeEnemyState(enemy, AI_STATES.ADVANCING);
        } else {
            changeEnemyState(enemy, AI_STATES.SHOOTING);
        }
    } else {
        // Check for rushing behavior (shot at)
        if (ai.beenShotAt) {
            changeEnemyState(enemy, AI_STATES.RUSHING);
        } else {
            // Normal approach
            const dirToPlayer = enemy.position.clone().sub(playerPos).normalize();
            const safeDistance = 30;
            const safeX = playerPos.x + dirToPlayer.x * safeDistance;
            const safeZ = playerPos.z + dirToPlayer.z * safeDistance;
            moveEnemyToward(enemy, safeX, safeZ, ai.moveSpeed);
        }
    }
}

function handleAdvancingState(enemy, ai, distanceToPlayer, playerPos, currentTime) {
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    
    // Advanced tactical movement
    const distToTarget = Math.sqrt(
        Math.pow(playerPos.x - enemy.position.x, 2) + 
        Math.pow(playerPos.z - enemy.position.z, 2)
    );
    
    if (distToTarget > ai.attackRange) {
        moveEnemyToward(enemy, playerPos.x, playerPos.z, ai.moveSpeed * AI_CONFIG.SPEEDS.ADVANCING_MULTIPLIER);
    }
    
    if (distanceToPlayer <= ai.attackRange) {
        changeEnemyState(enemy, AI_STATES.SHOOTING);
    }
}

function handleRushingState(enemy, ai, distanceToPlayer, playerPos, currentTime) {
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    
    // Step 2: Rush to exactly 40m shooting radius
    if (distanceToPlayer > 40) {
        // Rush directly toward player at high speed
        moveEnemyToward(enemy, playerPos.x, playerPos.z, ai.moveSpeed * AI_CONFIG.SPEEDS.RUSHING_MULTIPLIER);
        setEnemyColor(enemy, AI_COLORS.RUSHING);
    } else {
        // Reached 40m range - switch to shooting
        changeEnemyState(enemy, AI_STATES.SHOOTING);
        console.log(`🎯 Enemy reached 40m range - opening fire!`);
    }
}

function handleShootingState(enemy, ai, distanceToPlayer, playerPos, currentTime) {
    enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z);
    
    // Step 3: Shoot with bad aim at 40m range
    if (distanceToPlayer <= 40) {
        // Fire every 3 seconds with bad accuracy
        if (currentTime - ai.shootCooldown > 3000) {
            fireEnemyBullet(enemy, ai);
            ai.shootCooldown = currentTime;
            ai.lastShotAt = currentTime;
            ai.shotsFired++;
            setEnemyColor(enemy, AI_COLORS.SHOOTING);
        }
        
        // Stay at roughly 40m range - don't advance closer
        if (distanceToPlayer < 35) {
            // Back up a bit if too close
            const backupDirection = enemy.position.clone().sub(playerPos).normalize();
            moveEnemyToward(enemy, 
                enemy.position.x + backupDirection.x * 5, 
                enemy.position.z + backupDirection.z * 5, 
                ai.moveSpeed * 0.5);
        }
    } else {
        // Player moved away - rush back to 40m range
        changeEnemyState(enemy, AI_STATES.RUSHING);
    }
}

function handleTakingCoverState(enemy, ai, distanceToPlayer, playerPos, currentTime) {
    if (!ai.coverPoint) {
        const coverDirection = enemy.position.clone().sub(camera.position).normalize();
        ai.coverPoint = {
            x: enemy.position.x + coverDirection.x * ai.coverRadius,
            z: enemy.position.z + coverDirection.z * ai.coverRadius
        };
    }
    
    const distToCover = Math.sqrt(
        Math.pow(enemy.position.x - ai.coverPoint.x, 2) + 
        Math.pow(enemy.position.z - ai.coverPoint.z, 2)
    );
    
    if (distToCover > 1) {
        moveEnemyToward(enemy, ai.coverPoint.x, ai.coverPoint.z, ai.moveSpeed);
        setEnemyColor(enemy, AI_COLORS.TAKING_COVER);
    } else {
        changeEnemyState(enemy, AI_STATES.SHOOTING);
    }
}

// Change enemy state with visual feedback
function changeEnemyState(enemy, newState) {
    const ai = enemy.userData;
    if (ai.state !== newState) {
        ai.previousState = ai.state;
        ai.state = newState;
        ai.stateChangeTime = Date.now();
        
        // Set appropriate color
        const colors = {
            [AI_STATES.HUNTING]: AI_COLORS.HUNTING,
            [AI_STATES.ADVANCING]: AI_COLORS.ADVANCING,
            [AI_STATES.RUSHING]: AI_COLORS.RUSHING,
            [AI_STATES.SHOOTING]: AI_COLORS.SHOOTING,
            [AI_STATES.TAKING_COVER]: AI_COLORS.TAKING_COVER
        };
        
        setEnemyColor(enemy, colors[newState] || AI_COLORS.NORMAL);
        
        // Only log state changes occasionally to prevent console spam
        if (Math.random() < 0.1) { // 10% chance to log
            console.log(`🎯 Enemy state: ${ai.previousState} → ${newState}`);
        }
    }
}

// Set enemy color
function setEnemyColor(enemy, color) {
    if (enemy.children && enemy.children[0] && enemy.children[0].material) {
        enemy.children[0].material.color.setHex(color);
    }
}

// Fire enemy bullet with advanced ballistics
function fireEnemyBullet(enemy, ai) {
    createEnemyMuzzleFlash(enemy.position);
    
    const bulletStart = enemy.position.clone();
    bulletStart.y += 1.5;
    
    // Calculate base direction to player
    const playerDirection = camera.position.clone().sub(bulletStart).normalize();
    
    // Apply accuracy-based aiming error
    const aimError = AI_CONFIG.AIM_ERROR.MIN + (1 - ai.accuracy) * (AI_CONFIG.AIM_ERROR.MAX - AI_CONFIG.AIM_ERROR.MIN);
    const errorX = (Math.random() - 0.5) * aimError;
    const errorZ = (Math.random() - 0.5) * aimError;
    
    const bulletDirection = playerDirection.clone();
    bulletDirection.x += errorX;
    bulletDirection.z += errorZ;
    bulletDirection.normalize();
    
    createEnemyBullet(bulletStart, bulletDirection);
    
    console.log(`💥 Enemy fired! Accuracy: ${Math.round(ai.accuracy * 100)}% | Shots: ${ai.shotsFired}`);
}

// Create enemy bullet using same system as player
function createEnemyBullet(startPos, direction, targetPos) {
    // Use the same bullet creation as the player but in reverse direction
    if (typeof window.createBullet === 'function') {
        // Create bullet with same visual effects as player
        window.createBullet(startPos, direction, 150);
    } else {
        // Fallback to original enemy bullet system
        createFallbackEnemyBullet(startPos, direction, targetPos);
    }
}

// Fallback enemy bullet system
function createFallbackEnemyBullet(startPos, direction, targetPos) {
    // Create larger bullet geometry - same as player
    const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4400,
        transparent: true,
        opacity: 0.9
    });
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(startPos);
    scene.add(bullet);
    
    // Enhanced glowing effect like player bullets
    const innerGlowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4400,
        transparent: true,
        opacity: 0.5
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.position.copy(startPos);
    scene.add(innerGlow);
    
    const outerGlowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.2
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.copy(startPos);
    scene.add(outerGlow);
    
    // Same bullet speed as player
    const bulletSpeed = 4;
    let currentDistance = 0;
    const maxDistance = 150;
    const trailPoints = [startPos.clone()];
    
    // Create dynamic trail like player bullets
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.8,
        linewidth: 3
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);
    
    function animateEnemyBullet() {
        if (currentDistance >= maxDistance) {
            scene.remove(bullet);
            scene.remove(innerGlow);
            scene.remove(outerGlow);
            scene.remove(trail);
            return;
        }
        
        const moveVector = direction.clone().multiplyScalar(bulletSpeed);
        
        // Move bullet and glows
        bullet.position.add(moveVector);
        innerGlow.position.add(moveVector);
        outerGlow.position.add(moveVector);
        
        // Update trail
        trailPoints.push(bullet.position.clone());
        if (trailPoints.length > 10) {
            trailPoints.shift();
        }
        
        trailGeometry.setFromPoints(trailPoints);
        trailGeometry.attributes.position.needsUpdate = true;
        
        // Check collision with player
        const distanceToPlayer = bullet.position.distanceTo(camera.position);
        if (distanceToPlayer < 2) {
            // Hit player
            if (typeof window.playerHealth !== 'undefined' && typeof window.takeDamage === 'function') {
                window.takeDamage(AI_CONFIG.DAMAGE_PER_HIT);
            }
            scene.remove(bullet);
            scene.remove(innerGlow);
            scene.remove(outerGlow);
            scene.remove(trail);
            return;
        }
        
        currentDistance += bulletSpeed;
        
        requestAnimationFrame(animateEnemyBullet);
    }
    
    animateEnemyBullet();
}

// Enhanced muzzle flash
function createEnemyMuzzleFlash(position) {
    const flashGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffa500,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    flash.position.y += 1.5;
    scene.add(flash);
    
    // Animated removal
    let opacity = 0.8;
    const fadeFlash = () => {
        opacity -= 0.1;
        flash.material.opacity = opacity;
        if (opacity > 0) {
            requestAnimationFrame(fadeFlash);
        } else {
            scene.remove(flash);
        }
    };
    fadeFlash();
}

// Step 1: Localized shot detection - triggered when any enemy is hit
function checkEnemyShotDetection(hitTarget = null) {
    let alertedGroups = [];
    
    if (hitTarget) {
        // If a specific target was hit, alert its group
        const groupId = hitTarget.userData.groupId;
        if (!alertedGroups.includes(groupId)) {
            alertedGroups.push(groupId);
            console.log(`🎯 Direct hit on Formation ${groupId} - all members alerted!`);
        }
        
        // Also alert nearby groups within 5 units of the hit target
        targets.forEach(enemy => {
            if (!enemy.userData || enemy === hitTarget) return;
            
            const distanceToHit = enemy.position.distanceTo(hitTarget.position);
            if (distanceToHit <= 5) {
                const nearbyGroupId = enemy.userData.groupId;
                if (!alertedGroups.includes(nearbyGroupId)) {
                    alertedGroups.push(nearbyGroupId);
                    console.log(`🎯 Formation ${nearbyGroupId} detected gunfire within 5 units - engaging!`);
                }
            }
        });
    } else {
        // No hit - just alert groups near player position (original logic)
        const playerPos = camera.position;
        targets.forEach(enemy => {
            if (!enemy.userData) return;
            
            const distanceToEnemy = enemy.position.distanceTo(playerPos);
            if (distanceToEnemy <= 5) {
                const groupId = enemy.userData.groupId;
                if (!alertedGroups.includes(groupId)) {
                    alertedGroups.push(groupId);
                    console.log(`🎯 Formation ${groupId} detected shots nearby - engaging!`);
                }
            }
        });
    }
    
    // Alert all identified groups
    alertedGroups.forEach(groupId => {
        const targetGroup = getEnemyGroup(groupId);
        
        if (targetGroup && !targetGroup.isAlerted) {
            // Alert this specific formation
            targetGroup.isAlerted = true;
            targetGroup.isEngaged = true;
            
            targetGroup.members.forEach(member => {
                if (member.userData) {
                    member.userData.beenShotAt = true;
                    member.userData.isAlerted = true;
                    member.userData.groupAlerted = true;
                    changeEnemyState(member, AI_STATES.RUSHING);
                }
            });
            
            console.log(`🚨 Formation ${groupId} rushing to combat range - ${targetGroup.members.length} combatants!`);
        }
    });
}

// Export functions for main game
window.AI = {
    spawnEnemyGroup,
    createEnemy,
    updateEnemyAI,
    checkEnemyShotDetection,
    createEnemyMuzzleFlash,
    createEnemyBullet,
    AI_CONFIG,
    AI_STATES,
    AI_COLORS
};

console.log('🤖 Advanced AI System loaded successfully!');
