// Game Monitor - Comprehensive game session logging and analytics
import { gameEvents, Vector2 } from './utils.js';

export class GameMonitor {
    constructor(game) {
        this.game = game;
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();
        this.gameStartTime = null;
        this.gameEndTime = null;
        
        // Event log storage
        this.eventLog = [];
        this.sessionData = {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            playerData: {},
            gameSettings: {},
            performance: {
                frameRates: [],
                memoryUsage: [],
                renderTimes: []
            }
        };
        
        // Statistics tracking
        this.statistics = {
            totalEvents: 0,
            eventTypes: new Map(),
            gameplayStats: {
                towersPlaced: 0,
                towersUpgraded: 0,
                towersSold: 0,
                enemiesKilled: 0,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                wavesCompleted: 0,
                gemsSocketed: 0,
                moneySpent: 0,
                moneyEarned: 0,
                maxConcurrentEnemies: 0,
                maxConcurrentProjectiles: 0
            }
        };
        
        // Performance monitoring
        this.performanceTimer = null;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        
        // Throttling for frequent events
        this.lastCountdownLog = 0;
        this.countdownLogInterval = 1000; // Log every 1 second instead of every frame
        
        // Event listeners setup
        this.setupEventListeners();
        
        // Start monitoring
        this.startMonitoring();
        
        console.log(`GameMonitor initialized for session: ${this.sessionId}`);
    }
    
