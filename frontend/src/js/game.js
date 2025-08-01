// Game.js - Main game engine and logic
console.log('Loading game.js module...');

import { Vector2, GameMath, Timer, ParticleSystem, SoundManager, GameGrid, gameEvents } from './utils.js';
import { WaveManager } from './enemies.js';
import { TowerManager } from './towers.js';
import { UIManager } from './ui.js';
import { GameMonitor } from './game-monitor.js';

console.log('All imports loaded successfully!');

export class Game {
    constructor() {
        this.showStatus('Game constructor starting...');
        
        // Core game components
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.gameSpeed = 1;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        
        // Store reference to game instance for global access
        if (this.canvas) {
            this.canvas.game = this;
        }
        
        this.showStatus(this.canvas ? 'Canvas found' : 'Canvas NOT found!');
        
        // Game state
        this.gameState = 'loading'; // loading, playing, paused, gameOver, victory
        this.health = 20;
        this.maxHealth = 20;
        this.money = 170; // Optimized starting money for balanced economy
        this.score = 0;
        this.multiplier = 1;
        
        // Game systems
        this.showStatus('Initializing game systems...');
        try {
            this.grid = new GameGrid(20, 15, 40); // 20x15 grid with 40px cells
            this.showStatus('Grid created');
        } catch (error) {
            this.showStatus('Failed to create GameGrid: ' + error.message);
            throw error;
        }
        
        try {
            this.waveManager = new WaveManager();
            this.showStatus('WaveManager created');
        } catch (error) {
            this.showStatus('Failed to create WaveManager: ' + error.message);
            throw error;
        }
        
        try {
            this.towerManager = new TowerManager(this);
            this.showStatus('TowerManager created');
        } catch (error) {
            this.showStatus('Failed to create TowerManager: ' + error.message);
            throw error;
        }
        
        try {
            this.uiManager = new UIManager(this);
            this.showStatus('UIManager created');
        } catch (error) {
            this.showStatus('Failed to create UIManager: ' + error.message);
            throw error;
        }
        
        try {
            this.particleSystem = new ParticleSystem();
            this.showStatus('ParticleSystem created');
        } catch (error) {
            this.showStatus('Failed to create ParticleSystem: ' + error.message);
            throw error;
        }
        
        try {
            this.soundManager = new SoundManager();
            this.showStatus('SoundManager created');
        } catch (error) {
            this.showStatus('Failed to create SoundManager: ' + error.message);
            throw error;
        }
        
        // Initialize game monitor for comprehensive logging
        try {
            this.gameMonitor = new GameMonitor(this);
            this.showStatus('GameMonitor created');
        } catch (error) {
            this.showStatus('Failed to create GameMonitor: ' + error.message);
            throw error;
        }
        
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
        
        this.showStatus('Game constructor complete, starting initialization...');
        
        // Initialize game
        this.initializeGame();
    }
    
    showStatus(message) {
        const loadingElement = document.querySelector('.loading-content h2');
        if (loadingElement) {
            loadingElement.textContent = message;
        }
        console.log(message);
    }

    async initializeGame() {
        try {
            console.log('Starting game initialization...');
            
            // Setup canvas
            console.log('Setting up canvas...');
            this.setupCanvas();
            
            // Setup input handlers
            console.log('Setting up input handlers...');
            this.setupInputHandlers();
            
            // Generate game map
            console.log('Generating map...');
            this.generateMap();
            
            // Setup game event listeners
            console.log('Setting up game event listeners...');
            this.setupGameEventListeners();
            
            // Load sounds (optional)
            console.log('Loading sounds...');
            this.loadSounds();
            
            // Initialize UI
            console.log('Initializing UI...');
            this.uiManager.initialize();
            
            // Start game loop
            console.log('Starting game loop...');
            this.startGameLoop();
            
            console.log('Game initialization complete!');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            console.error('Error stack:', error.stack);
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
        // Create a simple, clean path - no visual approach zone needed
        const path = [
            { x: 0, y: 7 },   // Start at left edge (enemies spawn off-screen)
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
        
        // Create terrain blocking zones (like rocks/water) near spawn
        this.createTerrainBlocking();
    }
    
    createTerrainBlocking() {
        // Block tower placement in the leftmost 3 columns (approach area)
        // This simulates terrain like rocks, water, or dense forest
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                if (this.grid.cells[x][y] !== 2) { // Don't override path tiles
                    this.grid.cells[x][y] = 3; // 3 = blocked terrain
                }
            }
        }
        
        // Ensure all path tiles are properly marked as non-buildable
        const path = this.grid.path;
        for (const pathPoint of path) {
            if (this.grid.isValidGridPosition(pathPoint.x, pathPoint.y)) {
                this.grid.cells[pathPoint.x][pathPoint.y] = 2; // 2 = path (non-buildable)
                
                // Only block IMMEDIATE adjacent cells (not diagonals) to prevent visual overlap
                // This leaves strategic positions available while preventing path blocking
                const adjacentOffsets = [
                    {x: 0, y: -1}, // North
                    {x: 1, y: 0},  // East  
                    {x: 0, y: 1},  // South
                    {x: -1, y: 0}, // West
                ];
                
                for (const offset of adjacentOffsets) {
                    const adjX = pathPoint.x + offset.x;
                    const adjY = pathPoint.y + offset.y;
                    
                    if (this.grid.isValidGridPosition(adjX, adjY)) {
                        // Only block if it's not already a path tile or already blocked terrain
                        if (this.grid.cells[adjX][adjY] === 0) {
                            this.grid.cells[adjX][adjY] = 4; // 4 = path buffer zone (non-buildable)
                        }
                    }
                }
            }
        }
        
        // Add a helper method for AI to find strategic positions
        this.strategicPositions = this.calculateStrategicPositions();
    }

