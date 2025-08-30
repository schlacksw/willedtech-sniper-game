class FlashcardsApp {
    constructor() {
        this.currentSet = null;
        this.currentCardIndex = 0;
        this.isFlipped = false;
        this.editingCardIndex = -1;
        this.editingSetId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadSets();
        this.initializeWithSampleData();
        
        // Make this instance globally accessible
        window.app = this;
    }

    initializeElements() {
        // Main views
        this.setSelection = document.getElementById('setSelection');
        this.studyMode = document.getElementById('studyMode');
        
        // Set management
        this.setsList = document.getElementById('setsList');
        this.newSetBtn = document.getElementById('newSetBtn');
        this.manageSetsBtn = document.getElementById('manageSetsBtn');
        this.helpBtn = document.getElementById('helpBtn');
        
        // Study mode elements
        this.backToSetsBtn = document.getElementById('backToSetsBtn');
        this.currentSetName = document.getElementById('currentSetName');
        this.cardCounter = document.getElementById('cardCounter');
        this.progressFill = document.getElementById('progressFill');
        this.flashcard = document.getElementById('flashcard');
        this.frontText = document.getElementById('frontText');
        this.backText = document.getElementById('backText');
        
        // Study controls
        this.prevCard = document.getElementById('prevCard');
        this.nextCard = document.getElementById('nextCard');
        this.flipCard = document.getElementById('flipCard');
        this.shuffleCards = document.getElementById('shuffleCards');
        this.editCurrentCard = document.getElementById('editCurrentCard');
        this.addNewCard = document.getElementById('addNewCard');
        
        // Modals
        this.setModal = document.getElementById('setModal');
        this.cardModal = document.getElementById('cardModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.setName = document.getElementById('setName');
        this.setDescription = document.getElementById('setDescription');
        this.cardsList = document.getElementById('cardsList');
        this.addCardBtn = document.getElementById('addCardBtn');
        
        // Modal controls
        this.closeModal = document.getElementById('closeModal');
        this.closeCardModal = document.getElementById('closeCardModal');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveSetBtn = document.getElementById('saveSetBtn');
        this.cardFront = document.getElementById('cardFront');
        this.cardBack = document.getElementById('cardBack');
        this.saveCardBtn = document.getElementById('saveCardBtn');
        this.cancelCardBtn = document.getElementById('cancelCardBtn');
        this.deleteCardBtn = document.getElementById('deleteCardBtn');
    }

    attachEventListeners() {
        // Navigation
        this.newSetBtn.addEventListener('click', () => this.showNewSetModal());
        this.manageSetsBtn.addEventListener('click', () => this.showManageMode());
        this.backToSetsBtn.addEventListener('click', () => this.showSetSelection());
        this.helpBtn.addEventListener('click', () => this.showHelpModal());
        
        // Study controls
        this.flashcard.addEventListener('click', () => this.flipCardHandler());
        this.flipCard.addEventListener('click', () => this.flipCardHandler());
        this.prevCard.addEventListener('click', () => this.previousCard());
        this.nextCard.addEventListener('click', () => this.nextCard());
        this.shuffleCards.addEventListener('click', () => this.shuffleDeck());
        this.editCurrentCard.addEventListener('click', () => this.editCard(this.currentCardIndex));
        this.addNewCard.addEventListener('click', () => this.addNewCardToSet());
        
        // Modal controls
        this.closeModal.addEventListener('click', () => this.hideSetModal());
        this.closeCardModal.addEventListener('click', () => this.hideCardModal());
        this.cancelBtn.addEventListener('click', () => this.hideSetModal());
        this.saveSetBtn.addEventListener('click', () => this.saveSet());
        this.addCardBtn.addEventListener('click', () => this.addCardToEditor());
        
        // Card modal controls
        this.saveCardBtn.addEventListener('click', () => this.saveCard());
        this.cancelCardBtn.addEventListener('click', () => this.hideCardModal());
        this.deleteCardBtn.addEventListener('click', () => this.deleteCard());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Close modals on background click
        this.setModal.addEventListener('click', (e) => {
            if (e.target === this.setModal) this.hideSetModal();
        });
        this.cardModal.addEventListener('click', (e) => {
            if (e.target === this.cardModal) this.hideCardModal();
        });
    }

    // Data management
    loadSets() {
        const saved = localStorage.getItem('flashcardSets');
        return saved ? JSON.parse(saved) : {};
    }

    saveSets(sets) {
        localStorage.setItem('flashcardSets', JSON.stringify(sets));
    }

    initializeWithSampleData() {
        const sets = this.loadSets();
        if (Object.keys(sets).length === 0) {
            // Add sample data
            const sampleSets = {
                'spanish-basics': {
                    id: 'spanish-basics',
                    name: 'Spanish Basics',
                    description: 'Essential Spanish vocabulary for beginners',
                    cards: [
                        { front: 'Hello', back: 'Hola' },
                        { front: 'Goodbye', back: 'Adiós' },
                        { front: 'Please', back: 'Por favor' },
                        { front: 'Thank you', back: 'Gracias' },
                        { front: 'Yes', back: 'Sí' },
                        { front: 'No', back: 'No' },
                        { front: 'Water', back: 'Agua' },
                        { front: 'Food', back: 'Comida' }
                    ],
                    createdAt: new Date().toISOString(),
                    lastStudied: null
                },
                'programming-terms': {
                    id: 'programming-terms',
                    name: 'Programming Terms',
                    description: 'Common programming vocabulary',
                    cards: [
                        { front: 'What is a variable?', back: 'A storage location with an associated name that contains data' },
                        { front: 'What is a function?', back: 'A reusable block of code that performs a specific task' },
                        { front: 'What is an array?', back: 'A data structure that stores multiple values in a single variable' },
                        { front: 'What is a loop?', back: 'A programming construct that repeats a block of code' },
                        { front: 'What is debugging?', back: 'The process of finding and fixing errors in code' }
                    ],
                    createdAt: new Date().toISOString(),
                    lastStudied: null
                }
            };
            this.saveSets(sampleSets);
        }
        this.renderSets();
    }

    renderSets() {
        const sets = this.loadSets();
        this.setsList.innerHTML = '';
        
        if (Object.keys(sets).length === 0) {
            this.setsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <h3>No flashcard sets yet!</h3>
                    <p>Create your first set to start studying. Click the "+ New Set" button above to get started.</p>
                    <button class="btn btn-primary" onclick="window.app.showNewSetModal()">🚀 Create Your First Set</button>
                </div>
            `;
            return;
        }

        Object.values(sets).forEach(set => {
            const setCard = document.createElement('div');
            setCard.className = 'set-card';
            const cardCount = set.cards.length;
            const lastStudied = set.lastStudied ? new Date(set.lastStudied).toLocaleDateString() : 'Never';
            
            setCard.innerHTML = `
                <h3>${set.name}</h3>
                <p>${set.description || 'No description'}</p>
                <div class="card-count">📊 ${cardCount} card${cardCount !== 1 ? 's' : ''}</div>
                <div class="last-studied">🕒 Last studied: ${lastStudied}</div>
                <div class="set-actions">
                    <button class="btn btn-primary" data-action="study" data-set-id="${set.id}" title="Start studying this set">🎯 Study</button>
                    <button class="btn btn-secondary" data-action="edit" data-set-id="${set.id}" title="Edit this set">✏️ Edit</button>
                    <button class="btn btn-danger" data-action="delete" data-set-id="${set.id}" title="Delete this set">🗑️ Delete</button>
                </div>
            `;
            
            // Add event listeners to the buttons
            const studyBtn = setCard.querySelector('[data-action="study"]');
            const editBtn = setCard.querySelector('[data-action="edit"]');
            const deleteBtn = setCard.querySelector('[data-action="delete"]');
            
            studyBtn.addEventListener('click', () => this.startStudy(set.id));
            editBtn.addEventListener('click', () => this.editSet(set.id));
            deleteBtn.addEventListener('click', () => this.confirmDeleteSet(set.id));
            this.setsList.appendChild(setCard);
        });
    }

    // Set management
    showNewSetModal() {
        this.editingSetId = null;
        this.modalTitle.textContent = 'Create New Set';
        this.setName.value = '';
        this.setDescription.value = '';
        this.cardsList.innerHTML = '';
        this.addCardToEditor(); // Add one empty card
        this.showSetModal();
    }

    showSetModal() {
        this.setModal.classList.remove('hidden');
        this.setName.focus();
    }

    hideSetModal() {
        this.setModal.classList.add('hidden');
    }

    editSet(setId) {
        const sets = this.loadSets();
        const set = sets[setId];
        if (!set) return;

        this.editingSetId = setId;
        this.modalTitle.textContent = 'Edit Set';
        this.setName.value = set.name;
        this.setDescription.value = set.description || '';
        this.renderCardsInEditor(set.cards);
        this.showSetModal();
    }

    confirmDeleteSet(setId) {
        console.log('Delete button clicked for set:', setId);
        const sets = this.loadSets();
        const set = sets[setId];
        if (!set) {
            console.error('Set not found:', setId);
            this.showMessage('❌ Set not found', 'error');
            return;
        }

        const confirmed = confirm(`⚠️ Delete "${set.name}"?\n\nThis will permanently delete ${set.cards.length} card${set.cards.length !== 1 ? 's' : ''}.\n\nThis action cannot be undone.`);
        
        if (confirmed) {
            delete sets[setId];
            this.saveSets(sets);
            this.showMessage(`✅ Set "${set.name}" has been deleted.`, 'success');
            this.renderSets();
        }
    }

    saveSet() {
        const name = this.setName.value.trim();
        if (!name) {
            this.showMessage('⚠️ Please enter a set name', 'error');
            this.setName.focus();
            return;
        }

        const cards = this.getCardsFromEditor();
        if (cards.length === 0) {
            this.showMessage('⚠️ Please add at least one card before saving', 'error');
            return;
        }

        const sets = this.loadSets();
        const setId = this.editingSetId || this.generateId();
        
        sets[setId] = {
            id: setId,
            name: name,
            description: this.setDescription.value.trim(),
            cards: cards,
            createdAt: this.editingSetId ? sets[setId].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.saveSets(sets);
        this.renderSets();
        this.hideSetModal();
        
        const action = this.editingSetId ? 'updated' : 'created';
        this.showMessage(`✅ Set "${name}" has been ${action} successfully!`, 'success');
    }

    renderCardsInEditor(cards) {
        this.cardsList.innerHTML = '';
        cards.forEach((card, index) => {
            this.addCardToEditor(card.front, card.back);
        });
        if (cards.length === 0) {
            this.addCardToEditor();
        }
    }

    addCardToEditor(front = '', back = '') {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        cardDiv.innerHTML = `
            <div class="card-item-content">
                <div class="form-group">
                    <label>Front (Question):</label>
                    <textarea class="card-front-input" placeholder="Enter question or term">${front}</textarea>
                </div>
                <div class="form-group">
                    <label>Back (Answer):</label>
                    <textarea class="card-back-input" placeholder="Enter answer or definition">${back}</textarea>
                </div>
            </div>
            <div class="card-item-actions">
                <button class="btn btn-danger" onclick="window.app.removeCardFromEditor(this)">Remove</button>
            </div>
        `;
        this.cardsList.appendChild(cardDiv);
    }

    getCardsFromEditor() {
        const cardItems = this.cardsList.querySelectorAll('.card-item');
        const cards = [];
        
        cardItems.forEach(item => {
            const front = item.querySelector('.card-front-input').value.trim();
            const back = item.querySelector('.card-back-input').value.trim();
            if (front && back) {
                cards.push({ front, back });
            }
        });
        
        return cards;
    }

    // Study mode
    startStudy(setId) {
        const sets = this.loadSets();
        this.currentSet = sets[setId];
        if (!this.currentSet || this.currentSet.cards.length === 0) {
            this.showMessage('❌ This set has no cards to study', 'error');
            return;
        }
        
        // Update last studied timestamp
        this.currentSet.lastStudied = new Date().toISOString();
        sets[setId] = this.currentSet;
        this.saveSets(sets);

        this.currentCardIndex = 0;
        this.isFlipped = false;
        this.currentSetName.textContent = this.currentSet.name;
        this.showStudyMode();
        this.displayCurrentCard();
        this.updateProgress();
    }

    showStudyMode() {
        this.setSelection.classList.add('hidden');
        this.studyMode.classList.remove('hidden');
    }

    showSetSelection() {
        this.studyMode.classList.add('hidden');
        this.setSelection.classList.remove('hidden');
        this.renderSets();
    }

    displayCurrentCard() {
        if (!this.currentSet || this.currentSet.cards.length === 0) return;
        
        const card = this.currentSet.cards[this.currentCardIndex];
        this.frontText.textContent = card.front;
        this.backText.textContent = card.back;
        this.flashcard.classList.remove('flipped');
        this.isFlipped = false;
        this.updateNavigationButtons();
    }

    flipCardHandler() {
        this.flashcard.classList.toggle('flipped');
        this.isFlipped = !this.isFlipped;
    }

    nextCard() {
        if (!this.currentSet) return;
        if (this.currentCardIndex < this.currentSet.cards.length - 1) {
            this.currentCardIndex++;
        } else {
            this.currentCardIndex = 0; // Loop to beginning
        }
        this.displayCurrentCard();
        this.updateProgress();
    }

    previousCard() {
        if (!this.currentSet) return;
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
        } else {
            this.currentCardIndex = this.currentSet.cards.length - 1; // Loop to end
        }
        this.displayCurrentCard();
        this.updateProgress();
    }

    shuffleDeck() {
        if (!this.currentSet) return;
        // Fisher-Yates shuffle
        for (let i = this.currentSet.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentSet.cards[i], this.currentSet.cards[j]] = 
            [this.currentSet.cards[j], this.currentSet.cards[i]];
        }
        this.currentCardIndex = 0;
        this.displayCurrentCard();
        this.updateProgress();
        
        // Save shuffled order
        const sets = this.loadSets();
        sets[this.currentSet.id] = this.currentSet;
        this.saveSets(sets);
        
        this.showMessage('🔀 Cards shuffled!', 'info');
    }

    updateProgress() {
        if (!this.currentSet) return;
        const progress = ((this.currentCardIndex + 1) / this.currentSet.cards.length) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.cardCounter.textContent = `${this.currentCardIndex + 1} / ${this.currentSet.cards.length}`;
    }

    // Card editing
    editCard(cardIndex) {
        if (!this.currentSet || cardIndex < 0 || cardIndex >= this.currentSet.cards.length) return;
        
        this.editingCardIndex = cardIndex;
        const card = this.currentSet.cards[cardIndex];
        this.cardFront.value = card.front;
        this.cardBack.value = card.back;
        this.deleteCardBtn.style.display = 'inline-block';
        this.showCardModal();
    }

    addNewCardToSet() {
        this.editingCardIndex = -1;
        this.cardFront.value = '';
        this.cardBack.value = '';
        this.deleteCardBtn.style.display = 'none';
        this.showCardModal();
    }

    showCardModal() {
        this.cardModal.classList.remove('hidden');
        this.cardFront.focus();
    }

    hideCardModal() {
        this.cardModal.classList.add('hidden');
    }

    saveCard() {
        const front = this.cardFront.value.trim();
        const back = this.cardBack.value.trim();
        
        if (!front || !back) {
            this.showMessage('⚠️ Please fill in both sides of the card', 'error');
            if (!front) this.cardFront.focus();
            else this.cardBack.focus();
            return;
        }

        if (this.editingCardIndex >= 0) {
            // Edit existing card
            this.currentSet.cards[this.editingCardIndex] = { front, back };
        } else {
            // Add new card
            this.currentSet.cards.push({ front, back });
        }

        // Save to localStorage
        const sets = this.loadSets();
        sets[this.currentSet.id] = this.currentSet;
        this.saveSets(sets);

        this.displayCurrentCard();
        this.updateProgress();
        this.hideCardModal();
        
        const action = this.editingCardIndex >= 0 ? 'updated' : 'added';
        this.showMessage(`✅ Card ${action} successfully!`, 'success');
    }

    deleteCard() {
        if (this.editingCardIndex < 0 || !this.currentSet) return;
        
        const card = this.currentSet.cards[this.editingCardIndex];
        const confirmed = confirm(`⚠️ Delete this card?\n\nFront: "${card.front}"\nBack: "${card.back}"\n\nThis action cannot be undone.`);
        
        if (confirmed) {
            this.currentSet.cards.splice(this.editingCardIndex, 1);
            
            if (this.currentSet.cards.length === 0) {
                this.showMessage('📝 This set now has no cards. Returning to set selection.', 'info');
                this.showSetSelection();
                this.hideCardModal();
                return;
            }

            // Adjust current card index if necessary
            if (this.currentCardIndex >= this.currentSet.cards.length) {
                this.currentCardIndex = this.currentSet.cards.length - 1;
            }

            // Save to localStorage
            const sets = this.loadSets();
            sets[this.currentSet.id] = this.currentSet;
            this.saveSets(sets);

            this.displayCurrentCard();
            this.updateProgress();
            this.hideCardModal();
            this.showMessage('🗑️ Card deleted', 'info');
        }
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        if (this.setModal.classList.contains('hidden') && 
            this.cardModal.classList.contains('hidden') && 
            !this.studyMode.classList.contains('hidden')) {
            
            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    this.flipCardHandler();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousCard();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextCard();
                    break;
                case 'Escape':
                    this.showSetSelection();
                    break;
            }
        }
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showManageMode() {
        // For now, this is the same as showing set selection
        // Could be expanded to show additional management features
        this.showSetSelection();
    }
    
    // Help system
    showHelpModal() {
        const helpModal = document.createElement('div');
        helpModal.className = 'help-modal';
        helpModal.innerHTML = `
            <div class="help-content">
                <div class="modal-header">
                    <h3>🎓 Flash Cards Help</h3>
                    <button class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="help-section">
                    <h3>🚀 Getting Started</h3>
                    <p>Flash Cards helps you study more effectively with interactive flashcards. You can create custom sets, study existing ones, and track your progress.</p>
                </div>
                <div class="help-section">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <div class="help-shortcuts">
                        <div class="help-shortcut"><kbd>Space</kbd> <span>Flip card</span></div>
                        <div class="help-shortcut"><kbd>Enter</kbd> <span>Flip card</span></div>
                        <div class="help-shortcut"><kbd>←</kbd> <span>Previous card</span></div>
                        <div class="help-shortcut"><kbd>→</kbd> <span>Next card</span></div>
                        <div class="help-shortcut"><kbd>Esc</kbd> <span>Back to sets</span></div>
                    </div>
                </div>
                <div class="help-section">
                    <h3>📚 Study Tips</h3>
                    <ul style="margin-left: 20px; line-height: 1.6;">
                        <li>Study regularly for better retention</li>
                        <li>Use the shuffle feature to avoid memorizing order</li>
                        <li>Create concise, clear questions and answers</li>
                        <li>Review difficult cards more frequently</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>✨ Features</h3>
                    <ul style="margin-left: 20px; line-height: 1.6;">
                        <li><strong>Create Sets:</strong> Make custom flashcard collections</li>
                        <li><strong>Edit Cards:</strong> Modify cards while studying</li>
                        <li><strong>Progress Tracking:</strong> See your study progress</li>
                        <li><strong>Auto-Save:</strong> Your data is saved automatically</li>
                        <li><strong>Responsive:</strong> Works on desktop and mobile</li>
                    </ul>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">Got it! 👍</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpModal);
        
        // Close on background click
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.remove();
            }
        });
    }
    
    // Message system
    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Insert after header
        const header = document.querySelector('.header');
        header.insertAdjacentElement('afterend', messageDiv);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 4000);
    }
    
    // Helper function for removing cards from editor
    removeCardFromEditor(button) {
        const cardItem = button.closest('.card-item');
        if (cardItem) {
            cardItem.remove();
        }
    }
    
    // Disable/enable navigation buttons based on position
    updateNavigationButtons() {
        if (!this.currentSet) return;
        
        this.prevCard.disabled = this.currentCardIndex === 0;
        this.nextCard.disabled = this.currentCardIndex === this.currentSet.cards.length - 1;
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FlashcardsApp();
    // Ensure global access is immediately available
    window.app = app;
    console.log('FlashcardsApp initialized and made globally accessible');
});
