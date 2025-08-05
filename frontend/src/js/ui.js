// UI.js - User Interface management
console.log('Loading ui.js module...');

import { gameEvents } from './utils.js';
import { GEM_TYPES, ELEMENTS } from './elements.js';
import { MAPS } from './maps.js';

console.log('UI imports loaded successfully!');

export class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = this.initializeElements();
        this.selectedTowerType = null;
        this.isInitialized = false;
        
    this.setupEventListeners();
    this.setupGameEventListeners();
    this.setupMapGallery();
    }

    /**
     * Setup the map gallery modal and event listeners
     */
    setupMapGallery() {
        this.mapGalleryModal = document.getElementById('map-gallery-modal');
        this.mapGalleryList = document.getElementById('map-gallery-list');
        this.openMapGalleryBtn = document.getElementById('open-map-gallery');
        this.closeMapGalleryBtn = document.getElementById('close-map-gallery');

        if (this.openMapGalleryBtn) {
            this.openMapGalleryBtn.addEventListener('click', () => this.showMapGallery());
        }
        if (this.closeMapGalleryBtn) {
            this.closeMapGalleryBtn.addEventListener('click', () => this.hideMapGallery());
        }
        // Render gallery content
        this.renderMapGallery();
    }

    /**
     * Render the map gallery as a grid of cards
     */
    renderMapGallery() {
        if (!this.mapGalleryList) return;
        this.mapGalleryList.innerHTML = '';
    MAPS.forEach((map, idx) => {
            const card = document.createElement('div');
            card.className = 'map-card';
            card.style.background = '#333';
            card.style.borderRadius = '12px';
            card.style.padding = '20px';
            card.style.width = '220px';
            card.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.transition = 'transform 0.2s';
            card.style.cursor = 'pointer';
            card.onmouseover = () => card.style.transform = 'scale(1.04)';
            card.onmouseout = () => card.style.transform = 'scale(1)';

            // Map name
            const name = document.createElement('div');
            name.innerText = map.name;
            name.style.fontWeight = 'bold';
            name.style.fontSize = '1.2em';
            name.style.color = '#fff';
            name.style.marginBottom = '10px';
            card.appendChild(name);

            // Approach zone info
            const approach = document.createElement('div');
            approach.innerText = `Approach Zone: ${map.approachZoneWidth}`;
            approach.style.color = '#bbb';
            approach.style.fontSize = '0.95em';
            card.appendChild(approach);

            // Path preview (simple SVG)
            const preview = document.createElement('div');
            preview.style.margin = '12px 0';
            preview.innerHTML = this.generateMapPreviewSVG(map);
            card.appendChild(preview);

            // Select button
            const selectBtn = document.createElement('button');
            selectBtn.innerText = 'Select';
            selectBtn.style.marginTop = '10px';
            selectBtn.style.padding = '8px 18px';
            selectBtn.style.borderRadius = '6px';
            selectBtn.style.border = 'none';
            selectBtn.style.background = '#4caf50';
            selectBtn.style.color = '#fff';
            selectBtn.style.fontWeight = 'bold';
            selectBtn.style.cursor = 'pointer';
            selectBtn.onclick = () => {
                this.selectMap(map);
            };
            card.appendChild(selectBtn);

            this.mapGalleryList.appendChild(card);
        });
    }

    /**
     * Generate a simple SVG preview for a map
     */
    generateMapPreviewSVG(map) {
        // Simple grid preview: 25x15 grid, scale to 180x90px
        const gridW = 25, gridH = 15, pxW = 180, pxH = 90;
        const scaleX = pxW / gridW, scaleY = pxH / gridH;
        let svg = `<svg width="${pxW}" height="${pxH}" style='background:#222;border-radius:8px;'>`;
        // Draw approach zone
        svg += `<rect x='0' y='0' width='${map.approachZoneWidth * scaleX}' height='${pxH}' fill='#555'/>`;
        // Draw path
        if (map.path && map.path.length > 1) {
            svg += `<polyline points='` + map.path.map(p => `${p.x * scaleX},${p.y * scaleY}`).join(' ') + `' stroke='#ff0' stroke-width='3' fill='none'/>`;
            // Draw path points
            map.path.forEach(p => {
                svg += `<circle cx='${p.x * scaleX}' cy='${p.y * scaleY}' r='3' fill='#ff0'/>`;
            });
        }
        svg += `</svg>`;
        return svg;
    }

    /**
     * Show the map gallery modal
     */
    showMapGallery() {
        if (this.mapGalleryModal) {
            this.renderMapGallery();
            this.mapGalleryModal.classList.remove('hidden');
        }
    }

    /**
     * Hide the map gallery modal
     */
    hideMapGallery() {
        if (this.mapGalleryModal) {
            this.mapGalleryModal.classList.add('hidden');
        }
    }

    /**
     * Handle map selection: generate map and hide modal
     */
    selectMap(map) {
        if (window.startGameWithMap) {
            window.startGameWithMap(map);
        } else if (this.game && typeof this.game.generateMap === 'function') {
            this.game.generateMap(map);
        }
        this.hideMapGallery();
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
            
            // Gem system elements (only gem slots for towers)
            gemSlots: document.querySelectorAll('.gem-slot'),
            towerElementList: document.getElementById('tower-element-list'),
            
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
        
        // Gem system
        this.elements.gemSlots.forEach(slot => {
            slot.addEventListener('click', () => this.openGemModal(slot.dataset.slot));
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
        // Store event handlers for cleanup
        this.eventHandlers = {
            onGameStarted: () => this.onGameStarted(),
            onGameOver: (data) => this.onGameOver(data),
            onGameCompleted: () => this.onGameCompleted(),
            onWaveStarted: (wave) => this.onWaveStarted(wave),
            onWaveCompleted: (wave) => this.onWaveCompleted(wave),
            onWavePreparation: (data) => this.onWavePreparation(data),
            showCountdownUI: (data) => this.showWaveCountdown(data),
            updateCountdownUI: (data) => this.updateWaveCountdown(data),
            onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
            onEnemyRotated: (enemy) => this.onEnemyRotated(enemy),
            onEnemyRotatedToStart: (enemy) => this.onEnemyRotatedToStart(enemy),
            onTowerPlaced: (tower) => this.onTowerPlaced(tower),
            onTowerSelected: (tower) => this.onTowerSelected(tower),
            onTowerDeselected: () => this.onTowerDeselected(),
            onTowerUpgraded: (tower) => this.onTowerUpgraded(tower),
            onTowerSold: (tower) => this.onTowerSold(tower),
            updateMoney: (amount) => this.updateMoney(amount),
            updateHealth: (health) => this.updateHealth(health),
            updateScore: (score) => this.updateScore(score)
        };
        
        // Game state events
        gameEvents.on('gameStarted', this.eventHandlers.onGameStarted);
        gameEvents.on('gameOver', this.eventHandlers.onGameOver);
        gameEvents.on('gameCompleted', this.eventHandlers.onGameCompleted);
        
        // Wave events
        gameEvents.on('waveStarted', this.eventHandlers.onWaveStarted);
        gameEvents.on('waveCompleted', this.eventHandlers.onWaveCompleted);
        gameEvents.on('wavePreparation', this.eventHandlers.onWavePreparation);
        gameEvents.on('showCountdownUI', this.eventHandlers.showCountdownUI);
        gameEvents.on('updateCountdownUI', this.eventHandlers.updateCountdownUI);
        
        // Enemy events
        gameEvents.on('enemyKilled', this.eventHandlers.onEnemyKilled);
        gameEvents.on('enemyRotated', this.eventHandlers.onEnemyRotated);
        gameEvents.on('enemyRotatedToStart', this.eventHandlers.onEnemyRotatedToStart);
        
        // Tower events
        gameEvents.on('towerPlaced', this.eventHandlers.onTowerPlaced);
        gameEvents.on('towerSelected', this.eventHandlers.onTowerSelected);
        gameEvents.on('towerDeselected', this.eventHandlers.onTowerDeselected);
        gameEvents.on('towerUpgraded', this.eventHandlers.onTowerUpgraded);
        gameEvents.on('towerSold', this.eventHandlers.onTowerSold);
        
        // Resource events
        gameEvents.on('moneyChanged', this.eventHandlers.updateMoney);
        gameEvents.on('healthChanged', this.eventHandlers.updateHealth);
        gameEvents.on('scoreChanged', this.eventHandlers.updateScore);
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

    updatePauseButton() {
        this.elements.pauseBtn.textContent = this.game.isPaused ? '▶️' : '⏸️';
    }

    toggleSpeed() {
        const newSpeed = this.game.toggleSpeed();
        this.elements.speedBtn.textContent = `${newSpeed}x`;
        this.elements.speedBtn.dataset.speed = newSpeed;
    }

    startNextWave() {
        if (this.game.waveManager.canStartNextWave()) {
            const wasCountdownActive = this.game.waveManager.isCountdownActive;
            const success = this.game.waveManager.forceNextWave();
            
            if (success && wasCountdownActive) {
                // Hide countdown immediately when manually starting next wave
                this.hideWaveCountdown();
                // Show brief feedback that wave was started early
                this.showMessage('Wave started early!', 'info', 1500);
            }
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
        // Safety check for towerManager
        if (!this.game || !this.game.towerManager) {
            console.warn('TowerManager not available for tower shop update');
            return;
        }
        
        this.elements.towerItems.forEach(item => {
            const towerType = item.dataset.tower;
            const towerStats = this.game.towerManager.getTowerStats(towerType);
            const canAfford = this.game.getMoney() >= towerStats.cost;
            
            // Update the displayed cost to show current inflated price
            const costElement = item.querySelector('.tower-cost');
            if (costElement) {
                costElement.textContent = `💰 ${towerStats.cost}`;
            }
            
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
        // Safety check for waveManager
        if (!this.game || !this.game.waveManager) {
            console.warn('WaveManager not available for next wave preview update');
            return;
        }
        
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
        
        // Update gems and elements
        this.updateTowerGems(tower);
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
        console.log('Game started event received, hiding loading screen...');
        this.hideLoadingScreen();
        
        // Safety checks for game components
        if (!this.game) {
            console.warn('Game instance not available in onGameStarted');
            return;
        }
        
        this.updateMoney(this.game.getMoney());
        this.updateHealth(this.game.getHealth());
        this.updateScore(0);
        this.updateWave(1);
        this.updateTowerShop();
        this.updateNextWavePreview();
        console.log('Game UI updated successfully!');
    }

    onGameOver(data) {
        this.showGameOverScreen(data.reason, data.score);
    }

    onGameCompleted() {
        this.showVictoryScreen(this.game.getScore());
    }

    onWaveStarted(wave) {
        this.updateWave(wave);
        // Tower costs are now static - no need to update shop
        // Button state will be handled by the update() method
    }

    onWaveCompleted(wave) {
        this.updateNextWavePreview();
        // Tower costs are now static - no need to update shop
        this.showMessage(`Wave ${wave} Complete!`, 'success');
        // Button state will be handled by the update() method
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
        const canStart = this.game.waveManager.canStartNextWave();
        const isGameComplete = this.game.waveManager.currentWave >= this.game.waveManager.waveData.length;
        
        this.elements.nextWaveBtn.disabled = !canStart;
        this.elements.nextWaveBtn.textContent = isGameComplete ? 'Game Complete' : 'Next Wave';
        
        // Update countdown display
        this.updateCountdownDisplay();
    }

    // Wave countdown methods
    showWaveCountdown(data) {
        if (this.elements.waveCountdown) {
            this.elements.waveCountdown.classList.remove('hidden');
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
            const percentage = (data.timeLeft / 30.0) * 100; // 30 seconds total
            this.elements.countdownBar.style.width = `${percentage}%`;
        }
        
        if (data.timeLeft <= 0) {
            this.hideWaveCountdown();
        }
    }

    hideWaveCountdown() {
        if (this.elements.waveCountdown) {
            this.elements.waveCountdown.classList.add('hidden');
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
        console.log('UI initialization starting...');
        this.isInitialized = true;
        this.showLoadingScreen();
        
        try {
            console.log('UI initialization complete!');
        } catch (error) {
            console.error('Error during UI initialization:', error);
            console.error('Error stack:', error.stack);
        }
        
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

    // Gem System Methods (for tower gem slots only)
    openGemModal(slotIndex) {
        // Show gem selection modal for this slot
        this.showGemSelectionModal(slotIndex);
    }

    showGemSelectionModal(slotIndex) {
        const selectedTower = this.game.towerManager.selectedTower;
        if (!selectedTower) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'gem-modal';
        modal.innerHTML = `
            <div class="gem-modal-content">
                <h3>Select Gem for Slot ${parseInt(slotIndex) + 1}</h3>
                <div class="gem-categories">
                    <button class="gem-category-btn active" data-category="all">All</button>
                    <button class="gem-category-btn" data-category="element">Elemental</button>
                    <button class="gem-category-btn" data-category="enhancement">Enhancement</button>
                    <button class="gem-category-btn" data-category="combination">Combination</button>
                </div>
                <div class="gem-grid" id="modal-gem-grid"></div>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;

        // Populate modal with gems
        const modalGrid = modal.querySelector('#modal-gem-grid');
        Object.entries(GEM_TYPES).forEach(([key, gem]) => {
            const gemElement = this.createModalGemElement(key, gem, slotIndex);
            modalGrid.appendChild(gemElement);
        });

        // Add category filtering for modal
        modal.querySelectorAll('.gem-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.gem-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                modal.querySelectorAll('.gem-item').forEach(item => {
                    const showItem = category === 'all' || item.dataset.category === category;
                    item.style.display = showItem ? 'flex' : 'none';
                });
            });
        });

        document.body.appendChild(modal);
    }

    createModalGemElement(key, gem, slotIndex) {
        const gemDiv = document.createElement('div');
        gemDiv.className = 'gem-item';
        gemDiv.dataset.gem = key;
        gemDiv.dataset.category = gem.type;

        const affordable = this.game.getMoney() >= gem.cost;
        if (affordable) {
            gemDiv.classList.add('affordable');
        }

        let visualClass = gem.element ? gem.element.toLowerCase() : gem.type;

        gemDiv.innerHTML = `
            <div class="gem-visual ${visualClass}">${gem.emoji}</div>
            <div class="gem-name">${gem.name}</div>
            <div class="gem-description">${gem.description}</div>
            <div class="gem-cost">💰 ${gem.cost}</div>
        `;

        gemDiv.addEventListener('click', () => {
            this.socketGemToTower(key, gem, slotIndex);
            document.querySelector('.gem-modal').remove();
        });

        return gemDiv;
    }

    socketGemToTower(gemKey, gem, slotIndex) {
        const selectedTower = this.game.towerManager.selectedTower;
        if (!selectedTower) return;

        // Check if player can afford
        if (this.game.getMoney() < gem.cost) {
            this.showMessage('Insufficient funds!', 'error');
            return;
        }

        // Check if slot is valid
        if (slotIndex >= selectedTower.gemSlots) {
            this.showMessage('Tower has no more gem slots!', 'error');
            return;
        }

        // Check if slot is already occupied
        if (selectedTower.gems[slotIndex]) {
            this.showMessage('Gem slot already occupied!', 'error');
            return;
        }

        // Socket the gem
        selectedTower.socketGem(slotIndex, gemKey, gem);
        this.game.spendMoney(gem.cost);

        // Update UI
        this.updateTowerGems(selectedTower);
        this.updateMoney(this.game.getMoney());
        
        this.showMessage(`${gem.name} socketed successfully!`, 'success');
    }

    updateTowerGems(tower) {
        // Update gem slots in the tower details section
        const gemSlots = document.querySelectorAll('#tower-details .gem-slot');
        
        for (let i = 0; i < Math.min(gemSlots.length, tower.gemSlots || 3); i++) {
            const slot = gemSlots[i];
            const gem = tower.gems ? tower.gems[i] : null;
            
            const socketDiv = slot.querySelector('.gem-socket');
            const iconDiv = slot.querySelector('.gem-icon');
            const labelDiv = slot.querySelector('.gem-label');
            
            if (gem) {
                socketDiv.classList.add('filled');
                iconDiv.textContent = gem.emoji || '💎';
                labelDiv.textContent = gem.name ? gem.name.split(' ')[0] : 'Gem';
            } else {
                socketDiv.classList.remove('filled');
                iconDiv.textContent = '⭕';
                labelDiv.textContent = 'Empty';
            }
        }

        // Update tower type display if elements exist
        const purityBadge = document.getElementById('tower-purity');
        const elementType = document.getElementById('tower-element-type');
        
        if (purityBadge && tower.purity) {
            purityBadge.textContent = tower.purity;
            purityBadge.className = `purity-badge ${tower.purity}`;
        }
        
        if (elementType && tower.dominantElement) {
            elementType.textContent = tower.dominantElement;
            elementType.className = `element-type ${tower.dominantElement.toLowerCase()}`;
        }

        // Update elements display
        this.updateTowerElements(tower);
    }

    removeGemFromTower(tower, slotIndex) {
        const removedGem = tower.removeGem(slotIndex);
        if (removedGem) {
            // Refund partial cost
            const refund = Math.floor(removedGem.cost * 0.6);
            this.game.addMoney(refund);
            
            this.updateTowerGems(tower);
            this.updateMoney(this.game.getMoney());
            
            this.showMessage(`${removedGem.name} removed! Refunded ${refund} coins.`, 'info');
        }
    }

    filterTrinkets(category) {
        const trinketItems = document.querySelectorAll('.trinket-item');
        trinketItems.forEach(item => {
            const itemCategory = item.dataset.category;
            const shouldShow = category === 'all' || itemCategory === category;
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    openTrinketModal(slotIndex) {
        // Trinket system not implemented yet
        console.log('Trinket modal requested for slot', slotIndex);
        this.showMessage('Trinket system coming soon!', 'info');
    }

    equipTrinket(slotIndex, trinketKey, trinket) {
        // Trinket system not implemented yet
        console.log('Equip trinket requested:', trinketKey, 'to slot', slotIndex);
        this.showMessage('Trinket system coming soon!', 'info');
    }

    purchaseTrinket(key, trinket) {
        // Trinket system not implemented yet
        console.log('Purchase trinket requested:', key);
        this.showMessage('Trinket system coming soon!', 'info');
    }

    updateTowerTrinkets(tower) {
        // Trinket system not implemented yet - nothing to update
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

    destroy() {
        // Remove all event listeners to prevent memory leaks and cross-instance interference
        if (this.eventHandlers) {
            gameEvents.off('gameStarted', this.eventHandlers.onGameStarted);
            gameEvents.off('gameOver', this.eventHandlers.onGameOver);
            gameEvents.off('gameCompleted', this.eventHandlers.onGameCompleted);
            gameEvents.off('waveStarted', this.eventHandlers.onWaveStarted);
            gameEvents.off('waveCompleted', this.eventHandlers.onWaveCompleted);
            gameEvents.off('wavePreparation', this.eventHandlers.onWavePreparation);
            gameEvents.off('showCountdownUI', this.eventHandlers.showCountdownUI);
            gameEvents.off('updateCountdownUI', this.eventHandlers.updateCountdownUI);
            gameEvents.off('enemyKilled', this.eventHandlers.onEnemyKilled);
            gameEvents.off('enemyRotated', this.eventHandlers.onEnemyRotated);
            gameEvents.off('enemyRotatedToStart', this.eventHandlers.onEnemyRotatedToStart);
            gameEvents.off('towerPlaced', this.eventHandlers.onTowerPlaced);
            gameEvents.off('towerSelected', this.eventHandlers.onTowerSelected);
            gameEvents.off('towerDeselected', this.eventHandlers.onTowerDeselected);
            gameEvents.off('towerUpgraded', this.eventHandlers.onTowerUpgraded);
            gameEvents.off('towerSold', this.eventHandlers.onTowerSold);
            gameEvents.off('moneyChanged', this.eventHandlers.updateMoney);
            gameEvents.off('healthChanged', this.eventHandlers.updateHealth);
            gameEvents.off('scoreChanged', this.eventHandlers.updateScore);
        }
        
        // Clear references
        this.game = null;
        this.eventHandlers = null;
        this.elements = null;
        this.isInitialized = false;
    }
}
