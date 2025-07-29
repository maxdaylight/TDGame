// Game.js - Main game engine and logic
import { Vector2, GameMath, Timer, ParticleSystem, SoundManager, GameGrid, gameEvents } from './utils.js';
import { WaveManager } from './enemies.js';
import { TowerManager } from './towers.js';
import { UIManager } from './ui.js';

export class Game {
    constructor() {
        // Core game components
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.gameSpeed = 1;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        
        // Game state
        this.gameState = 'loading'; // loading, playing, paused, gameOver, victory
        this.health = 20;
        this.maxHealth = 20;
        this.money = 100;
        this.score = 0;
        this.multiplier = 1;
        
        // Game systems
        this.grid = new GameGrid(20, 15, 40); // 20x15 grid with 40px cells
        this.waveManager = new WaveManager();
        this.towerManager = new TowerManager(this);
        this.uiManager = new UIManager(this);
        this.particleSystem = new ParticleSystem();
        this.soundManager = new SoundManager();
        
        // Input handling
        this.mouse = { x: 0, y: 0, isDown: false };
        this.keys = new Set();
        
        // Statistics
        this.statistics = {
            enemiesKilled: 0,
            totalDamage: 0,
            towersBuilt: 0,
            wavesSurvived: 0,
            gameTime: 0,
            highScore: this.loadHighScore()
        };
        
        // Initialize game
        this.initializeGame();
    }

    async initializeGame() {
        try {
            // Setup canvas
            this.setupCanvas();
            
            // Setup input handlers
            this.setupInputHandlers();
            
            // Generate game map
            this.generateMap();
            
            // Setup game event listeners
            this.setupGameEventListeners();
            
            // Load sounds (optional)
            this.loadSounds();
            
            // Initialize UI
            this.uiManager.initialize();
            
            // Start game loop
            this.startGameLoop();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
        }
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Set high DPI scaling
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        // Smooth rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    setupInputHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Window events
        window.addEventListener('blur', () => this.handleWindowBlur());
        window.addEventListener('focus', () => this.handleWindowFocus());
        window.addEventListener('resize', () => this.handleResize());
    }

    generateMap() {
        // Create a simple path from left to right with some turns
        const path = [
            { x: 0, y: 7 },   // Start at left middle
            { x: 3, y: 7 },
            { x: 3, y: 4 },
            { x: 8, y: 4 },
            { x: 8, y: 10 },
            { x: 13, y: 10 },
            { x: 13, y: 7 },
            { x: 17, y: 7 },
            { x: 17, y: 12 },
            { x: 19, y: 12 }  // End at right side
        ];
        
        this.grid.setPath(path);
        this.waveManager.setPath(path);
    }

    setupGameEventListeners() {
        // Enemy events
        gameEvents.on('enemyKilled', (enemy) => this.onEnemyKilled(enemy));
        gameEvents.on('enemyReachedEnd', (enemy) => this.onEnemyReachedEnd(enemy));
        
        // Tower events
        gameEvents.on('towerPlaced', (tower) => this.onTowerPlaced(tower));
        gameEvents.on('towerUpgraded', (tower) => this.onTowerUpgraded(tower));
        gameEvents.on('towerSold', (tower) => this.onTowerSold(tower));
        
        // Wave events
        gameEvents.on('waveCompleted', (wave) => this.onWaveCompleted(wave));
        gameEvents.on('gameCompleted', () => this.onGameCompleted());
        
        // Projectile events
        gameEvents.on('projectileHit', (data) => this.onProjectileHit(data));
        gameEvents.on('explosion', (data) => this.onExplosion(data));
    }

    loadSounds() {
        // This would load actual sound files in a real implementation
        // For now, we'll just set up the sound manager
        this.soundManager.setMasterVolume(0.5);
    }

    startGameLoop() {
        this.isRunning = true;
        this.gameState = 'playing';
        this.lastFrameTime = performance.now();
        
        // Start first wave after a delay
        setTimeout(() => {
            this.waveManager.startWave(1);
        }, 2000);
        
        gameEvents.emit('gameStarted');
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30);
        
        // Apply game speed
        const adjustedDeltaTime = this.deltaTime * this.gameSpeed;
        
        if (!this.isPaused && this.gameState === 'playing') {
            this.update(adjustedDeltaTime);
        }
        
        this.render();
        this.uiManager.update();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Update game time
        this.statistics.gameTime += deltaTime;
        
        // Update game systems
        this.waveManager.update(deltaTime);
        this.towerManager.update(deltaTime);
        this.particleSystem.update(deltaTime);
        
        // Check game over conditions
        this.checkGameOver();
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render game background
        this.renderBackground();
        
        // Render game path
        this.renderPath();
        
        // Render game systems
        this.waveManager.render(this.ctx);
        this.towerManager.render(this.ctx);
        this.particleSystem.render(this.ctx);
        