    calculateStrategicPositions() {
        // Calculate optimal strategic positions for AI players
        const path = this.grid.path;
        const strategicPositions = [];
        
        if (!path || path.length === 0) return strategicPositions;
        
        // Analyze path segments and find optimal coverage points
        const segmentSize = Math.max(2, Math.floor(path.length / 6)); // 6 strategic segments
        
        for (let i = 0; i < path.length - segmentSize; i += segmentSize) {
            const segment = path.slice(i, i + segmentSize);
            
            // Find center of this path segment
            const centerX = segment.reduce((sum, p) => sum + p.x, 0) / segment.length;
            const centerY = segment.reduce((sum, p) => sum + p.y, 0) / segment.length;
            
            // Find strategic positions around this segment center
            const candidatePositions = this.findPositionsAroundPoint(centerX, centerY, 80, 120);
            
            for (const pos of candidatePositions) {
                const gridPos = this.grid.worldToGrid(pos.x, pos.y);
                
                // Check if position is buildable
                if (this.grid.canPlaceTower(gridPos.x, gridPos.y)) {
                    const pathCoverage = this.calculatePathCoverageForPosition(pos, path, 100); // Standard tower range
                    const strategicValue = this.calculatePositionStrategicValue(pos, path, segment);
                    
                    strategicPositions.push({
                        position: pos,
                        gridPosition: gridPos,
                        pathCoverage: pathCoverage,
                        strategicValue: strategicValue,
                        segmentIndex: Math.floor(i / segmentSize)
                    });
                }
            }
        }
        
        // Sort by strategic value (best first)
        strategicPositions.sort((a, b) => b.strategicValue - a.strategicValue);
        
        console.log(`Calculated ${strategicPositions.length} strategic positions`);
        return strategicPositions.slice(0, 12); // Keep top 12 positions
    }

    findPositionsAroundPoint(centerX, centerY, minRadius, maxRadius) {
        const positions = [];
        const angleStep = 45; // 8 directions
        
        for (let radius = minRadius; radius <= maxRadius; radius += 20) {
            for (let angle = 0; angle < 360; angle += angleStep) {
                const radian = (angle * Math.PI) / 180;
                const x = centerX + radius * Math.cos(radian);
                const y = centerY + radius * Math.sin(radian);
                
                // Convert to world coordinates (grid coordinates to pixel coordinates)
                const worldX = x * this.grid.cellSize + this.grid.cellSize / 2;
                const worldY = y * this.grid.cellSize + this.grid.cellSize / 2;
                
                // Check if position is within canvas bounds
                if (worldX >= 50 && worldX <= 750 && worldY >= 50 && worldY <= 550) {
                    positions.push({ x: worldX, y: worldY });
                }
            }
        }
        
        return positions;
    }

    calculatePathCoverageForPosition(position, path, range) {
        let coveredSegments = 0;
        
        for (const pathPoint of path) {
            const pathWorldPos = this.grid.gridToWorld(pathPoint.x, pathPoint.y);
            const distance = Math.sqrt(
                Math.pow(position.x - pathWorldPos.x, 2) + 
                Math.pow(position.y - pathWorldPos.y, 2)
            );
            
            if (distance <= range) {
                coveredSegments++;
            }
        }
        
        return (coveredSegments / path.length) * 100; // Percentage coverage
    }

