// Enemies.js - Enemy classes and wave management
import { Vector2, GameMath, Timer, Pathfinding, gameEvents } from './utils.js';

export class Enemy {
    constructor(type, position, path) {
        this.type = type;
        this.position = new Vector2(position.x, position.y);
        this.path = path;
        this.pathIndex = 0;
        this.target = path.length > 0 ? path[0] : position;
        
        // Stats based on enemy type
        const stats = this.getStatsForType(type);
        this.maxHealth = stats.health;
        this.health = stats.health;
        this.speed = stats.speed;
        this.reward = stats.reward;
        this.armor = stats.armor || 0;
        this.resistances = stats.resistances || {};
        this.size = stats.size || 20;
        this.color = stats.color;
        this.emoji = stats.emoji;
        
        // Status effects
        this.effects = new Map();
        this.slowFactor = 1.0;
        this.poisonDamage = 0;
        
        // Visual properties
        this.animationTime = 0;
        this.flashTime = 0;
        this.isFlashing = false;
        
        // Death properties
        this.isDead = false;
        this.reachedEnd = false;
    }

    getStatsForType(type) {
        const enemyTypes = {
            'basic': {
                health: 100,
                speed: 50,
                reward: 10,
                color: '#8B4513',
                emoji: '🐛',
                size: 16
            },
            'fast': {
                health: 60,
                speed: 80,
                reward: 12,
                color: '#00CED1',
                emoji: '🦎',
                size: 14
            },
            'heavy': {
                health: 200,
                speed: 30,
                reward: 20,
                armor: 5,
                color: '#696969',
                emoji: '🐢',
                size: 24
            },
            'flying': {
                health: 80,
                speed: 70,
                reward: 15,
                resistances: { 'basic': 0.5 },
                color: '#9370DB',
                emoji: '🦋',
                size: 18
            },
            'regenerating': {
                health: 120,
                speed: 40,
                reward: 18,
                color: '#32CD32',
                emoji: '🦠',
                size: 20
            },
            'boss': {
                health: 500,
                speed: 25,
                reward: 100,
                armor: 10,
                resistances: { 'poison': 0.3, 'slow': 0.5 },
                color: '#DC143C',
                emoji: '👹',
                size: 32
            },
            'mini_boss': {
                health: 300,
                speed: 35,
                reward: 50,
                armor: 5,
                resistances: { 'splash': 0.7 },
                color: '#FF4500',
                emoji: '🎃',
                size: 28
            }
        };

        return enemyTypes[type] || enemyTypes['basic'];
    }

    update(deltaTime) {
        if (this.isDead || this.reachedEnd) return;

        // Update animation time
        this.animationTime += deltaTime;
        
        // Update flash effect
        if (this.isFlashing) {
            this.flashTime -= deltaTime;
            if (this.flashTime <= 0) {
                this.isFlashing = false;
            }
        }

        // Apply status effects
        this.updateStatusEffects(deltaTime);

        // Move towards target
        this.moveTowardsTarget(deltaTime);

        // Check if reached current target
        if (this.position.distance(this.target) < 5) {
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.reachedEnd = true;
                gameEvents.emit('enemyReachedEnd', this);
            } else {
                this.target = this.path[this.pathIndex];
            }
        }

