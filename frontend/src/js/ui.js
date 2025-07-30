// UI.js - User Interface management
import { gameEvents } from './utils.js';
import { TRINKET_TYPES, ELEMENTS } from './elements.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = this.initializeElements();
        this.selectedTowerType = null;
        this.isInitialized = false;
        
        this.setupEventListeners();
        this.setupGameEventListeners();
    }

    initializeElements() {
        return {
            // Header elements
            health: document.getElementById('health'),
            money: document.getElementById('money'),
            wave: document.getElementById('wave'),
            score: document.getElementById('score'),
            
            // Control buttons
            pauseBtn: document.getElementById('pause-btn'),
            speedBtn: document.getElementById('speed-btn'),
            nextWaveBtn: document.getElementById('next-wave-btn'),
            
            // Tower shop
            towerItems: document.querySelectorAll('.tower-item'),
            
            // Wave info
            currentWaveNumber: document.getElementById('current-wave-number'),
            enemiesLeft: document.getElementById('enemies-left'),
            waveProgressFill: document.getElementById('wave-progress-fill'),
            nextEnemies: document.getElementById('next-enemies'),
            
            // Wave countdown
            waveCountdown: document.getElementById('wave-countdown'),
            countdownTimer: document.getElementById('countdown-timer'),
            countdownBar: document.getElementById('countdown-bar'),
            
            // Tower details
            towerDetails: document.getElementById('tower-details'),
            selectedTowerIcon: document.getElementById('selected-tower-icon'),
            selectedTowerName: document.getElementById('selected-tower-name'),
            towerLevel: document.getElementById('tower-level'),
            towerDamage: document.getElementById('tower-damage'),
            towerRange: document.getElementById('tower-range'),
            towerSpeed: document.getElementById('tower-speed'),
            upgradeTowerBtn: document.getElementById('upgrade-tower-btn'),
            sellTowerBtn: document.getElementById('sell-tower-btn'),
            upgradeCost: document.getElementById('upgrade-cost'),
            sellValue: document.getElementById('sell-value'),
            
            // Trinket elements
            trinketSlots: document.querySelectorAll('.trinket-slot'),
            towerElementList: document.getElementById('tower-element-list'),
            
            // Trinket shop
            trinketShop: document.getElementById('trinket-shop'),
            trinketCategories: document.querySelectorAll('.trinket-category-btn'),
            trinketGrid: document.getElementById('trinket-grid'),
            
            // Statistics
            enemiesKilled: document.getElementById('enemies-killed'),
            totalDamage: document.getElementById('total-damage'),
            towersBuilt: document.getElementById('towers-built'),
            
            // Message overlay
            messageOverlay: document.getElementById('message-overlay'),
            messageTitle: document.getElementById('message-title'),
            messageText: document.getElementById('message-text'),
            restartBtn: document.getElementById('restart-btn'),
            menuBtn: document.getElementById('menu-btn'),
            
            // Loading screen
            loadingScreen: document.getElementById('loading-screen'),
            
            // Tower preview
            towerPreview: document.getElementById('tower-preview')
        };
    }

    setupEventListeners() {
        // Control buttons
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        this.elements.speedBtn.addEventListener('click', () => this.toggleSpeed());
        this.elements.nextWaveBtn.addEventListener('click', () => this.startNextWave());
        
        // Tower shop items
        this.elements.towerItems.forEach(item => {
            item.addEventListener('click', () => this.selectTowerType(item.dataset.tower));
        });
        
        // Tower control buttons
        this.elements.upgradeTowerBtn.addEventListener('click', () => this.upgradeTower());
        this.elements.sellTowerBtn.addEventListener('click', () => this.sellTower());
        
        // Trinket system
        this.elements.trinketSlots.forEach(slot => {
            slot.addEventListener('click', () => this.openTrinketModal(slot.dataset.slot));
        });
        
        this.elements.trinketCategories.forEach(btn => {
            btn.addEventListener('click', () => this.filterTrinkets(btn.dataset.category));
        });
        
        // Message overlay buttons
        this.elements.restartBtn.addEventListener('click', () => this.restartGame());
        this.elements.menuBtn.addEventListener('click', () => this.showMainMenu());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Prevent context menu on canvas
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setupGameEventListeners() {
        // Game state events
        gameEvents.on('gameStarted', () => this.onGameStarted());
        gameEvents.on('gameOver', (data) => this.onGameOver(data));
        gameEvents.on('gameCompleted', () => this.onGameCompleted());
        
        // Wave events
        gameEvents.on('waveStarted', (wave) => this.onWaveStarted(wave));
        gameEvents.on('waveCompleted', (wave) => this.onWaveCompleted(wave));
        gameEvents.on('wavePreparation', (data) => this.onWavePreparation(data));
        gameEvents.on('showCountdownUI', (data) => this.showWaveCountdown(data));
        gameEvents.on('updateCountdownUI', (data) => this.updateWaveCountdown(data));
        
        // Enemy events
        gameEvents.on('enemyKilled', (enemy) => this.onEnemyKilled(enemy));
        gameEvents.on('enemyRotated', (enemy) => this.onEnemyRotated(enemy));
        gameEvents.on('enemyRotatedToStart', (enemy) => this.onEnemyRotatedToStart(enemy));
        
        // Tower events
        gameEvents.on('towerPlaced', (tower) => this.onTowerPlaced(tower));
        gameEvents.on('towerSelected', (tower) => this.onTowerSelected(tower));
        gameEvents.on('towerDeselected', () => this.onTowerDeselected());
        gameEvents.on('towerUpgraded', (tower) => this.onTowerUpgraded(tower));
        gameEvents.on('towerSold', (tower) => this.onTowerSold(tower));
        
        // Resource events
        gameEvents.on('moneyChanged', (amount) => this.updateMoney(amount));
        gameEvents.on('healthChanged', (health) => this.updateHealth(health));
        gameEvents.on('scoreChanged', (score) => this.updateScore(score));
    }

    handleKeyPress(event) {
        switch (event.key.toLowerCase()) {
            case ' ':
                event.preventDefault();
                this.togglePause();
                break;
            case 'escape':
                this.deselectTower();
                this.game.towerManager.exitPlacementMode();
                break;
            case '1':
                this.selectTowerType('basic');
                break;
            case '2':
                this.selectTowerType('splash');
                break;
            case '3':
                this.selectTowerType('poison');
                break;
            case '4':
                this.selectTowerType('sniper');
                break;
            case 'u':
                if (this.game.towerManager.selectedTower) {
                    this.upgradeTower();
                }
                break;
            case 's':
                if (this.game.towerManager.selectedTower) {
                    this.sellTower();
                }
                break;
            case 'n':
                this.startNextWave();
                break;
        }
    }

    selectTowerType(towerType) {
        // Clear previous selection
        this.elements.towerItems.forEach(item => item.classList.remove('selected'));
        
        // Check if we can afford this tower
        const towerStats = this.game.towerManager.getTowerStats(towerType);
        if (this.game.getMoney() < towerStats.cost) {
            this.showMessage('Not enough money!', 'warning');
            return;
        }
        
        // Select new tower type
        this.selectedTowerType = towerType;
        
        // Update UI
        const selectedItem = document.querySelector(`[data-tower="${towerType}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Enter placement mode
        this.game.towerManager.enterPlacementMode(towerType);
        
        // Hide tower details
        this.hideTowerDetails();
    }

    deselectTower() {
        this.selectedTowerType = null;
        this.elements.towerItems.forEach(item => item.classList.remove('selected'));
        this.game.towerManager.exitPlacementMode();
    }

    togglePause() {
        this.game.togglePause();
        this.elements.pauseBtn.textContent = this.game.isPaused ? '▶️' : '⏸️';
    }

    toggleSpeed() {
        const newSpeed = this.game.toggleSpeed();
        this.elements.speedBtn.textContent = `${newSpeed}x`;
        this.elements.speedBtn.dataset.speed = newSpeed;
    }

    startNextWave() {
        if (this.game.waveManager.canStartNextWave()) {
            this.game.waveManager.forceNextWave();
        }
    }

    upgradeTower() {
        const tower = this.game.towerManager.selectedTower;
        if (tower && tower.canUpgrade()) {
            if (this.game.towerManager.upgradeTower(tower)) {
                this.updateTowerDetails(tower);
                this.updateTowerShop();
            }
        }
    }

    sellTower() {
        const tower = this.game.towerManager.selectedTower;
        if (tower) {
            this.game.towerManager.sellTower(tower);
            this.hideTowerDetails();
        }
    }

    updateHealth(health) {
        this.elements.health.textContent = health;
        
        // Add visual feedback for low health
        if (health <= 5) {
            this.elements.health.style.color = '#F44336';
            this.elements.health.style.animation = 'pulse 1s infinite';
        } else {
            this.elements.health.style.color = '';
            this.elements.health.style.animation = '';
        }
    }

    updateMoney(money) {
        this.elements.money.textContent = money;
        this.updateTowerShop();
    }

    updateScore(score) {
        this.elements.score.textContent = score;
    }

    updateWave(wave) {
        this.elements.wave.textContent = wave;
        this.elements.currentWaveNumber.textContent = wave;
    }

    updateTowerShop() {
        this.elements.towerItems.forEach(item => {
            const towerType = item.dataset.tower;
            const towerStats = this.game.towerManager.getTowerStats(towerType);
            const canAfford = this.game.getMoney() >= towerStats.cost;
            
            item.classList.toggle('disabled', !canAfford);
        });
    }

    updateWaveProgress() {
        const progress = this.game.waveManager.getWaveProgress();
        const enemiesLeft = this.game.waveManager.getEnemiesLeft();
        
        this.elements.waveProgressFill.style.width = `${progress * 100}%`;
        this.elements.enemiesLeft.textContent = enemiesLeft;
    }

    updateNextWavePreview() {
        const preview = this.game.waveManager.getNextWavePreview();
        this.elements.nextEnemies.innerHTML = '';
        
        if (preview) {
            const enemyEmojis = {
                'basic': '🐛',
                'fast': '🦎',
                'heavy': '🐢',
                'flying': '🦋',
                'regenerating': '🦠',
                'boss': '👹',
                'mini_boss': '🎃'
            };
            
            for (const [enemyType, count] of Object.entries(preview.enemies)) {
                const enemyElement = document.createElement('div');
                enemyElement.className = 'enemy-icon';
                enemyElement.innerHTML = `${enemyEmojis[enemyType] || '🐛'}<span class="enemy-count">${count}</span>`;
                enemyElement.title = `${enemyType}: ${count}`;
                this.elements.nextEnemies.appendChild(enemyElement);
            }
        }
    }

    showTowerDetails(tower) {
        const stats = tower.getStats();
        
        this.elements.selectedTowerIcon.textContent = tower.emoji;
        this.elements.selectedTowerName.textContent = this.getTowerDisplayName(tower.type);
        this.elements.towerLevel.textContent = stats.level;
        this.elements.towerDamage.textContent = stats.damage;
        this.elements.towerRange.textContent = stats.range;
        this.elements.towerSpeed.textContent = `${(1/stats.fireRate).toFixed(1)}s`;
        this.elements.upgradeCost.textContent = stats.upgradeCost;
        this.elements.sellValue.textContent = stats.sellValue;
        
        // Update button states
        this.elements.upgradeTowerBtn.disabled = !stats.canUpgrade || this.game.getMoney() < stats.upgradeCost;
        this.elements.sellTowerBtn.disabled = false;
        
        if (stats.level >= 3) {
            this.elements.upgradeTowerBtn.textContent = 'MAX LEVEL';
            this.elements.upgradeTowerBtn.disabled = true;
        } else {
            this.elements.upgradeTowerBtn.innerHTML = `
                <span class="btn-icon">⬆️</span>
                <span class="btn-text">Upgrade</span>
                <span class="btn-cost">💰 <span>${stats.upgradeCost}</span></span>
            `;
        }
        
        this.elements.towerDetails.classList.remove('hidden');
        
        // Update trinkets and elements
        this.updateTowerTrinkets(tower);
    }

    hideTowerDetails() {
        this.elements.towerDetails.classList.add('hidden');
    }

    updateTowerDetails(tower) {
        if (this.game.towerManager.selectedTower === tower) {
            this.showTowerDetails(tower);
        }
    }

    getTowerDisplayName(type) {
        const names = {
            'basic': 'Spore Shooter',
            'splash': 'Boom Mushroom',
            'poison': 'Toxic Spore',
            'sniper': 'Laser Bloom'
        };
        return names[type] || type;
    }

    updateStatistics() {
        const gameStats = this.game.getStatistics();
        
        this.elements.enemiesKilled.textContent = gameStats.enemiesKilled;
        this.elements.totalDamage.textContent = gameStats.totalDamage;
        this.elements.towersBuilt.textContent = gameStats.towersBuilt;
    }

    showMessage(title, type = 'info', textOrDuration = '', buttons = []) {
        // Handle the case where the third parameter is a duration (number)
        let text = '';
        let duration = 3000;
        
        if (typeof textOrDuration === 'number') {
            duration = textOrDuration;
        } else if (typeof textOrDuration === 'string') {
            text = textOrDuration;
        }
        
        // Simple message display for quick feedback
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-popup ${type}`;
        messageDiv.textContent = title;
        messageDiv.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'warning' ? '#FF9800' : type === 'info' ? '#2196F3' : '#4CAF50'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1000;
            animation: messageSlide ${duration/1000}s ease-out forwards;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, duration);
    }

    showGameOverScreen(reason, score) {
        this.elements.messageTitle.textContent = 'Game Over';
        this.elements.messageText.textContent = `${reason}\nFinal Score: ${score}`;
        this.elements.messageOverlay.classList.remove('hidden');
    }

    showVictoryScreen(score) {
        this.elements.messageTitle.textContent = 'Victory!';
        this.elements.messageText.textContent = `Congratulations! You defended the mushroom colony!\nFinal Score: ${score}`;
        this.elements.messageOverlay.classList.remove('hidden');
    }

    hideMessageOverlay() {
        this.elements.messageOverlay.classList.add('hidden');
    }

    showLoadingScreen() {
        this.elements.loadingScreen.classList.remove('hidden');
    }

    hideLoadingScreen() {
        this.elements.loadingScreen.classList.add('hidden');
    }

    restartGame() {
        this.hideMessageOverlay();
        this.game.restart();
    }

    showMainMenu() {
        this.hideMessageOverlay();
        // This would typically navigate to a main menu
        this.game.restart();
    }

    // Game event handlers
    onGameStarted() {
        this.hideLoadingScreen();
        this.updateMoney(this.game.getMoney());
        this.updateHealth(this.game.getHealth());
        this.updateScore(0);
        this.updateWave(1);
        this.updateTowerShop();
        this.updateNextWavePreview();
    }

    onGameOver(data) {
        this.showGameOverScreen(data.reason, data.score);
    }

    onGameCompleted() {
        this.showVictoryScreen(this.game.getScore());
    }

    onWaveStarted(wave) {
        this.updateWave(wave);
        this.elements.nextWaveBtn.disabled = true;
        this.elements.nextWaveBtn.textContent = 'Wave Active';
    }

    onWaveCompleted(wave) {
        this.elements.nextWaveBtn.disabled = false;
        this.elements.nextWaveBtn.textContent = 'Next Wave';
        this.updateNextWavePreview();
        this.showMessage(`Wave ${wave} Complete!`, 'success');
    }

    onWavePreparation(data) {
        this.showMessage(`Wave ${data.wave} incoming!`, 'warning');
        // Could show countdown timer here
    }

    onEnemyKilled(enemy) {
        this.updateStatistics();
        // Could show floating damage numbers here
    }

    onEnemyRotated(enemy) {
        // Visual feedback for enemy rotating back to start
        this.showMessage('Enemy rotated back to start!', 'info', 1000);
    }

    onEnemyRotatedToStart(enemy) {
        // Additional feedback when enemy reaches start after rotation
        this.addFloatingText(enemy.position, '+ROTATE', '#FFD700');
    }

    onTowerPlaced(tower) {
        this.deselectTower();
        this.updateTowerShop();
        this.updateStatistics();
        this.showMessage(`${this.getTowerDisplayName(tower.type)} placed!`, 'success');
    }

    onTowerSelected(tower) {
        this.showTowerDetails(tower);
    }

    onTowerDeselected() {
        this.hideTowerDetails();
    }

    onTowerUpgraded(tower) {
        this.showMessage(`${this.getTowerDisplayName(tower.type)} upgraded!`, 'success');
        this.updateTowerShop();
    }

    onTowerSold(tower) {
        this.showMessage(`${this.getTowerDisplayName(tower.type)} sold!`, 'info');
        this.updateTowerShop();
    }

    // Main update method
    update() {
        if (!this.isInitialized) return;
        
        this.updateWaveProgress();
        this.updateStatistics();
        
        // Update next wave button state
        this.elements.nextWaveBtn.disabled = !this.game.waveManager.canStartNextWave();
        
        // Update countdown display
        this.updateCountdownDisplay();
    }

    // Wave countdown methods
    showWaveCountdown(data) {
        if (this.elements.waveCountdown) {
            this.elements.waveCountdown.style.display = 'block';
            if (this.elements.countdownTimer) {
                this.elements.countdownTimer.textContent = Math.ceil(data.duration);
            }
        }
    }

    updateWaveCountdown(data) {
        if (this.elements.countdownTimer) {
            this.elements.countdownTimer.textContent = Math.ceil(data.timeLeft);
        }
        if (this.elements.countdownBar) {
            const percentage = (data.timeLeft / 5.0) * 100; // 5 seconds total
            this.elements.countdownBar.style.width = `${percentage}%`;
        }
        
        if (data.timeLeft <= 0) {
            this.hideWaveCountdown();
        }
    }

    hideWaveCountdown() {
        if (this.elements.waveCountdown) {
            this.elements.waveCountdown.style.display = 'none';
        }
    }

    updateCountdownDisplay() {
        const countdownStatus = this.game.waveManager.getCountdownStatus();
        if (countdownStatus && countdownStatus.isActive) {
            this.updateWaveCountdown(countdownStatus);
        }
    }

    addFloatingText(position, text, color) {
        // Create floating text element (placeholder for now)
        // This would need a more sophisticated floating text system
        console.log(`Floating text at (${position.x}, ${position.y}): ${text}`);
    }

    initialize() {
        this.isInitialized = true;
        this.showLoadingScreen();
        
        // Initialize trinket shop
        this.populateTrinketShop();
        
        // Add CSS for message animations if not already present
        if (!document.getElementById('ui-animations')) {
            const style = document.createElement('style');
            style.id = 'ui-animations';
            style.textContent = `
                @keyframes messageSlide {
                    0% { opacity: 0; transform: translate(-50%, -20px); }
                    10% { opacity: 1; transform: translate(-50%, 0); }
                    90% { opacity: 1; transform: translate(-50%, 0); }
                    100% { opacity: 0; transform: translate(-50%, -20px); }
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                .enemy-count {
                    font-size: 0.8em;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 5px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Trinket System Methods
    populateTrinketShop() {
        const trinketGrid = this.elements.trinketGrid;
        trinketGrid.innerHTML = '';

        Object.entries(TRINKET_TYPES).forEach(([key, trinket]) => {
            const trinketElement = this.createTrinketElement(key, trinket);
            trinketGrid.appendChild(trinketElement);
        });
    }

    createTrinketElement(key, trinket) {
        const trinketDiv = document.createElement('div');
        trinketDiv.className = 'trinket-item';
        trinketDiv.dataset.trinket = key;
        trinketDiv.dataset.category = trinket.type;

        const affordable = this.game.currency >= trinket.cost;
        if (affordable) {
            trinketDiv.classList.add('affordable');
        }

        trinketDiv.innerHTML = `
            <div class="trinket-rarity ${trinket.rarity}">${trinket.rarity}</div>
            <div class="trinket-header">
                <span class="trinket-icon">${trinket.emoji}</span>
                <span class="trinket-name">${trinket.name}</span>
            </div>
            <div class="trinket-description">${trinket.description}</div>
            <div class="trinket-cost">💰 ${trinket.cost}</div>
        `;

        trinketDiv.addEventListener('click', () => this.purchaseTrinket(key, trinket));
        return trinketDiv;
    }

    filterTrinkets(category) {
        // Update active category button
        this.elements.trinketCategories.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Filter trinket items
        const trinketItems = this.elements.trinketGrid.querySelectorAll('.trinket-item');
        trinketItems.forEach(item => {
            const itemCategory = item.dataset.category;
            const shouldShow = category === 'all' || itemCategory === category;
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    openTrinketModal(slotIndex) {
        if (!this.game.selectedTower) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'trinket-modal';
        modal.innerHTML = `
            <div class="trinket-modal-content">
                <h3>🔮 Select Trinket for Slot ${parseInt(slotIndex) + 1}</h3>
                <div class="trinket-categories">
                    <button class="trinket-category-btn active" data-category="all">All</button>
                    <button class="trinket-category-btn" data-category="damage">Damage</button>
                    <button class="trinket-category-btn" data-category="speed">Speed</button>
                    <button class="trinket-category-btn" data-category="range">Range</button>
                    <button class="trinket-category-btn" data-category="elemental">Elemental</button>
                </div>
                <div class="trinket-grid" id="modal-trinket-grid"></div>
                <button id="close-trinket-modal" style="margin-top: 15px; padding: 10px 20px; background: #666; border: none; border-radius: 4px; color: white; cursor: pointer;">Cancel</button>
            </div>
        `;

        // Populate modal trinket grid
        const modalGrid = modal.querySelector('#modal-trinket-grid');
        Object.entries(TRINKET_TYPES).forEach(([key, trinket]) => {
            const trinketElement = this.createTrinketElement(key, trinket);
            trinketElement.addEventListener('click', () => {
                this.equipTrinket(slotIndex, key, trinket);
                document.body.removeChild(modal);
            });
            modalGrid.appendChild(trinketElement);
        });

        // Setup modal event listeners
        const categoryBtns = modal.querySelectorAll('.trinket-category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                const trinketItems = modalGrid.querySelectorAll('.trinket-item');
                trinketItems.forEach(item => {
                    const itemCategory = item.dataset.category;
                    const shouldShow = category === 'all' || itemCategory === category;
                    item.style.display = shouldShow ? 'flex' : 'none';
                });
            });
        });

        modal.querySelector('#close-trinket-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    equipTrinket(slotIndex, trinketKey, trinket) {
        if (!this.game.selectedTower) return;
        if (this.game.currency < trinket.cost) {
            this.showMessage('Not enough money!', 'error');
            return;
        }

        // Deduct cost and equip trinket
        this.game.currency -= trinket.cost;
        this.game.selectedTower.equipTrinket(parseInt(slotIndex), trinketKey, trinket);
        
        // Update UI
        this.updateTowerDetails(this.game.selectedTower);
        this.updateUI();
        this.showMessage(`Equipped ${trinket.name}!`, 'success');
    }

    purchaseTrinket(key, trinket) {
        // This method can be used for direct trinket purchases if needed
        // For now, trinkets are equipped through the modal system
    }

    updateTowerTrinkets(tower) {
        if (!tower) return;

        // Update trinket slots
        this.elements.trinketSlots.forEach((slot, index) => {
            const trinket = tower.trinkets[index];
            if (trinket) {
                slot.classList.add('filled');
                slot.querySelector('.slot-icon').textContent = trinket.emoji;
                slot.querySelector('.slot-text').textContent = trinket.name;
            } else {
                slot.classList.remove('filled');
                slot.querySelector('.slot-icon').textContent = '➕';
                slot.querySelector('.slot-text').textContent = 'Empty';
            }
        });

        // Update elements display
        this.updateTowerElements(tower);
    }

    updateTowerElements(tower) {
        const elementList = this.elements.towerElementList;
        elementList.innerHTML = '';

        if (tower.elements && tower.elements.length > 0) {
            tower.elements.forEach(elementKey => {
                const element = ELEMENTS[elementKey];
                if (element) {
                    const badge = document.createElement('span');
                    badge.className = `element-badge ${elementKey.toLowerCase()}`;
                    badge.innerHTML = `${element.emoji} ${element.name}`;
                    elementList.appendChild(badge);
                }
            });
        } else {
            elementList.innerHTML = '<span class="no-elements">No elements</span>';
        }
    }
}