    calculatePositionStrategicValue(position, fullPath, segment) {
        let strategicValue = 0;
        
        // Base value from path coverage
        const coverage = this.calculatePathCoverageForPosition(position, fullPath, 100);
        strategicValue += coverage * 0.4; // 40% weight on overall coverage
        
        // Bonus for covering critical path sections (middle parts of path)
        const criticalStart = Math.floor(fullPath.length * 0.3);
        const criticalEnd = Math.floor(fullPath.length * 0.7);
        const criticalPath = fullPath.slice(criticalStart, criticalEnd);
        const criticalCoverage = this.calculatePathCoverageForPosition(position, criticalPath, 100);
        strategicValue += criticalCoverage * 0.3; // 30% weight on critical coverage
        
        // Bonus for segment focus
        const segmentCoverage = this.calculatePathCoverageForPosition(position, segment, 100);
        strategicValue += segmentCoverage * 0.2; // 20% weight on segment coverage
        
        // Distance penalty (closer to path is generally better, but not too close)
        const pathCenter = this.grid.gridToWorld(
            segment.reduce((sum, p) => sum + p.x, 0) / segment.length,
            segment.reduce((sum, p) => sum + p.y, 0) / segment.length
        );
        const distanceToPath = Math.sqrt(
            Math.pow(position.x - pathCenter.x, 2) + 
            Math.pow(position.y - pathCenter.y, 2)
        );
        
        // Optimal distance is around 80-120 pixels
        const optimalDistance = 100;
        const distancePenalty = Math.abs(distanceToPath - optimalDistance) / 10;
        strategicValue -= distancePenalty * 0.1; // 10% penalty for suboptimal distance
        
        return Math.max(0, strategicValue);
    }

    // Helper method for AI to get next strategic position
    getNextStrategicPosition(existingTowers = []) {
        if (!this.strategicPositions || this.strategicPositions.length === 0) {
            return null;
        }
        
        // Filter out positions too close to existing towers
        const availablePositions = this.strategicPositions.filter(strategic => {
            return !existingTowers.some(tower => {
                const distance = Math.sqrt(
                    Math.pow(strategic.position.x - tower.x, 2) + 
                    Math.pow(strategic.position.y - tower.y, 2)
                );
                return distance < 80; // Minimum separation
            });
        });
        
        return availablePositions.length > 0 ? availablePositions[0] : null;
    }