        // Handle regenerating enemies
        if (this.type === 'regenerating' && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 10 * deltaTime);
        }
    }

    moveTowardsTarget(deltaTime) {
        const direction = this.target.subtract(this.position).normalize();
        const moveSpeed = this.speed * this.slowFactor * deltaTime;
        this.position = this.position.add(direction.multiply(moveSpeed));
    }

    updateStatusEffects(deltaTime) {
        // Reset modifiers
        this.slowFactor = 1.0;
        this.poisonDamage = 0;

        // Apply active effects
        for (const [effectType, effect] of this.effects.entries()) {
            effect.duration -= deltaTime;
            
            switch (effectType) {
                case 'slow':
                    this.slowFactor *= effect.factor;
                    break;
                case 'poison':
                    this.poisonDamage += effect.dps * deltaTime;
                    break;
            }

            // Remove expired effects
            if (effect.duration <= 0) {
                this.effects.delete(effectType);
            }
        }

        // Apply poison damage
        if (this.poisonDamage > 0) {
            this.takeDamage(this.poisonDamage, 'poison');
        }
    }

    takeDamage(damage, damageType = 'basic') {
        if (this.isDead) return 0;

        // Apply armor reduction
        const armorReduction = this.armor / (this.armor + 100);
        damage *= (1 - armorReduction);

        // Apply resistance
        if (this.resistances[damageType]) {
            damage *= (1 - this.resistances[damageType]);
        }

        // Apply damage
        const actualDamage = Math.max(1, Math.floor(damage));
        this.health -= actualDamage;
        
        // Flash effect
        this.isFlashing = true;
        this.flashTime = 0.1;

        // Check if dead
        if (this.health <= 0) {
            this.isDead = true;
            gameEvents.emit('enemyKilled', this);
        }

        return actualDamage;
    }

    applyEffect(effectType, effect) {
        // Apply resistance to status effects
        if (this.resistances[effectType]) {
            if (effectType === 'slow') {
                effect.factor = 1 - ((1 - effect.factor) * (1 - this.resistances[effectType]));
            } else {
                effect.duration *= (1 - this.resistances[effectType]);
            }
        }

        this.effects.set(effectType, effect);
    }

    render(ctx) {
        if (this.isDead && !this.isFlashing) return;

        ctx.save();

        // Flash effect when taking damage
        if (this.isFlashing) {
            ctx.filter = 'brightness(200%)';
        }

        // Health bar background
        const healthBarWidth = this.size + 10;
        const healthBarHeight = 4;
        const healthBarY = this.position.y - this.size - 8;
        
        ctx.fillStyle = '#444';
        ctx.fillRect(
            this.position.x - healthBarWidth / 2,
            healthBarY,
            healthBarWidth,
            healthBarHeight
        );

        // Health bar fill
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                           healthPercent > 0.3 ? '#FF9800' : '#F44336';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(
            this.position.x - healthBarWidth / 2,
            healthBarY,
            healthBarWidth * healthPercent,
            healthBarHeight
        );

        // Enemy body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Enemy emoji/icon
        ctx.fillStyle = 'white';
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.position.x, this.position.y);

        // Status effect indicators
        this.renderStatusEffects(ctx);

        ctx.restore();
    }

    renderStatusEffects(ctx) {
        let effectY = this.position.y + this.size / 2 + 8;
        
        if (this.effects.has('slow')) {
            ctx.fillStyle = '#4FC3F7';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('❄️', this.position.x - 10, effectY);
        }
        
        if (this.effects.has('poison')) {
            ctx.fillStyle = '#8BC34A';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('☠️', this.position.x + 10, effectY);
        }
    }

    getPosition() {
        return this.position;
    }

    isAlive() {
        return !this.isDead && !this.reachedEnd;
    }
}

export class WaveManager {
    constructor() {
        this.currentWave = 0;
        this.isWaveActive = false;
        this.enemies = [];
        this.spawnTimer = new Timer(0, () => this.spawnNextEnemy());
        this.waveTimer = new Timer(0, () => this.endWave());
        this.enemiesSpawned = 0;
        this.enemiesInCurrentWave = 0;
        this.path = [];
        this.spawnPosition = new Vector2(0, 0);
        this.wavePrepTime = 3.0; // Seconds between waves
        this.isPreparingWave = false;
        this.waveData = this.generateWaveData();
    }

    generateWaveData() {
        const waves = [];
        
        for (let wave = 1; wave <= 50; wave++) {
            const waveInfo = {
                wave: wave,
                enemies: [],
                spawnInterval: Math.max(0.3, 1.0 - wave * 0.01), // Faster spawning each wave
                prepTime: 3.0
            };

            // Determine enemy composition based on wave number
            if (wave <= 5) {
                // Early waves - mostly basic enemies
                for (let i = 0; i < 8 + wave * 2; i++) {
                    waveInfo.enemies.push('basic');
                }
            } else if (wave <= 10) {
                // Introduce fast enemies
                for (let i = 0; i < 6 + wave; i++) {
                    waveInfo.enemies.push(Math.random() < 0.7 ? 'basic' : 'fast');
                }
            } else if (wave <= 15) {
                // Add heavy enemies
                for (let i = 0; i < 8 + wave; i++) {
                    const rand = Math.random();
                    if (rand < 0.5) waveInfo.enemies.push('basic');
                    else if (rand < 0.8) waveInfo.enemies.push('fast');
                    else waveInfo.enemies.push('heavy');
                }
            } else if (wave <= 25) {
                // Add flying enemies
                for (let i = 0; i < 10 + wave; i++) {
                    const rand = Math.random();
                    if (rand < 0.3) waveInfo.enemies.push('basic');
                    else if (rand < 0.5) waveInfo.enemies.push('fast');
                    else if (rand < 0.7) waveInfo.enemies.push('heavy');
                    else waveInfo.enemies.push('flying');
                }
            } else {
                // Advanced waves with all enemy types
                for (let i = 0; i < 12 + wave; i++) {
                    const rand = Math.random();
                    if (rand < 0.2) waveInfo.enemies.push('basic');
                    else if (rand < 0.35) waveInfo.enemies.push('fast');
                    else if (rand < 0.5) waveInfo.enemies.push('heavy');
                    else if (rand < 0.7) waveInfo.enemies.push('flying');
                    else waveInfo.enemies.push('regenerating');
                }
            }

            // Add boss every 5 waves
            if (wave % 5 === 0) {
                if (wave % 10 === 0) {
                    waveInfo.enemies.push('boss');
                } else {
                    waveInfo.enemies.push('mini_boss');
                }
            }

            waves.push(waveInfo);
        }

        return waves;
    }

