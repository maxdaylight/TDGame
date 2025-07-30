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
        this.immunities = stats.immunities || [];
        this.size = stats.size || 20;
        this.color = stats.color;
        this.emoji = stats.emoji;
        
        // Special properties based on type
        this.shield = stats.shield || 0;
        this.maxShield = stats.shield || 0;
        this.shieldRegen = stats.shieldRegen || 0;
        this.shieldRegenTimer = 0;
        this.regenRate = stats.regenRate || 0;
        this.abilities = stats.abilities || [];
        
        // Stealth properties
        this.stealthCooldown = stats.stealthCooldown || 0;
        this.stealthDuration = stats.stealthDuration || 0;
        this.stealthTimer = 0;
        this.isInvisible = false;
        
        // Berserker properties
        this.rageThreshold = stats.rageThreshold || 0;
        this.rageSpeedMultiplier = stats.rageSpeedMultiplier || 1;
        this.isEnraged = false;
        
        // Splitter properties
        this.splitCount = stats.splitCount || 0;
        this.splitHealth = stats.splitHealth || 0;
        this.hasSplit = false;
        
        // Teleporter properties
        this.teleportCooldown = stats.teleportCooldown || 0;
        this.teleportDistance = stats.teleportDistance || 0;
        this.teleportTimer = 0;
        
        // Healer properties
        this.healRange = stats.healRange || 0;
        this.healAmount = stats.healAmount || 0;
        this.healCooldown = stats.healCooldown || 0;
        this.healTimer = 0;
        
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
                health: 85, // Balanced between too easy and too hard
                speed: 50,
                reward: 5, // Maintain good economy rewards
                color: '#8B4513',
                emoji: '🐛',
                size: 16
            },
            'fast': {
                health: 60, // Proportionally adjusted
                speed: 90,
                reward: 7, // Higher reward for higher difficulty
                color: '#00CED1',
                emoji: '🦎',
                size: 14
            },
            'heavy': {
                health: 350,
                speed: 25,
                reward: 12, // Reduced from 20
                armor: 8,
                color: '#696969',
                emoji: '🐢',
                size: 24
            },
            'flying': {
                health: 140, // Increased to make flying enemies more threatening
                speed: 75,
                reward: 8, // Reduced from 15
                resistances: { 'basic': 0.5, 'splash': 0.3 },
                color: '#9370DB',
                emoji: '🦋',
                size: 18
            },
            'regenerating': {
                health: 210, // Significantly increased to counter easy killing
                speed: 40,
                reward: 10, // Reduced from 18
                regenRate: 15, // HP per second
                color: '#32CD32',
                emoji: '🦠',
                size: 20
            },
            'stealth': {
                health: 130, // Increased stealth enemy health
                speed: 60,
                reward: 12,
                stealthCooldown: 8, // Becomes invisible every 8 seconds
                stealthDuration: 3, // Invisible for 3 seconds
                color: '#483D8B',
                emoji: '👻',
                size: 16
            },
            'shielded': {
                health: 200,
                speed: 45,
                reward: 15,
                shield: 100, // Absorbs damage before health
                shieldRegen: 10, // Shield regens when not taking damage
                color: '#4682B4',
                emoji: '🛡️',
                size: 22
            },
            'berserker': {
                health: 250,
                speed: 35,
                reward: 18,
                rageThreshold: 0.5, // Goes berserk at 50% health
                rageSpeedMultiplier: 2.5,
                color: '#B22222',
                emoji: '😡',
                size: 20
            },
            'splitter': {
                health: 180,
                speed: 50,
                reward: 14,
                splitCount: 3, // Splits into 3 smaller enemies
                splitHealth: 60,
                color: '#DDA0DD',
                emoji: '🪱',
                size: 18
            },
            'teleporter': {
                health: 120,
                speed: 55,
                reward: 16,
                teleportCooldown: 6, // Teleports every 6 seconds
                teleportDistance: 100,
                color: '#FF69B4',
                emoji: '🌀',
                size: 16
            },
            'immune': {
                health: 300,
                speed: 40,
                reward: 25,
                immunities: ['poison', 'slow'], // Immune to poison and slow
                resistances: { 'fire': 0.5 },
                color: '#DAA520',
                emoji: '⚔️',
                size: 20
            },
            'healer': {
                health: 150,
                speed: 35,
                reward: 20,
                healRange: 80,
                healAmount: 20,
                healCooldown: 4,
                color: '#98FB98',
                emoji: '💚',
                size: 18
            },
            'boss': {
                health: 800,
                speed: 30,
                reward: 50, // Reduced from 100
                armor: 15,
                resistances: { 'poison': 0.2, 'slow': 0.4, 'fire': 0.3 },
                abilities: ['teleport', 'summon'],
                color: '#DC143C',
                emoji: '👹',
                size: 36
            },
            'mini_boss': {
                health: 500,
                speed: 40,
                reward: 30, // Reduced from 50
                armor: 10,
                resistances: { 'splash': 0.6, 'basic': 0.2 },
                abilities: ['charge'],
                color: '#FF4500',
                emoji: '🎃',
                size: 32
            },
            'mega_boss': {
                health: 1500,
                speed: 25,
                reward: 100,
                armor: 25,
                shield: 300,
                resistances: { 'poison': 0.1, 'slow': 0.3, 'fire': 0.4, 'basic': 0.3 },
                abilities: ['summon', 'rage', 'heal'],
                immunities: ['stun'],
                color: '#8B0000',
                emoji: '💀',
                size: 45
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
        
        // Update special abilities
        this.updateSpecialAbilities(deltaTime);

        // Move towards target
        this.moveTowardsTarget(deltaTime);

        // Check if reached current target
        if (this.position.distance(this.target) < 5) {
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                // Enemy reached end - rotate back to start instead of causing damage
                this.pathIndex = 0;
                this.target = this.path[0];
                this.position = new Vector2(this.path[0].x, this.path[0].y);
                gameEvents.emit('enemyRotated', this);
            } else {
                this.target = this.path[this.pathIndex];
            }
        }

        // Handle regenerating enemies
        if (this.regenRate > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.regenRate * deltaTime);
        }
        
        // Handle shield regeneration
        if (this.maxShield > 0 && this.shield < this.maxShield) {
            this.shieldRegenTimer += deltaTime;
            if (this.shieldRegenTimer >= 2.0) { // 2 second delay before shield regen
                this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * deltaTime);
            }
        }
    }

    updateSpecialAbilities(deltaTime) {
        // Stealth ability
        if (this.stealthCooldown > 0) {
            this.stealthTimer += deltaTime;
            
            if (!this.isInvisible && this.stealthTimer >= this.stealthCooldown) {
                this.isInvisible = true;
                this.stealthTimer = 0;
                gameEvents.emit('enemyStealth', this);
            } else if (this.isInvisible && this.stealthTimer >= this.stealthDuration) {
                this.isInvisible = false;
                this.stealthTimer = 0;
            }
        }
        
        // Berserker rage
        if (this.rageThreshold > 0 && !this.isEnraged) {
            const healthRatio = this.health / this.maxHealth;
            if (healthRatio <= this.rageThreshold) {
                this.isEnraged = true;
                gameEvents.emit('enemyRage', this);
            }
        }
        
        // Teleporter ability
        if (this.teleportCooldown > 0) {
            this.teleportTimer += deltaTime;
            
            if (this.teleportTimer >= this.teleportCooldown) {
                this.teleport();
                this.teleportTimer = 0;
            }
        }
        
        // Healer ability
        if (this.healCooldown > 0) {
            this.healTimer += deltaTime;
            
            if (this.healTimer >= this.healCooldown) {
                this.healNearbyEnemies();
                this.healTimer = 0;
            }
        }
    }

    teleport() {
        // Teleport forward along the path
        const currentIndex = this.pathIndex;
        const maxJump = Math.min(3, this.path.length - currentIndex - 1);
        
        if (maxJump > 0) {
            const jumpAmount = Math.floor(Math.random() * maxJump) + 1;
            this.pathIndex = Math.min(this.pathIndex + jumpAmount, this.path.length - 1);
            this.target = this.path[this.pathIndex];
            this.position = new Vector2(this.target.x, this.target.y);
            
            gameEvents.emit('enemyTeleport', this);
        }
    }

    healNearbyEnemies() {
        // This would need access to other enemies, implemented in wave manager
        gameEvents.emit('enemyHeal', {
            healer: this,
            range: this.healRange,
            amount: this.healAmount
        });
    }

    moveTowardsTarget(deltaTime) {
        if (this.isInvisible) return; // Can't target invisible enemies
        
        const direction = this.target.subtract(this.position).normalize();
        let moveSpeed = this.speed * this.slowFactor * deltaTime;
        
        // Apply berserker rage speed boost
        if (this.isEnraged) {
            moveSpeed *= this.rageSpeedMultiplier;
        }
        
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

    takeDamage(damage, damageType = 'basic', armorPenetration = 0, resistancePiercing = false) {
        if (this.isDead) return 0;
        if (this.isInvisible) return 0; // Can't damage invisible enemies
        
        // Check immunities
        if (this.immunities.includes(damageType)) {
            return 0;
        }
        
        // Reset shield regeneration timer when taking damage
        this.shieldRegenTimer = 0;
        
        let actualDamage = damage;
        
        // Apply armor reduction (with penetration)
        const effectiveArmor = Math.max(0, this.armor - armorPenetration);
        const armorReduction = effectiveArmor / (effectiveArmor + 100);
        actualDamage *= (1 - armorReduction);

        // Apply resistance (unless piercing)
        if (!resistancePiercing && this.resistances[damageType]) {
            actualDamage *= (1 - this.resistances[damageType]);
        }

        // Ensure minimum damage
        actualDamage = Math.max(1, Math.floor(actualDamage));
        
        // Apply damage to shield first, then health
        let damageDealt = 0;
        if (this.shield > 0) {
            const shieldDamage = Math.min(this.shield, actualDamage);
            this.shield -= shieldDamage;
            actualDamage -= shieldDamage;
            damageDealt += shieldDamage;
        }
        
        if (actualDamage > 0) {
            this.health -= actualDamage;
            damageDealt += actualDamage;
        }
        
        // Flash effect
        this.isFlashing = true;
        this.flashTime = 0.1;

        // Check if dead
        if (this.health <= 0) {
            this.onDeath();
        }

        return damageDealt;
    }
    
    onDeath() {
        if (this.isDead) return;
        
        this.isDead = true;
        
        // Handle splitter enemies
        if (this.splitCount > 0 && !this.hasSplit) {
            this.hasSplit = true;
            gameEvents.emit('enemySplit', {
                enemy: this,
                count: this.splitCount,
                health: this.splitHealth
            });
        }
        
        gameEvents.emit('enemyKilled', this);
    }

    applyEffect(effectType, effect) {
        // Check immunities
        if (this.immunities.includes(effectType)) {
            return;
        }
        
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
        if (this.isInvisible) return; // Don't render invisible enemies

        ctx.save();

        // Flash effect when taking damage
        if (this.isFlashing) {
            ctx.filter = 'brightness(200%)';
        }
        
        // Stealth effect (partial transparency when entering/exiting stealth)
        if (this.stealthCooldown > 0 && !this.isInvisible) {
            const stealthProgress = this.stealthTimer / this.stealthCooldown;
            if (stealthProgress > 0.8) {
                ctx.globalAlpha = 1 - ((stealthProgress - 0.8) / 0.2) * 0.7;
            }
        }
        
        // Rage effect
        if (this.isEnraged) {
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 15;
        }

        // Shield bar (if enemy has shield)
        if (this.maxShield > 0) {
            const shieldBarWidth = this.size + 10;
            const shieldBarHeight = 3;
            const shieldBarY = this.position.y - this.size - 12;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(
                this.position.x - shieldBarWidth / 2,
                shieldBarY,
                shieldBarWidth,
                shieldBarHeight
            );
            
            const shieldPercent = this.shield / this.maxShield;
            ctx.fillStyle = '#00BFFF';
            ctx.fillRect(
                this.position.x - shieldBarWidth / 2,
                shieldBarY,
                shieldBarWidth * shieldPercent,
                shieldBarHeight
            );
        }

        // Health bar background
        const healthBarWidth = this.size + 10;
        const healthBarHeight = 4;
        const healthBarY = this.position.y - this.size - (this.maxShield > 0 ? 5 : 8);
        
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
        
        // Armor indicator
        if (this.armor > 0) {
            ctx.strokeStyle = '#C0C0C0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.size / 2 + 1, 0, Math.PI * 2);
            ctx.stroke();
        }

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
        this.wavePrepTime = 30.0; // Seconds between waves
        this.isPreparingWave = false;
        this.waveData = this.generateWaveData();
        
        // Auto-wave countdown system
        this.autoWaveCountdown = 30.0; // 30 seconds countdown after wave clear
        this.countdownTimer = 0;
        this.isCountdownActive = false;
        this.rotatedEnemies = new Set(); // Track enemies that have been rotated
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for enemy rotation events
        gameEvents.on('enemyRotated', (enemy) => this.onEnemyRotated(enemy));
    }

    generateWaveData() {
        const waves = [];
        
        for (let wave = 1; wave <= 50; wave++) {
            const waveInfo = {
                wave: wave,
                enemies: [],
                spawnInterval: Math.max(0.3, 1.2 - wave * 0.015), // More reasonable spawn timing
                prepTime: 3.0 // Increased prep time for early planning
            };

            // Determine enemy composition based on wave number - more balanced progression
            if (wave <= 3) {
                // Tutorial waves - manageable with 2-3 basic towers
                for (let i = 0; i < 4 + wave * 2; i++) { // Reduced from 6 + wave * 2
                    waveInfo.enemies.push('basic');
                }
            } else if (wave <= 5) {
                // Introduce fast enemies gradually
                for (let i = 0; i < 6 + wave * 2; i++) { // Reduced from 8 + wave * 2
                    waveInfo.enemies.push(Math.random() < 0.7 ? 'basic' : 'fast');
                }
            } else if (wave <= 8) {
                // Add heavy and stealth enemies
                for (let i = 0; i < 8 + wave * 2; i++) { // Reduced from 10 + wave * 2
                    const rand = Math.random();
                    if (rand < 0.5) waveInfo.enemies.push('basic');
                    else if (rand < 0.75) waveInfo.enemies.push('fast');
                    else if (rand < 0.9) waveInfo.enemies.push('heavy');
                    else waveInfo.enemies.push('stealth');
                }
            } else if (wave <= 12) {
                // Add flying and shielded enemies
                for (let i = 0; i < 12 + wave * 2; i++) {
                    const rand = Math.random();
                    if (rand < 0.25) waveInfo.enemies.push('basic');
                    else if (rand < 0.45) waveInfo.enemies.push('fast');
                    else if (rand < 0.6) waveInfo.enemies.push('heavy');
                    else if (rand < 0.75) waveInfo.enemies.push('flying');
                    else if (rand < 0.9) waveInfo.enemies.push('stealth');
                    else waveInfo.enemies.push('shielded');
                }
            } else if (wave <= 18) {
                // Add berserker and regenerating enemies
                for (let i = 0; i < 15 + wave * 2; i++) {
                    const rand = Math.random();
                    if (rand < 0.15) waveInfo.enemies.push('basic');
                    else if (rand < 0.3) waveInfo.enemies.push('fast');
                    else if (rand < 0.45) waveInfo.enemies.push('heavy');
                    else if (rand < 0.6) waveInfo.enemies.push('flying');
                    else if (rand < 0.7) waveInfo.enemies.push('shielded');
                    else if (rand < 0.8) waveInfo.enemies.push('berserker');
                    else if (rand < 0.9) waveInfo.enemies.push('regenerating');
                    else waveInfo.enemies.push('stealth');
                }
            } else if (wave <= 25) {
                // Add splitter and teleporter enemies
                for (let i = 0; i < 18 + wave * 2; i++) {
                    const rand = Math.random();
                    if (rand < 0.1) waveInfo.enemies.push('basic');
                    else if (rand < 0.2) waveInfo.enemies.push('fast');
                    else if (rand < 0.35) waveInfo.enemies.push('heavy');
                    else if (rand < 0.5) waveInfo.enemies.push('flying');
                    else if (rand < 0.6) waveInfo.enemies.push('shielded');
                    else if (rand < 0.7) waveInfo.enemies.push('berserker');
                    else if (rand < 0.8) waveInfo.enemies.push('regenerating');
                    else if (rand < 0.85) waveInfo.enemies.push('stealth');
                    else if (rand < 0.92) waveInfo.enemies.push('splitter');
                    else waveInfo.enemies.push('teleporter');
                }
            } else if (wave <= 35) {
                // Add immune and healer enemies
                for (let i = 0; i < 20 + wave * 2; i++) {
                    const rand = Math.random();
                    if (rand < 0.05) waveInfo.enemies.push('basic');
                    else if (rand < 0.15) waveInfo.enemies.push('fast');
                    else if (rand < 0.25) waveInfo.enemies.push('heavy');
                    else if (rand < 0.4) waveInfo.enemies.push('flying');
                    else if (rand < 0.5) waveInfo.enemies.push('shielded');
                    else if (rand < 0.6) waveInfo.enemies.push('berserker');
                    else if (rand < 0.7) waveInfo.enemies.push('regenerating');
                    else if (rand < 0.78) waveInfo.enemies.push('stealth');
                    else if (rand < 0.85) waveInfo.enemies.push('splitter');
                    else if (rand < 0.9) waveInfo.enemies.push('teleporter');
                    else if (rand < 0.95) waveInfo.enemies.push('immune');
                    else waveInfo.enemies.push('healer');
                }
            } else {
                // Hell waves - everything mixed
                for (let i = 0; i < 25 + wave * 3; i++) {
                    const enemyTypes = ['fast', 'heavy', 'flying', 'shielded', 'berserker', 
                                     'regenerating', 'stealth', 'splitter', 'teleporter', 
                                     'immune', 'healer'];
                    waveInfo.enemies.push(enemyTypes[Math.floor(Math.random() * enemyTypes.length)]);
                }
                
                // Add extra bosses in late waves
                if (wave >= 40) {
                    for (let i = 0; i < Math.floor(wave / 10); i++) {
                        waveInfo.enemies.push('mini_boss');
                    }
                }
            }

            // Boss waves - more frequent and challenging
            if (wave % 5 === 0) {
                if (wave >= 30 && wave % 10 === 0) {
                    waveInfo.enemies.push('mega_boss');
                } else if (wave % 10 === 0) {
                    waveInfo.enemies.push('boss');
                } else {
                    waveInfo.enemies.push('mini_boss');
                }
            }
            
            // Add mini bosses more frequently in later waves
            if (wave >= 20 && wave % 3 === 0) {
                waveInfo.enemies.push('mini_boss');
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

        // Stop any active countdown
        this.isCountdownActive = false;
        this.countdownTimer = 0;
        this.rotatedEnemies.clear(); // Reset rotated enemies tracking

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
            // All enemies spawned and all killed - end wave immediately
            this.endWave();
        } else if (this.enemiesSpawned >= this.enemiesInCurrentWave && aliveEnemies.length > 0 && !this.isCountdownActive) {
            // All enemies spawned but some are still alive (rotating) - start auto countdown
            this.startAutoWaveCountdown();
        }
    }

    startAutoWaveCountdown() {
        if (this.isCountdownActive || !this.isWaveActive) return;
        
        this.isCountdownActive = true;
        this.countdownTimer = this.autoWaveCountdown;
        
        gameEvents.emit('waveCountdownStarted', {
            duration: this.autoWaveCountdown,
            nextWave: this.currentWave + 1
        });
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

        // Update countdown timer
        if (this.isCountdownActive) {
            this.countdownTimer -= deltaTime;
            
            gameEvents.emit('waveCountdownUpdate', {
                timeLeft: Math.max(0, this.countdownTimer),
                nextWave: this.currentWave + 1
            });
            
            if (this.countdownTimer <= 0) {
                this.isCountdownActive = false;
                // Force end current wave and start next one
                this.endWave();
                setTimeout(() => {
                    this.startWave();
                }, 100); // Small delay to ensure clean transition
            }
        }

        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime);

            // Remove dead enemies, but keep rotated ones
            if (enemy.isDead) {
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
        return !this.isWaveActive && !this.isPreparingWave && !this.isCountdownActive && this.currentWave < this.waveData.length;
    }

    forceNextWave() {
        if (this.isCountdownActive) {
            // Stop countdown and force next wave
            this.isCountdownActive = false;
            this.countdownTimer = 0;
            this.endWave();
            setTimeout(() => {
                this.startWave();
            }, 100);
            return true;
        } else if (this.canStartNextWave()) {
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
        this.isCountdownActive = false;
        this.countdownTimer = 0;
        this.rotatedEnemies.clear();
    }

    getEnemiesLeft() {
        return this.enemies.filter(enemy => enemy.isAlive()).length;
    }

    getCountdownStatus() {
        if (!this.isCountdownActive) return null;
        
        return {
            isActive: true,
            timeLeft: Math.max(0, this.countdownTimer),
            nextWave: this.currentWave + 1,
            totalDuration: this.autoWaveCountdown
        };
    }

    onEnemyRotated(enemy) {
        // Track rotated enemies to prevent infinite loops
        this.rotatedEnemies.add(enemy);
        gameEvents.emit('enemyRotatedToStart', enemy);
    }
}