        // Render UI overlays
        this.renderGrid();
        this.renderDebugInfo();
    }

    renderBackground() {
        // Create a natural, organic background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#8FBC8F');
        gradient.addColorStop(0.5, '#90EE90');
        gradient.addColorStop(1, '#98FB98');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add some texture
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 3 + 1;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderPath() {
        const path = this.grid.path;
        if (path.length < 2) return;
        
        this.ctx.save();
        
        // Draw path background
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 30;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        const start = this.grid.gridToWorld(path[0].x, path[0].y);
        this.ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < path.length; i++) {
            const point = this.grid.gridToWorld(path[i].x, path[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        this.ctx.stroke();
        
        // Draw path surface
        this.ctx.strokeStyle = '#DEB887';
        this.ctx.lineWidth = 20;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < path.length; i++) {
            const point = this.grid.gridToWorld(path[i].x, path[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        this.ctx.stroke();
        
        // Draw directional arrows
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let i = 0; i < path.length - 1; i += 2) {
            const current = this.grid.gridToWorld(path[i].x, path[i].y);
            const next = this.grid.gridToWorld(path[i + 1].x, path[i + 1].y);
            const direction = next.subtract(current).normalize();
            const arrowPos = current.add(direction.multiply(20));
            
            this.ctx.save();
            this.ctx.translate(arrowPos.x, arrowPos.y);
            this.ctx.rotate(Math.atan2(direction.y, direction.x));
            this.ctx.fillText('→', 0, 0);
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }

    renderGrid() {
        if (!this.towerManager.isInPlacementMode()) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.grid.width; x++) {
            const worldX = x * this.grid.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(worldX, 0);
            this.ctx.lineTo(worldX, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.grid.height; y++) {
            const worldY = y * this.grid.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, worldY);
            this.ctx.lineTo(this.canvas.width, worldY);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    renderDebugInfo() {
        if (process.env.NODE_ENV !== 'development') return;
        
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        const info = [
            `FPS: ${Math.round(1 / this.deltaTime)}`,
            `Enemies: ${this.waveManager.getAllEnemies().length}`,
            `Towers: ${this.towerManager.getAllTowers().length}`,
            `Projectiles: ${this.towerManager.projectiles.length}`,
            `Particles: ${this.particleSystem.particles.length}`
        ];
        
        for (let i = 0; i < info.length; i++) {
            this.ctx.fillText(info[i], 10, 20 + i * 15);
        }
        
        this.ctx.restore();
    }

    // Input handlers
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
        
        // Update tower placement preview
        if (this.towerManager.isInPlacementMode()) {
            this.towerManager.updatePreviewPosition(this.mouse.x, this.mouse.y);
        }
    }

    handleMouseDown(event) {
        this.mouse.isDown = true;
        
        if (event.button === 0) { // Left click
            this.handleLeftClick();
        } else if (event.button === 2) { // Right click
            this.handleRightClick();
        }
    }

    handleMouseUp(event) {
        this.mouse.isDown = false;
    }

    handleLeftClick() {
        if (this.gameState !== 'playing' || this.isPaused) return;
        
        if (this.towerManager.isInPlacementMode()) {
            // Try to place tower
            const tower = this.towerManager.placeTower(this.mouse.x, this.mouse.y);
            if (tower) {
                this.addParticleEffect(this.mouse.x, this.mouse.y, '#4CAF50');
            }
        } else {
            // Try to select tower
            const tower = this.towerManager.selectTower(this.mouse.x, this.mouse.y);
            if (tower) {
                gameEvents.emit('towerSelected', tower);
            } else {
                this.towerManager.clearSelection();
                gameEvents.emit('towerDeselected');
            }
        }
    }

    handleRightClick() {
        // Cancel placement mode or deselect tower
        if (this.towerManager.isInPlacementMode()) {
            this.towerManager.exitPlacementMode();
        } else {
            this.towerManager.clearSelection();
            gameEvents.emit('towerDeselected');
        }
    }

    handleKeyDown(event) {
        this.keys.add(event.key.toLowerCase());
    }

    handleKeyUp(event) {
        this.keys.delete(event.key.toLowerCase());
    }

    handleWindowBlur() {
        if (this.gameState === 'playing') {
            this.pause();
        }
    }

    handleWindowFocus() {
        // Optional: Could resume automatically or show resume prompt
    }

    handleResize() {
        this.setupCanvas();
    }

    // Game event handlers
    onEnemyKilled(enemy) {
        this.addMoney(enemy.reward);
        this.addScore(enemy.reward * this.multiplier);
        this.statistics.enemiesKilled++;
        
        // Create death effect
        this.addParticleEffect(
            enemy.position.x,
            enemy.position.y,
            enemy.color,
            15
        );
    }

    onEnemyReachedEnd(enemy) {
        this.takeDamage(1);
        
        // Create negative effect
        this.addParticleEffect(
            enemy.position.x,
            enemy.position.y,
            '#F44336',
            10
        );
    }

    onTowerPlaced(tower) {
        this.statistics.towersBuilt++;
    }

    onTowerUpgraded(tower) {
        this.addScore(50);
    }

    onTowerSold(tower) {
        // No additional logic needed, money already added in tower manager
    }

    onWaveCompleted(wave) {
        this.statistics.wavesSurvived = wave;
        
        // Bonus score for completing wave
        const bonus = wave * 100;
        this.addScore(bonus);
        this.addMoney(Math.floor(wave * 10));
        
        // Increase multiplier every 5 waves
        if (wave % 5 === 0) {
            this.multiplier += 0.5;
        }
    }

    onGameCompleted() {
        this.gameState = 'victory';
        this.isRunning = false;
        
        // Massive bonus for completing the game
        this.addScore(10000);
        this.saveHighScore();
    }

    onProjectileHit(data) {
        this.statistics.totalDamage += data.damage;
        
        // Create hit effect
        this.addParticleEffect(
            data.position.x,
            data.position.y,
            data.type === 'poison' ? '#9C27B0' : '#FFD700',
            5
        );
    }

    onExplosion(data) {
        this.addParticleEffect(
            data.position.x,
            data.position.y,
            data.color,
            25
        );
    }

    // Game mechanics
    addMoney(amount) {
        this.money += amount;
        gameEvents.emit('moneyChanged', this.money);
    }

    spendMoney(amount) {
        if (this.money >= amount) {
            this.money -= amount;
            gameEvents.emit('moneyChanged', this.money);
            return true;
        }
        return false;
    }

    addScore(amount) {
        this.score += amount;
        gameEvents.emit('scoreChanged', this.score);
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        gameEvents.emit('healthChanged', this.health);
        
        if (this.health <= 0) {
            this.gameOver('Your mushroom colony has been overrun!');
        }
    }

    addParticleEffect(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particleSystem.addParticle({
                x: x + GameMath.randomRange(-10, 10),
                y: y + GameMath.randomRange(-10, 10),
                spread: 50,
                life: GameMath.randomRange(0.5, 1.5),
                size: GameMath.randomRange(2, 6),
                color: color,
                gravity: 50
            });
        }
    }

    checkGameOver() {
        if (this.health <= 0 && this.gameState === 'playing') {
            this.gameOver('Your mushroom colony has been overrun!');
        }
    }

    gameOver(reason) {
        this.gameState = 'gameOver';
        this.isRunning = false;
        this.saveHighScore();
        
        gameEvents.emit('gameOver', {
            reason: reason,
            score: this.score,
            wave: this.waveManager.getCurrentWave(),
            statistics: this.statistics
        });
    }

    // Game controls
    pause() {
        this.isPaused = true;
        this.gameState = 'paused';
    }

    resume() {
        this.isPaused = false;
        this.gameState = 'playing';
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
        return !this.isPaused;
    }

    toggleSpeed() {
        const speeds = [1, 2, 3];
        const currentIndex = speeds.indexOf(this.gameSpeed);
        this.gameSpeed = speeds[(currentIndex + 1) % speeds.length];
        return this.gameSpeed;
    }

    restart() {
        // Reset all game state
        this.health = this.maxHealth;
        this.money = 100;
        this.score = 0;
        this.multiplier = 1;
        this.gameSpeed = 1;
        this.isPaused = false;
        this.gameState = 'playing';
        
        // Reset statistics
        this.statistics.enemiesKilled = 0;
        this.statistics.totalDamage = 0;
        this.statistics.towersBuilt = 0;
        this.statistics.wavesSurvived = 0;
        this.statistics.gameTime = 0;
        
        // Reset game systems
        this.waveManager.reset();
        this.towerManager.reset();
        this.particleSystem.clear();
        
        // Restart game loop
        this.startGameLoop();
    }

    // Getters
    getMoney() { return this.money; }
    getHealth() { return this.health; }
    getScore() { return this.score; }
    getStatistics() { return this.statistics; }

    // High score management
    loadHighScore() {
        try {
            return parseInt(localStorage.getItem('mushroomRevolutionHighScore')) || 0;
        } catch {
            return 0;
        }
    }

    saveHighScore() {
        try {
            if (this.score > this.statistics.highScore) {
                this.statistics.highScore = this.score;
                localStorage.setItem('mushroomRevolutionHighScore', this.score.toString());
            }
        } catch {
            // localStorage not available
        }
    }

    // Add projectile to game (called by towers)
    addProjectile(projectile) {
        this.towerManager.addProjectile(projectile);
    }
}

// Initialize and start the game
let game;

window.addEventListener('load', () => {
    game = new Game();
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.game = game;
}