    setupGameEventListeners() {
        // Enemy events
        gameEvents.on('enemyKilled', (enemy) => this.onEnemyKilled(enemy));
        gameEvents.on('enemyRotated', (enemy) => this.onEnemyRotated(enemy));
        gameEvents.on('enemyRotatedToStart', (enemy) => this.onEnemyRotatedToStart(enemy));
        
        // Tower events
        gameEvents.on('towerPlaced', (tower) => this.onTowerPlaced(tower));
        gameEvents.on('towerUpgraded', (tower) => this.onTowerUpgraded(tower));
        gameEvents.on('towerSold', (tower) => this.onTowerSold(tower));
        
        // Wave events
        gameEvents.on('waveCompleted', (wave) => this.onWaveCompleted(wave));
        gameEvents.on('gameCompleted', () => this.onGameCompleted());
        gameEvents.on('waveCountdownStarted', (data) => this.onWaveCountdownStarted(data));
        gameEvents.on('waveCountdownUpdate', (data) => this.onWaveCountdownUpdate(data));
        
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
        console.log('Starting game loop...');
        this.isRunning = true;
        this.gameState = 'playing';
        this.lastFrameTime = performance.now();
        
        // Add debug endpoint
        if (typeof window !== 'undefined') {
            window.getWaveDebugLog = () => {
                return window.waveDebugLog || [];
            };
            window.getCurrentWaveState = () => {
                return {
                    currentWave: this.waveManager.currentWave,
                    isWaveActive: this.waveManager.isWaveActive,
                    isPreparingWave: this.waveManager.isPreparingWave,
                    isCountdownActive: this.waveManager.isCountdownActive,
                    enemiesCount: this.waveManager.enemies.length,
                    enemiesSpawned: this.waveManager.enemiesSpawned,
                    enemiesInCurrentWave: this.waveManager.enemiesInCurrentWave
                };
            };
        }
        
        // Start first wave after a delay
        setTimeout(() => {
            console.log('Starting first wave...');
            this.waveManager.startWave(1);
        }, 2000);
        
        console.log('Emitting gameStarted event...');
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
        // Debug: Log update calls periodically
        if (Math.random() < 0.001) { // Log roughly once per second (1/1000 frames at 60fps)
            console.log('Game update running:', {
                deltaTime,
                gameState: this.gameState,
                currentWave: this.waveManager.getCurrentWave(),
                isWaveActive: this.waveManager.isWaveActive,
                enemyCount: this.waveManager.getAllEnemies().length
            });
        }
        
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
        
        // Render terrain (blocked areas)
        this.renderTerrain();
        
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

    renderTerrain() {
        // Draw blocked terrain areas and path buffer zones
        for (let x = 0; x < this.grid.width; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                const cellType = this.grid.cells[x][y];
                const worldPos = this.grid.gridToWorld(x, y);
                const halfSize = this.grid.cellSize / 2;
                
                if (cellType === 3) { // 3 = blocked terrain (rocks/water)
                    // Draw rock terrain background
                    this.ctx.fillStyle = '#4a4a4a'; // Gray rock color
                    this.ctx.fillRect(
                        worldPos.x - halfSize,
                        worldPos.y - halfSize,
                        this.grid.cellSize,
                        this.grid.cellSize
                    );
                    
                    // Draw multiple rock formations
                    this.drawRockFormation(worldPos.x, worldPos.y, halfSize);
                    
                } else if (cellType === 4) { // 4 = path buffer zone (subtle indication)
                    // Very subtle indication of non-buildable area near path
                    this.ctx.fillStyle = 'rgba(139, 69, 19, 0.1)'; // Very light brown tint
                    this.ctx.fillRect(
                        worldPos.x - halfSize,
                        worldPos.y - halfSize,
                        this.grid.cellSize,
                        this.grid.cellSize
                    );
                    
                    // Add small rocks to indicate non-buildable
                    this.drawSmallRocks(worldPos.x, worldPos.y, halfSize);
                }
            }
        }
    }
    
