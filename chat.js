// AI Chat Control System for 3D Sniper Game

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

// Initialize chat system
function initChatSystem() {
    console.log('Initializing AI Chat Control System...');
    
    // Event listeners
    chatSendBtn.addEventListener('click', handleChatCommand);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChatCommand();
        }
    });
    
    // Add welcome message
    addChatMessage('AI COMMAND CENTER', 'ai');
    addChatMessage('Available commands: spawn, attack, cover, patrol, status', 'ai');
}

// Add message to chat history
function addChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.textContent = text;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Handle chat command input
function handleChatCommand() {
    const command = chatInput.value.trim().toLowerCase();
    if (!command) return;
    
    // Add user message to chat
    addChatMessage(command, 'user');
    chatInput.value = '';
    
    // Process command
    processAICommand(command);
}

// Process AI command
function processAICommand(command) {
    console.log(`Processing AI command: ${command}`);
    
    // Check if AI system is available
    if (!window.AI) {
        addChatMessage('AI system not available', 'ai');
        return;
    }
    
    // Command processing logic
    if (command.includes('spawn')) {
        // Spawn a new enemy group
        AI.spawnEnemyGroup();
        addChatMessage('Spawning new enemy formation!', 'ai');
    } 
    else if (command.includes('attack') || command.includes('engage')) {
        // Alert all existing groups to attack
        if (window.enemyGroups && enemyGroups.length > 0) {
            enemyGroups.forEach(group => {
                AI.alertGroup(group.id);
            });
            addChatMessage('All formations engaging player!', 'ai');
        } else {
            addChatMessage('No enemy formations detected', 'ai');
        }
    }
    else if (command.includes('cover') || command.includes('hide')) {
        // Command all enemies to take cover
        if (window.targets && targets.length > 0) {
            targets.forEach(enemy => {
                if (enemy.userData) {
                    AI.changeEnemyState(enemy, AI.AI_STATES.TAKING_COVER);
                }
            });
            addChatMessage('All enemies taking cover!', 'ai');
        } else {
            addChatMessage('No enemies detected', 'ai');
        }
    }
    else if (command.includes('patrol') || command.includes('idle')) {
        // Command all enemies to patrol
        if (window.targets && targets.length > 0) {
            targets.forEach(enemy => {
                if (enemy.userData) {
                    AI.changeEnemyState(enemy, AI.AI_STATES.PATROLLING);
                    enemy.userData.isAlerted = false;
                    enemy.userData.groupAlerted = false;
                }
            });
            // Reset group alerted status
            if (window.enemyGroups) {
                enemyGroups.forEach(group => {
                    group.isAlerted = false;
                    group.isEngaged = false;
                });
            }
            addChatMessage('All enemies returning to patrol mode', 'ai');
        } else {
            addChatMessage('No enemies detected', 'ai');
        }
    }
    else if (command.includes('status') || command.includes('report')) {
        // Report current AI status
        if (window.enemyGroups) {
            const activeGroups = enemyGroups.length;
            const totalEnemies = targets.length;
            addChatMessage(`Active formations: ${activeGroups} | Total enemies: ${totalEnemies}`, 'ai');
            
            if (activeGroups > 0) {
                enemyGroups.forEach(group => {
                    const alerted = group.isAlerted ? 'ALERTED' : 'PATROLLING';
                    addChatMessage(`Formation ${group.id}: ${alerted} (${group.members.length} members)`, 'ai');
                });
            }
        } else {
            addChatMessage('AI system not initialized', 'ai');
        }
    }
    else if (command.includes('help')) {
        // Show help message
        addChatMessage('Available commands: spawn, attack, cover, patrol, status', 'ai');
    }
    else {
        // Unknown command
        addChatMessage('Unknown command. Type "help" for available commands.', 'ai');
    }
}

// Export functions
window.initChatSystem = initChatSystem;
window.addChatMessage = addChatMessage;

console.log('AI Chat Control System loaded successfully!');