    setPath(path) {
        this.path = path;
        if (path.length > 0) {
            this.spawnPosition = path[0];
        }
    }

    startWave(waveNumber = null) {
        if (this.isWaveActive || this.isPreparingWave) return false;

        if (waveNumber !== null) {
            this.currentWave = waveNumber - 1;
        }

        this.currentWave++;
        
        if (this.currentWave > this.waveData.length) {
            // Game completed!
            gameEvents.emit('gameCompleted');
            return false;
        }

        this.isPreparingWave = true;
        
        // Prepare wave
        const wave = this.waveData[this.currentWave - 1];
        this.enemiesInCurrentWave = wave.enemies.length;
        this.enemiesSpawned = 0;
        
        // Set spawn interval
        this.spawnTimer.duration = wave.spawnInterval;
        this.spawnTimer.reset();

        // Start preparation timer
        setTimeout(() => {
            this.isPreparingWave = false;
            this.isWaveActive = true;
            this.spawnTimer.start();
            gameEvents.emit('waveStarted', this.currentWave);
        }, wave.prepTime * 1000);

        gameEvents.emit('wavePreparation', {
            wave: this.currentWave,
            enemies: wave.enemies,
            prepTime: wave.prepTime
        });

        return true;
    }

    spawnNextEnemy() {
        if (!this.isWaveActive || this.enemiesSpawned >= this.enemiesInCurrentWave) {
            return;
        }

        const wave = this.waveData[this.currentWave - 1];
        const enemyType = wave.enemies[this.enemiesSpawned];
        
        const enemy = new Enemy(enemyType, this.spawnPosition, this.getWorldPath());
        this.enemies.push(enemy);
        this.enemiesSpawned++;

        // Schedule next spawn
        if (this.enemiesSpawned < this.enemiesInCurrentWave) {
            this.spawnTimer.reset();
            this.spawnTimer.start();
        } else {
            // All enemies spawned, start checking for wave completion
            this.checkWaveCompletion();
        }

        gameEvents.emit('enemySpawned', enemy);
    }

    getWorldPath() {
        // Convert grid path to world coordinates
        // This would depend on your grid system
        return this.path.map(point => new Vector2(point.x * 40 + 20, point.y * 40 + 20));
    }

    checkWaveCompletion() {
        if (!this.isWaveActive) return;

        const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive());
        
        if (this.enemiesSpawned >= this.enemiesInCurrentWave && aliveEnemies.length === 0) {
            this.endWave();
        }
    }

    endWave() {
        if (!this.isWaveActive) return;

        this.isWaveActive = false;
        gameEvents.emit('waveCompleted', this.currentWave);
    }

    update(deltaTime) {
        // Update timers
        this.spawnTimer.update(deltaTime);
        this.waveTimer.update(deltaTime);

        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime);

            // Remove dead or escaped enemies
            if (enemy.isDead || enemy.reachedEnd) {
                this.enemies.splice(i, 1);
            }
        }

        // Check wave completion
        if (this.isWaveActive) {
            this.checkWaveCompletion();
        }
    }

    render(ctx) {
        // Render all enemies
        for (const enemy of this.enemies) {
            enemy.render(ctx);
        }
    }

    getAllEnemies() {
        return this.enemies.filter(enemy => enemy.isAlive());
    }

    getCurrentWave() {
        return this.currentWave;
    }

    getWaveProgress() {
        if (!this.isWaveActive) return 1.0;
        
        const totalEnemies = this.enemiesInCurrentWave;
        const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive()).length;
        const spawnedEnemies = this.enemiesSpawned;
        
        return Math.max(0, (totalEnemies - aliveEnemies) / totalEnemies);
    }

    getNextWavePreview() {
        if (this.currentWave >= this.waveData.length) {
            return null;
        }
        
        const nextWave = this.waveData[this.currentWave];
        const enemyCount = {};
        
        for (const enemyType of nextWave.enemies) {
            enemyCount[enemyType] = (enemyCount[enemyType] || 0) + 1;
        }
        
        return {
            wave: this.currentWave + 1,
            enemies: enemyCount,
            total: nextWave.enemies.length
        };
    }

    canStartNextWave() {
        return !this.isWaveActive && !this.isPreparingWave && this.currentWave < this.waveData.length;
    }

    forceNextWave() {
        if (this.canStartNextWave()) {
            return this.startWave();
        }
        return false;
    }

    reset() {
        this.currentWave = 0;
        this.isWaveActive = false;
        this.isPreparingWave = false;
        this.enemies = [];
        this.enemiesSpawned = 0;
        this.enemiesInCurrentWave = 0;
        this.spawnTimer.stop();
        this.waveTimer.stop();
    }

    getEnemiesLeft() {
        return this.enemies.filter(enemy => enemy.isAlive()).length;
    }
}