    drawRockFormation(centerX, centerY, cellHalfSize) {
        this.ctx.save();
        
        // Create a deterministic random seed based on position for consistent rocks
        const seed = (centerX * 73 + centerY * 37) % 1000;
        
        // Draw 3-5 rocks of varying sizes
        const numRocks = 3 + (seed % 3);
        
        for (let i = 0; i < numRocks; i++) {
            const rockSeed = (seed + i * 17) % 1000;
            
            // Position rocks within the cell
            const offsetX = ((rockSeed % 20) - 10) * (cellHalfSize / 15);
            const offsetY = (((rockSeed * 7) % 20) - 10) * (cellHalfSize / 15);
            const rockX = centerX + offsetX;
            const rockY = centerY + offsetY;
            
            // Vary rock size
            const baseSize = cellHalfSize * 0.15;
            const sizeVariation = ((rockSeed * 3) % 10) / 10;
            const rockSize = baseSize + (baseSize * sizeVariation * 0.6);
            
            // Rock colors - different shades of gray/brown
            const colorVariation = (rockSeed * 11) % 4;
            const rockColors = ['#555555', '#666666', '#4a4a4a', '#5a5a5a'];
            this.ctx.fillStyle = rockColors[colorVariation];
            
            // Draw irregular rock shape
            this.ctx.beginPath();
            const sides = 5 + (rockSeed % 3); // 5-7 sides for irregular shape
            
            for (let j = 0; j < sides; j++) {
                const angle = (j / sides) * Math.PI * 2;
                const radiusVariation = 0.7 + ((rockSeed + j * 13) % 30) / 100; // 0.7 to 1.0
                const radius = rockSize * radiusVariation;
                const x = rockX + Math.cos(angle) * radius;
                const y = rockY + Math.sin(angle) * radius;
                
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Add darker outline for definition
            this.ctx.strokeStyle = '#333333';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Add highlight for 3D effect
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(rockX - rockSize * 0.2, rockY - rockSize * 0.2, rockSize * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawSmallRocks(centerX, centerY, cellHalfSize) {
        this.ctx.save();
        
        // Create deterministic seed for consistent small rocks
        const seed = (centerX * 41 + centerY * 59) % 1000;
        
        // Draw 1-3 small rocks
        const numRocks = 1 + (seed % 3);
        
        for (let i = 0; i < numRocks; i++) {
            const rockSeed = (seed + i * 23) % 1000;
            
            // Position small rocks
            const offsetX = ((rockSeed % 16) - 8) * (cellHalfSize / 12);
            const offsetY = (((rockSeed * 5) % 16) - 8) * (cellHalfSize / 12);
            const rockX = centerX + offsetX;
            const rockY = centerY + offsetY;
            
            // Small rock size
            const rockSize = cellHalfSize * 0.08;
            
            // Subtle rock color
            this.ctx.fillStyle = 'rgba(85, 85, 85, 0.6)';
            
            // Draw small irregular rock
            this.ctx.beginPath();
            this.ctx.arc(rockX, rockY, rockSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Subtle outline
            this.ctx.strokeStyle = 'rgba(51, 51, 51, 0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    renderPath() {
        const path = this.grid.path;
        if (path.length < 2) return;
        
        this.ctx.save();
        
        // Draw main path background
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
        
        // Draw main path surface
        this.ctx.strokeStyle = '#DEB887';
        this.ctx.lineWidth = 20;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < path.length; i++) {
            const point = this.grid.gridToWorld(path[i].x, path[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        this.ctx.stroke();
        
        // Draw directional arrows on main path
        this.ctx.fillStyle = '#8B4513';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        for (let i = 0; i < path.length - 1; i += 2) {
            const current = this.grid.gridToWorld(path[i].x, path[i].y);
            const next = this.grid.gridToWorld(path[i + 1].x, path[i].y);
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
        
        // Show strategic positions as hints (for debugging/AI visualization)
        if (this.strategicPositions && this.strategicPositions.length > 0) {
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            this.ctx.lineWidth = 2;
            
            for (let i = 0; i < Math.min(5, this.strategicPositions.length); i++) {
                const strategic = this.strategicPositions[i];
                const pos = strategic.position;
                
                // Draw strategic position indicator
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Draw rank number
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.ctx.font = 'bold 12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText((i + 1).toString(), pos.x, pos.y);
                
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            }
        }
        
        this.ctx.restore();
    }

    renderDebugInfo() {
        // Always show debug info for troubleshooting
        
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, 10, 300, 200);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        const info = [
            `FPS: ${Math.round(1 / this.deltaTime)}`,
            `Current Wave: ${this.waveManager.currentWave}`,
            `Wave Active: ${this.waveManager.isWaveActive}`,
            `Preparing: ${this.waveManager.isPreparingWave}`,
            `Countdown: ${this.waveManager.isCountdownActive}`,
            `Enemies: ${this.waveManager.getAllEnemies().length}`,
            `Spawned: ${this.waveManager.enemiesSpawned}/${this.waveManager.enemiesInCurrentWave}`,
            `Towers: ${this.towerManager.getAllTowers().length}`,
            `Projectiles: ${this.towerManager.projectiles.length}`,
            `Particles: ${this.particleSystem.particles.length}`,
            `Money: $${this.money}`,
            `Health: ${this.health}/${this.maxHealth}`,
            `Game State: ${this.gameState}`
        ];
        
        for (let i = 0; i < info.length; i++) {
            this.ctx.fillText(info[i], 15, 25 + i * 15);
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
            // Update the pause button to show play icon
            this.uiManager.updatePauseButton();
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
        // Apply balanced diminishing returns based on wave progression
        const currentWave = this.waveManager.getCurrentWave();
        let diminishingFactor;
        
        if (currentWave <= 3) {
            diminishingFactor = 1.0; // Full rewards for early game stability
        } else if (currentWave <= 8) {
            diminishingFactor = Math.max(0.5, 1.0 - ((currentWave - 3) * 0.08)); // Gradual reduction
        } else if (currentWave <= 15) {
            diminishingFactor = Math.max(0.25, 0.5 - ((currentWave - 8) * 0.03)); // Moderate reduction
        } else {
            diminishingFactor = 0.25; // Minimum sustainable reward
        }
        
        const scaledReward = Math.max(1, Math.floor(enemy.reward * diminishingFactor));
        
        this.addMoney(scaledReward);
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

    onEnemyRotated(enemy) {
        // Enemy rotated back to start - deal 1 damage to player
        this.takeDamage(1);
        
        // Create visual effect for the damage
        this.addParticleEffect(
            enemy.position.x,
            enemy.position.y,
            '#FF4444', // Red color for damage effect
            8
        );
    }

    onEnemyRotatedToStart(enemy) {
        // Additional effect when enemy actually reaches the start
        this.addParticleEffect(
            enemy.position.x,
            enemy.position.y,
            '#FFA500', // Orange color
            5
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
        
        // Balanced wave completion bonuses
        const baseBonus = 15;
        let bonusMultiplier;
        
        if (wave <= 3) {
            bonusMultiplier = 1.0; // Full bonus for early waves
        } else if (wave <= 8) {
            bonusMultiplier = Math.max(0.6, 1.0 - ((wave - 3) * 0.08)); // Gradual reduction
        } else if (wave <= 15) {
            bonusMultiplier = Math.max(0.3, 0.6 - ((wave - 8) * 0.04)); // Moderate reduction
        } else {
            bonusMultiplier = 0.3; // Sustainable minimum
        }
        
        const scaledBonus = Math.floor(baseBonus * bonusMultiplier);
        this.addMoney(scaledBonus);
        
        // Remove aggressive wealth tax - let players build up some economy
        // Only apply minimal wealth management for extreme hoarding
        if (wave >= 8 && this.money > 300) {
            const excessAmount = this.money - 300;
            const modestTax = Math.floor(excessAmount * 0.05); // 5% tax on excess only
            this.money = Math.max(300, this.money - modestTax);
            console.log(`Wave ${wave}: Modest wealth management applied: $${modestTax} (excess over $300)`);
        }
        
        // Increase multiplier every 5 waves
        if (wave % 5 === 0) {
            this.multiplier += 0.5;
        }
    }

    onWaveCountdownStarted(data) {
        // Visual indicator that countdown has started
        gameEvents.emit('showCountdownUI', data);
    }

    onWaveCountdownUpdate(data) {
        // Update countdown display
        gameEvents.emit('updateCountdownUI', data);
    }

    onGameCompleted() {
        this.gameState = 'victory';
        this.isRunning = false;
        
        // Massive bonus for completing the game
        this.addScore(10000);
        this.saveHighScore();
        
        // Stop monitoring when game completes
        if (this.gameMonitor) {
            this.gameMonitor.stopMonitoring();
        }
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
        
        // Stop monitoring when game ends
        if (this.gameMonitor) {
            this.gameMonitor.stopMonitoring();
        }
    }

    // Game controls
    pause() {
        this.isPaused = true;
        this.gameState = 'paused';
        gameEvents.emit('gamePaused');
    }

    resume() {
        this.isPaused = false;
        this.gameState = 'playing';
        gameEvents.emit('gameResumed');
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
        gameEvents.emit('speedChanged', this.gameSpeed);
        return this.gameSpeed;
    }

    restart() {
        // Log restart event before resetting
        if (this.gameMonitor) {
            this.gameMonitor.logEvent('game_restarted', {
                previousScore: this.score,
                previousWave: this.waveManager.getCurrentWave(),
                previousHealth: this.health,
                previousMoney: this.money
            });
        }
        
        // Reset all game state
        this.health = this.maxHealth;
        this.money = 170; // Optimized starting money for static economy balance
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
        
        // Emit restart event
        gameEvents.emit('gameRestarted');
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
    
    // Game monitoring methods
    getMonitoringData() {
        return this.gameMonitor ? this.gameMonitor.exportSessionData() : null;
    }
    
    exportGameLog() {
        if (!this.gameMonitor) return null;
        
        const sessionData = this.gameMonitor.exportSessionData();
        const filename = `game-log-${this.gameMonitor.sessionId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        
        // Create download link
        const dataStr = JSON.stringify(sessionData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return sessionData;
    }
    
    getGameStatistics() {
        return this.gameMonitor ? this.gameMonitor.statistics : null;
    }
    
    getPerformanceMetrics() {
        return this.gameMonitor ? this.gameMonitor.sessionData.performance : null;
    }
}

// Initialize and start the game
let game;

function showLoadingStatus(message) {
    const loadingElement = document.querySelector('.loading-content h2');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
    console.log(message);
}

window.addEventListener('load', () => {
    showLoadingStatus('Window loaded, creating game...');
    try {
        game = new Game();
        // Export for debugging
        if (typeof window !== 'undefined') {
            window.game = game;
        }
        showLoadingStatus('Game created successfully!');
    } catch (error) {
        showLoadingStatus('Failed to create game: ' + error.message);
        console.error('Failed to create game:', error);
        console.error('Error stack:', error.stack);
    }
});