    generateSessionId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 5);
        return `session_${timestamp}_${randomPart}`;
    }
    
    setupEventListeners() {
        // Core game events
        gameEvents.on('gameStarted', () => this.logEvent('game_started'));
        gameEvents.on('gameOver', (data) => this.logEvent('game_over', data));
        gameEvents.on('gamePaused', () => this.logEvent('game_paused'));
        gameEvents.on('gameResumed', () => this.logEvent('game_resumed'));
        gameEvents.on('gameRestarted', () => this.logEvent('game_restarted'));
        gameEvents.on('gameCompleted', () => this.logEvent('game_completed'));
        
        // Player state events
        gameEvents.on('healthChanged', (health) => this.logEvent('health_changed', { health, maxHealth: this.game.maxHealth }));
        gameEvents.on('moneyChanged', (money) => this.logEvent('money_changed', { money }));
        gameEvents.on('scoreChanged', (score) => this.logEvent('score_changed', { score }));
        
        // Tower events
        gameEvents.on('towerPlaced', (tower) => this.logTowerPlaced(tower));
        gameEvents.on('towerSelected', (tower) => this.logEvent('tower_selected', this.serializeTower(tower)));
        gameEvents.on('towerDeselected', () => this.logEvent('tower_deselected'));
        gameEvents.on('towerUpgraded', (tower) => this.logTowerUpgraded(tower));
        gameEvents.on('towerSold', (tower) => this.logTowerSold(tower));
        gameEvents.on('towerTargetChanged', (data) => this.logEvent('tower_target_changed', data));
        gameEvents.on('towerFired', (data) => this.logTowerFired(data));
        
        // Gem events
        gameEvents.on('gemSocketed', (data) => this.logGemSocketed(data));
        gameEvents.on('gemRemoved', (data) => this.logEvent('gem_removed', data));
        gameEvents.on('gemCombined', (data) => this.logEvent('gem_combined', data));
        
        // Enemy events
        gameEvents.on('enemySpawned', (enemy) => this.logEnemySpawned(enemy));
        gameEvents.on('enemyKilled', (enemy) => this.logEnemyKilled(enemy));
        gameEvents.on('enemyReachedEnd', (enemy) => this.logEvent('enemy_reached_end', this.serializeEnemy(enemy)));
        gameEvents.on('enemyRotated', (enemy) => this.logEvent('enemy_rotated', this.serializeEnemy(enemy)));
        gameEvents.on('enemyRotatedToStart', (enemy) => this.logEvent('enemy_rotated_to_start', this.serializeEnemy(enemy)));
        gameEvents.on('enemyDamaged', (data) => this.logEnemyDamaged(data));
        gameEvents.on('enemyHealed', (data) => this.logEvent('enemy_healed', data));
        gameEvents.on('enemySlowed', (data) => this.logEvent('enemy_slowed', data));
        gameEvents.on('enemyStunned', (data) => this.logEvent('enemy_stunned', data));
        
        // Wave events
        gameEvents.on('waveStarted', (wave) => this.logWaveStarted(wave));
        gameEvents.on('waveCompleted', (wave) => this.logWaveCompleted(wave));
        gameEvents.on('waveCountdownStarted', (data) => this.logEvent('wave_countdown_started', data));
        gameEvents.on('waveCountdownUpdate', (data) => this.logWaveCountdownUpdate(data));
        
        // Projectile events
        gameEvents.on('projectileFired', (projectile) => this.logProjectileFired(projectile));
        gameEvents.on('projectileHit', (data) => this.logProjectileHit(data));
        gameEvents.on('projectileMissed', (data) => this.logEvent('projectile_missed', data));
        gameEvents.on('explosion', (data) => this.logEvent('explosion', data));
        
        // UI events
        gameEvents.on('uiButtonClicked', (data) => this.logEvent('ui_button_clicked', data));
        gameEvents.on('speedChanged', (speed) => this.logEvent('speed_changed', { speed }));
        gameEvents.on('hotKeyPressed', (data) => this.logEvent('hotkey_pressed', data));
        
        // Error events
        gameEvents.on('error', (error) => this.logError(error));
        gameEvents.on('warning', (warning) => this.logEvent('warning', warning));
        
        // Performance events
        gameEvents.on('performanceIssue', (data) => this.logEvent('performance_issue', data));
        gameEvents.on('memoryWarning', (data) => this.logEvent('memory_warning', data));
    }
    
    logEvent(eventType, eventData = {}) {
        const timestamp = Date.now();
        const gameTime = this.gameStartTime ? timestamp - this.gameStartTime : 0;
        
        const event = {
            id: this.generateEventId(),
            timestamp,
            gameTime,
            sessionTime: timestamp - this.sessionStartTime,
            type: eventType,
            data: this.deepClone(eventData),
            gameState: this.captureGameState()
        };
        
        this.eventLog.push(event);
        this.statistics.totalEvents++;
        
        // Update event type counter
        const count = this.statistics.eventTypes.get(eventType) || 0;
        this.statistics.eventTypes.set(eventType, count + 1);
        
        // AI-readable console log - always output structured logs
        console.log(`[AI-LOG] ${this.formatEventForAI(event)}`);
        
        // Traditional debug log (can be disabled in production)
        if (process.env.NODE_ENV === 'development') {
            console.log(`[GameMonitor] ${eventType}:`, eventData);
        }
        
        // Trigger any external logging systems
        this.sendToExternalLogger(event);
        
        return event;
    }
    
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
    
    formatEventForAI(event) {
        // Create a compact, AI-readable log format
        const gameTimeSeconds = (event.gameTime / 1000).toFixed(2);
        const sessionTimeSeconds = (event.sessionTime / 1000).toFixed(2);
        
        // Core event info
        let logString = `TIME:${gameTimeSeconds}s SESSION:${sessionTimeSeconds}s TYPE:${event.type}`;
        
        // Add relevant game state
        const gs = event.gameState;
        if (gs) {
            logString += ` WAVE:${gs.currentWave} HEALTH:${gs.health}/${gs.maxHealth || 20} MONEY:${gs.money} SCORE:${gs.score}`;
            logString += ` ENEMIES:${gs.enemyCount} TOWERS:${gs.towerCount} PROJECTILES:${gs.projectileCount}`;
        }
        
        // Add event-specific data in a structured format
        if (event.data && Object.keys(event.data).length > 0) {
            logString += ` DATA:${this.formatDataForAI(event.data)}`;
        }
        
        return logString;
    }
    
    formatDataForAI(data) {
        // Convert complex data to AI-readable key:value pairs
        const pairs = [];
        
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) continue;
            
            if (typeof value === 'object' && !Array.isArray(value)) {
                // Handle nested objects
                if (value.x !== undefined && value.y !== undefined) {
                    pairs.push(`${key}:(${value.x.toFixed(1)},${value.y.toFixed(1)})`);
                } else {
                    // Flatten object
                    for (const [subKey, subValue] of Object.entries(value)) {
                        if (subValue !== null && subValue !== undefined) {
                            pairs.push(`${key}.${subKey}:${subValue}`);
                        }
                    }
                }
            } else if (Array.isArray(value)) {
                pairs.push(`${key}:[${value.join(',')}]`);
            } else {
                pairs.push(`${key}:${value}`);
            }
        }
        
        return pairs.join(' ');
    }
    
    captureGameState() {
        if (!this.game) return {};
        
        return {
            health: this.game.health,
            money: this.game.money,
            score: this.game.score,
            gameSpeed: this.game.gameSpeed,
            isPaused: this.game.isPaused,
            gameState: this.game.gameState,
            currentWave: this.game.waveManager ? this.game.waveManager.getCurrentWave() : 0,
            enemyCount: this.game.waveManager ? this.game.waveManager.getAllEnemies().length : 0,
            towerCount: this.game.towerManager ? this.game.towerManager.getAllTowers().length : 0,
            projectileCount: this.game.towerManager ? this.game.towerManager.projectiles.length : 0
        };
    }
    
    // Specialized logging methods for complex events
    logTowerPlaced(tower) {
        this.statistics.gameplayStats.towersPlaced++;
        this.statistics.gameplayStats.moneySpent += tower.cost || 0;
        
        this.logEvent('tower_placed', {
            ...this.serializeTower(tower),
            cost: tower.cost,
            remainingMoney: this.game.money
        });
    }
    
    logTowerUpgraded(tower) {
        this.statistics.gameplayStats.towersUpgraded++;
        this.statistics.gameplayStats.moneySpent += tower.upgradeCost || 0;
        
        this.logEvent('tower_upgraded', {
            ...this.serializeTower(tower),
            upgradeCost: tower.upgradeCost,
            newLevel: tower.level,
            remainingMoney: this.game.money
        });
    }
    
    logTowerSold(tower) {
        this.statistics.gameplayStats.towersSold++;
        this.statistics.gameplayStats.moneyEarned += tower.sellValue || 0;
        
        this.logEvent('tower_sold', {
            ...this.serializeTower(tower),
            sellValue: tower.sellValue,
            newMoney: this.game.money
        });
    }
    
    logTowerFired(data) {
        this.logEvent('tower_fired', {
            towerId: data.tower?.id,
            towerType: data.tower?.type,
            targetId: data.target?.id,
            targetType: data.target?.type,
            projectileType: data.projectileType,
            damage: data.damage,
            position: data.position
        });
    }
    
    logGemSocketed(data) {
        this.statistics.gameplayStats.gemsSocketed++;
        this.statistics.gameplayStats.moneySpent += data.gem?.cost || 0;
        
        this.logEvent('gem_socketed', {
            towerId: data.tower?.id,
            gemId: data.gem?.id,
            gemType: data.gem?.type,
            slotIndex: data.slotIndex,
            cost: data.gem?.cost,
            effects: data.gem?.effects
        });
    }
    
    logEnemySpawned(enemy) {
        this.logEvent('enemy_spawned', {
            ...this.serializeEnemy(enemy),
            waveNumber: this.game.waveManager?.getCurrentWave()
        });
        
        // Update max concurrent enemies
        const currentEnemies = this.game.waveManager?.getAllEnemies().length || 0;
        this.statistics.gameplayStats.maxConcurrentEnemies = Math.max(
            this.statistics.gameplayStats.maxConcurrentEnemies,
            currentEnemies
        );
    }
    
    logEnemyKilled(enemy) {
        this.statistics.gameplayStats.enemiesKilled++;
        this.statistics.gameplayStats.moneyEarned += enemy.reward || 0;
        
        this.logEvent('enemy_killed', {
            ...this.serializeEnemy(enemy),
            reward: enemy.reward,
            killedBy: enemy.killedBy || 'unknown',
            timeAlive: enemy.timeAlive || 0,
            distanceTraveled: enemy.distanceTraveled || 0
        });
    }
    
    logEnemyDamaged(data) {
        this.statistics.gameplayStats.totalDamageDealt += data.damage || 0;
        
        this.logEvent('enemy_damaged', {
            enemyId: data.enemy?.id,
            damage: data.damage,
            damageType: data.damageType,
            source: data.source,
            remainingHealth: data.enemy?.health,
            position: data.position
        });
    }
    
    logWaveStarted(wave) {
        this.logEvent('wave_started', {
            waveNumber: wave,
            enemyCount: this.game.waveManager?.getWaveEnemyCount(wave) || 0,
            playerMoney: this.game.money,
            playerHealth: this.game.health,
            towerCount: this.game.towerManager?.getAllTowers().length || 0
        });
    }
    
    logWaveCompleted(wave) {
        this.statistics.gameplayStats.wavesCompleted++;
        
        this.logEvent('wave_completed', {
            waveNumber: wave,
            timeToComplete: this.game.waveManager?.getWaveCompletionTime(wave) || 0,
            enemiesKilled: this.game.waveManager?.getWaveEnemiesKilled(wave) || 0,
            damageDealt: this.game.waveManager?.getWaveDamageDealt(wave) || 0,
            moneyEarned: this.game.waveManager?.getWaveMoneyEarned(wave) || 0,
            playerHealth: this.game.health,
            playerMoney: this.game.money
        });
    }
    
    logWaveCountdownUpdate(data) {
        // Throttle countdown updates to reduce log flooding
        const now = Date.now();
        if (now - this.lastCountdownLog >= this.countdownLogInterval) {
            this.logEvent('wave_countdown_update', data);
            this.lastCountdownLog = now;
        }
    }
    
    logProjectileFired(projectile) {
        this.logEvent('projectile_fired', {
            id: projectile.id,
            type: projectile.type,
            damage: projectile.damage,
            speed: projectile.speed,
            source: projectile.source,
            target: projectile.target?.id,
            position: {
                x: projectile.position?.x,
                y: projectile.position?.y
            }
        });
        
        // Update max concurrent projectiles
        const currentProjectiles = this.game.towerManager?.projectiles.length || 0;
        this.statistics.gameplayStats.maxConcurrentProjectiles = Math.max(
            this.statistics.gameplayStats.maxConcurrentProjectiles,
            currentProjectiles
        );
    }
    
    logProjectileHit(data) {
        this.logEvent('projectile_hit', {
            projectileId: data.projectile?.id,
            targetId: data.target?.id,
            damage: data.damage,
            damageType: data.damageType,
            position: data.position,
            effects: data.effects
        });
    }
    
    logError(error) {
        this.logEvent('error', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }
    
    // Serialization helpers
    serializeTower(tower) {
        if (!tower) return {};
        
        return {
            id: tower.id,
            type: tower.type,
            level: tower.level,
            position: {
                x: tower.position?.x,
                y: tower.position?.y
            },
            damage: tower.damage,
            range: tower.range,
            fireRate: tower.fireRate,
            cost: tower.cost,
            gems: tower.gems?.map(gem => this.serializeGem(gem)) || [],
            totalDamageDealt: tower.totalDamageDealt || 0,
            enemiesKilled: tower.enemiesKilled || 0
        };
    }
    
    serializeEnemy(enemy) {
        if (!enemy) return {};
        
        return {
            id: enemy.id,
            type: enemy.type,
            health: enemy.health,
            maxHealth: enemy.maxHealth,
            speed: enemy.speed,
            position: {
                x: enemy.position?.x,
                y: enemy.position?.y
            },
            pathProgress: enemy.pathProgress || 0,
            reward: enemy.reward,
            armor: enemy.armor,
            resistances: enemy.resistances || [],
            immunities: enemy.immunities || [],
            statusEffects: enemy.statusEffects || []
        };
    }
    
    serializeGem(gem) {
        if (!gem) return {};
        
        return {
            id: gem.id,
            type: gem.type,
            rarity: gem.rarity,
            cost: gem.cost,
            effects: gem.effects,
            level: gem.level || 1
        };
    }
    
    // Performance monitoring
    startMonitoring() {
        this.gameStartTime = Date.now();
        this.logEvent('monitoring_started');
        
        // Start performance monitoring interval
        this.performanceTimer = setInterval(() => {
            this.capturePerformanceMetrics();
        }, 1000); // Capture every second
        
        // Monitor frame rate
        this.monitorFrameRate();
    }
    
    stopMonitoring() {
        this.gameEndTime = Date.now();
        this.logEvent('monitoring_stopped');
        
        if (this.performanceTimer) {
            clearInterval(this.performanceTimer);
            this.performanceTimer = null;
        }
        
        // Automatically export AI-readable log when monitoring stops
        setTimeout(() => {
            this.exportAIReadableLog();
        }, 100); // Small delay to ensure final events are logged
    }
    
    capturePerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            fps: this.getCurrentFPS(),
            memoryUsage: this.getMemoryUsage(),
            activeElements: {
                enemies: this.game.waveManager?.getAllEnemies().length || 0,
                towers: this.game.towerManager?.getAllTowers().length || 0,
                projectiles: this.game.towerManager?.projectiles.length || 0,
                particles: this.game.particleSystem?.particles.length || 0
            }
        };
        
        this.sessionData.performance.frameRates.push(metrics.fps);
        this.sessionData.performance.memoryUsage.push(metrics.memoryUsage);
        
        // Log performance issues
        if (metrics.fps < 30) {
            this.logEvent('performance_issue', {
                type: 'low_fps',
                fps: metrics.fps,
                ...metrics.activeElements
            });
        }
        
        if (metrics.memoryUsage > 100) { // > 100MB
            this.logEvent('memory_warning', {
                usage: metrics.memoryUsage,
                ...metrics.activeElements
            });
        }
    }
    
    monitorFrameRate() {
        const measureFrame = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastFrameTime;
            this.frameCount++;
            
            if (this.frameCount % 60 === 0) { // Every 60 frames
                const fps = 1000 / deltaTime;
                this.sessionData.performance.frameRates.push(fps);
            }
            
            this.lastFrameTime = currentTime;
            
            if (this.performanceTimer) {
                requestAnimationFrame(measureFrame);
            }
        };
        
        requestAnimationFrame(measureFrame);
    }
    
    getCurrentFPS() {
        const recentFrames = this.sessionData.performance.frameRates.slice(-10);
        if (recentFrames.length === 0) return 60;
        
        const average = recentFrames.reduce((sum, fps) => sum + fps, 0) / recentFrames.length;
        return Math.round(average);
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
        }
        return 0;
    }
    
    // Data export and analysis
    exportSessionData() {
        return {
            ...this.sessionData,
            eventLog: this.eventLog,
            statistics: {
                ...this.statistics,
                eventTypes: Array.from(this.statistics.eventTypes.entries())
            },
            summary: this.generateSessionSummary()
        };
    }
    
    exportAIReadableLog() {
        // Export entire session as AI-readable console logs
        console.log('\n=== AI-READABLE GAME SESSION LOG ===');
        console.log(`SESSION_ID:${this.sessionId}`);
        console.log(`SESSION_START:${new Date(this.sessionStartTime).toISOString()}`);
        console.log(`SESSION_DURATION:${((Date.now() - this.sessionStartTime) / 1000).toFixed(2)}s`);
        
        if (this.gameStartTime) {
            console.log(`GAME_DURATION:${(((this.gameEndTime || Date.now()) - this.gameStartTime) / 1000).toFixed(2)}s`);
        }
        
        console.log('\n--- EVENT LOG ---');
        this.eventLog.forEach(event => {
            console.log(`[AI-LOG] ${this.formatEventForAI(event)}`);
        });
        
        console.log('\n--- SESSION STATISTICS ---');
        const stats = this.statistics.gameplayStats;
        console.log(`[AI-SUMMARY] TOWERS_PLACED:${stats.towersPlaced} TOWERS_UPGRADED:${stats.towersUpgraded} TOWERS_SOLD:${stats.towersSold}`);
        console.log(`[AI-SUMMARY] ENEMIES_KILLED:${stats.enemiesKilled} WAVES_COMPLETED:${stats.wavesCompleted} GEMS_SOCKETED:${stats.gemsSocketed}`);
        console.log(`[AI-SUMMARY] MONEY_SPENT:${stats.moneySpent} MONEY_EARNED:${stats.moneyEarned} DAMAGE_DEALT:${stats.totalDamageDealt}`);
        console.log(`[AI-SUMMARY] MAX_ENEMIES:${stats.maxConcurrentEnemies} MAX_PROJECTILES:${stats.maxConcurrentProjectiles}`);
        console.log(`[AI-SUMMARY] FINAL_SCORE:${this.game.score} FINAL_HEALTH:${this.game.health} FINAL_MONEY:${this.game.money}`);
        
        const efficiency = this.calculateGameplayEfficiency();
        console.log(`[AI-EFFICIENCY] DAMAGE_PER_TOWER:${efficiency.damagePerTower.toFixed(2)} KILLS_PER_TOWER:${efficiency.killsPerTower.toFixed(2)}`);
        console.log(`[AI-EFFICIENCY] MONEY_EFFICIENCY:${efficiency.moneyEfficiency.toFixed(2)} UPGRADE_RATE:${efficiency.upgradeRate.toFixed(2)}`);
        
        const performance = this.calculatePlayerPerformance();
        console.log(`[AI-PERFORMANCE] SURVIVAL_RATE:${performance.survivalRate.toFixed(2)} SCORE_EFFICIENCY:${performance.scoreEfficiency.toFixed(2)}`);
        
        console.log('=== END AI-READABLE LOG ===\n');
        
        return this.eventLog.map(event => this.formatEventForAI(event)).join('\n');
    }
    
    generateSessionSummary() {
        const sessionDuration = (this.gameEndTime || Date.now()) - this.sessionStartTime;
        const gameDuration = this.gameEndTime && this.gameStartTime ? 
            this.gameEndTime - this.gameStartTime : 0;
        
        return {
            sessionDuration,
            gameDuration,
            totalEvents: this.statistics.totalEvents,
            averageFPS: this.getAverageFPS(),
            averageMemoryUsage: this.getAverageMemoryUsage(),
            gameplayEfficiency: this.calculateGameplayEfficiency(),
            playerPerformance: this.calculatePlayerPerformance()
        };
    }
    
    getAverageFPS() {
        const frameRates = this.sessionData.performance.frameRates;
        if (frameRates.length === 0) return 0;
        
        return frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
    }
    
    getAverageMemoryUsage() {
        const memoryUsage = this.sessionData.performance.memoryUsage;
        if (memoryUsage.length === 0) return 0;
        
        return memoryUsage.reduce((sum, usage) => sum + usage, 0) / memoryUsage.length;
    }
    
    calculateGameplayEfficiency() {
        const stats = this.statistics.gameplayStats;
        
        return {
            damagePerTower: stats.towersPlaced > 0 ? stats.totalDamageDealt / stats.towersPlaced : 0,
            killsPerTower: stats.towersPlaced > 0 ? stats.enemiesKilled / stats.towersPlaced : 0,
            moneyEfficiency: stats.moneySpent > 0 ? stats.moneyEarned / stats.moneySpent : 0,
            upgradeRate: stats.towersPlaced > 0 ? stats.towersUpgraded / stats.towersPlaced : 0
        };
    }
    
    calculatePlayerPerformance() {
        return {
            survivalRate: this.game.health / this.game.maxHealth,
            waveProgressionRate: this.statistics.gameplayStats.wavesCompleted,
            resourceManagement: this.game.money,
            scoreEfficiency: this.game.score / Math.max(1, this.statistics.gameplayStats.moneySpent)
        };
    }
    
    // External logging integration
    sendToExternalLogger(event) {
        // This can be extended to send to external analytics services
        // For now, we'll just store locally and provide export functionality
        
        // Example: Send to analytics service
        // if (window.analytics) {
        //     window.analytics.track(event.type, event.data);
        // }
    }
    
    // Utility methods
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Vector2) return { x: obj.x, y: obj.y };
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
    
    // Query methods for analysis
    getEventsByType(eventType) {
        return this.eventLog.filter(event => event.type === eventType);
    }
    
    getEventsInTimeRange(startTime, endTime) {
        return this.eventLog.filter(event => 
            event.timestamp >= startTime && event.timestamp <= endTime
        );
    }
    
    getEventsByGameTime(startGameTime, endGameTime) {
        return this.eventLog.filter(event => 
            event.gameTime >= startGameTime && event.gameTime <= endGameTime
        );
    }
    
    getTowerStatistics() {
        const towerEvents = this.getEventsByType('tower_placed');
        const towerTypes = {};
        
        towerEvents.forEach(event => {
            const type = event.data.type;
            if (!towerTypes[type]) {
                towerTypes[type] = {
                    count: 0,
                    totalCost: 0,
                    averageDamage: 0
                };
            }
            towerTypes[type].count++;
            towerTypes[type].totalCost += event.data.cost || 0;
        });
        
        return towerTypes;
    }
    
    getWaveStatistics() {
        const waveEvents = this.getEventsByType('wave_completed');
        return waveEvents.map(event => ({
            wave: event.data.waveNumber,
            completionTime: event.data.timeToComplete,
            enemiesKilled: event.data.enemiesKilled,
            damageDealt: event.data.damageDealt,
            moneyEarned: event.data.moneyEarned
        }));
    }
    
    // Cleanup
    destroy() {
        this.stopMonitoring();
        this.eventLog = [];
        this.sessionData = null;
        this.statistics = null;
        
        console.log(`GameMonitor destroyed for session: ${this.sessionId}`);
    }
}

// Global access for AI analysis
window.GameMonitoringAPI = {
    getCurrentSession: () => {
        // Find the current game instance and its monitor
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas && gameCanvas.game && gameCanvas.game.gameMonitor) {
            return gameCanvas.game.gameMonitor;
        }
        return null;
    },
    
    exportCurrentLog: () => {
        const monitor = window.GameMonitoringAPI.getCurrentSession();
        if (monitor) {
            return monitor.exportAIReadableLog();
        }
        console.log('No active game session found');
        return null;
    },
    
    getSessionStats: () => {
        const monitor = window.GameMonitoringAPI.getCurrentSession();
        if (monitor) {
            return monitor.statistics;
        }
        return null;
    },
    
    getLiveGameState: () => {
        const monitor = window.GameMonitoringAPI.getCurrentSession();
        if (monitor) {
            return monitor.captureGameState();
        }
        return null;
    },
    
    downloadSessionLog: () => {
        const monitor = window.GameMonitoringAPI.getCurrentSession();
        if (monitor) {
            const sessionData = monitor.exportSessionData();
            const filename = `game-session-${monitor.sessionId}.json`;
            const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            console.log(`Downloaded session log: ${filename}`);
        }
    }
};

// Export helper functions for external use
export const MonitoringUtils = {
    formatEventLog: (eventLog) => {
        return eventLog.map(event => ({
            time: new Date(event.timestamp).toISOString(),
            gameTime: `${(event.gameTime / 1000).toFixed(2)}s`,
            type: event.type,
            data: event.data
        }));
    },
    
    exportToCSV: (eventLog) => {
        const headers = ['timestamp', 'gameTime', 'type', 'data'];
        const rows = eventLog.map(event => [
            event.timestamp,
            event.gameTime,
            event.type,
            JSON.stringify(event.data)
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    },
    
    exportToJSON: (sessionData) => {
        return JSON.stringify(sessionData, null, 2);
    },
    
    exportToAIFormat: (eventLog) => {
        // Export in the same AI-readable format used by the monitor
        return eventLog.map(event => {
            const gameTime = (event.gameTime / 1000).toFixed(2);
            const sessionTime = (event.sessionTime / 1000).toFixed(2);
            let logString = `TIME:${gameTime}s SESSION:${sessionTime}s TYPE:${event.type}`;
            
            const gs = event.gameState;
            if (gs) {
                logString += ` WAVE:${gs.currentWave} HEALTH:${gs.health}/${gs.maxHealth || 20} MONEY:${gs.money} SCORE:${gs.score}`;
                logString += ` ENEMIES:${gs.enemyCount} TOWERS:${gs.towerCount} PROJECTILES:${gs.projectileCount}`;
            }
            
            if (event.data && Object.keys(event.data).length > 0) {
                // Simple data formatting for export
                const dataStr = Object.entries(event.data)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(' ');
                logString += ` DATA:${dataStr}`;
            }
            
            return logString;
        }).join('\n');
    },
    
    analyzeSessionPatterns: (eventLog) => {
        // Basic pattern analysis for AI
        const patterns = {
            towerPlacementTiming: [],
            waveProgression: [],
            economicDecisions: [],
            strategicPatterns: []
        };
        
        let lastWaveStart = 0;
        let waveStartMoney = 0;
        
        eventLog.forEach(event => {
            switch (event.type) {
                case 'wave_started':
                    lastWaveStart = event.gameTime;
                    waveStartMoney = event.gameState.money;
                    break;
                case 'tower_placed':
                    const timeSinceWave = event.gameTime - lastWaveStart;
                    patterns.towerPlacementTiming.push({
                        wave: event.gameState.currentWave,
                        timingInWave: timeSinceWave,
                        towerType: event.data.type,
                        moneyBefore: event.gameState.money + (event.data.cost || 0),
                        moneyAfter: event.gameState.money
                    });
                    break;
                case 'wave_completed':
                    patterns.waveProgression.push({
                        wave: event.data.waveNumber,
                        completionTime: event.data.timeToComplete,
                        startMoney: waveStartMoney,
                        endMoney: event.gameState.money,
                        health: event.gameState.health,
                        towerCount: event.gameState.towerCount
                    });
                    break;
            }
        });
        
        return patterns;
    }
};
