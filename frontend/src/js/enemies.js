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
        // Validate required properties
        if (stats.health === undefined || stats.speed === undefined || stats.reward === undefined) {
            throw new Error(`Enemy stats missing required properties: ${JSON.stringify(stats)}`);
        }
        
        this.health = stats.health;
        this.speed = stats.speed;
        this.reward = stats.reward;
        this.armor = stats.armor ?? 0;
        this.resistances = stats.resistances ?? {};
        this.immunities = stats.immunities ?? [];
        this.size = stats.size;
        this.color = stats.color;
        this.emoji = stats.emoji;
        
        // Special properties based on type
        this.shield = stats.shield;
        this.maxShield = stats.shield;
        this.shieldRegen = stats.shieldRegen;
        this.shieldRegenTimer = 0;
        this.regenRate = stats.regenRate;
        this.abilities = stats.abilities;
        
        // Stealth properties
        this.stealthCooldown = stats.stealthCooldown;
        this.stealthDuration = stats.stealthDuration;
        this.stealthTimer = 0;
        this.isInvisible = false;
        
        // Berserker properties
        this.rageThreshold = stats.rageThreshold;
        this.rageSpeedMultiplier = stats.rageSpeedMultiplier;
        this.isEnraged = false;
        
        // Splitter properties
        this.splitCount = stats.splitCount;
        this.splitHealth = stats.splitHealth;
        this.hasSplit = false;
        
        // Teleporter properties
        this.teleportCooldown = stats.teleportCooldown;
        this.teleportDistance = stats.teleportDistance;
        this.teleportTimer = 0;
        
        // Healer properties
        this.healRange = stats.healRange;
        this.healAmount = stats.healAmount;
        this.healCooldown = stats.healCooldown;
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
                health: 100, // Reduced from 120 (-17%) for better balance
                speed: 50,
                reward: 12, // Increased reward for better economy
                color: '#8B4513',
                emoji: '🐛',
                size: 16
            },
            'fast': {
                health: 65, // Reduced from 75 for better tower effectiveness
                speed: 90,
                reward: 14, // Increased reward for better economy
                color: '#00CED1',
                emoji: '🦎',
                size: 14
            },
            'heavy': {
                health: 380, // Reduced from 420 for better early access
                speed: 25,
                reward: 24, // Increased reward for better economy
                armor: 5, // Reduced from 6 for early tower viability
                color: '#696969',
                emoji: '🐢',
                size: 24
            },
            'flying': {
                health: 140, // Reduced from 168 for better tower viability
                speed: 75,
                reward: 16, // Increased for better economic accessibility
                resistances: { 'basic': 0.4, 'splash': 0.2 }, // Reduced resistances for accessibility
                color: '#9370DB',
                emoji: '🦋',
                size: 18
            },
            'regenerating': {
                health: 210, // Reduced from 252 for better balance
                speed: 40,
                reward: 20, // Increased for better economic accessibility
                regenRate: 12, // Reduced regen rate for tower viability
                color: '#32CD32',
                emoji: '🦠',
                size: 20
            },
            'stealth': {
                health: 130, // Reduced from 156 for better balance
                speed: 60,
                reward: 22, // Increased for better economic accessibility
                stealthCooldown: 9, // Increased cooldown for easier targeting
                stealthDuration: 2.5, // Reduced invisibility duration
                color: '#483D8B',
                emoji: '👻',
                size: 16
            },
            'shielded': {
                health: 240, // Increased by 20% (200 → 240)
                speed: 45,
                reward: 22, // Increased for better economic accessibility
                shield: 100, // Absorbs damage before health
                shieldRegen: 10, // Shield regens when not taking damage
                color: '#4682B4',
                emoji: '🛡️',
                size: 22
            },
            'berserker': {
                health: 300, // Increased by 20% (250 → 300)
                speed: 35,
                reward: 26, // Increased for better economic accessibility
                rageThreshold: 0.5, // Goes berserk at 50% health
                rageSpeedMultiplier: 2.5,
                color: '#B22222',
                emoji: '😡',
                size: 20
            },
            'splitter': {
                health: 216, // Increased by 20% (180 → 216)
                speed: 50,
                reward: 20, // Increased for better economic accessibility
                splitCount: 3, // Splits into 3 smaller enemies
                splitHealth: 72, // Increased by 20% (60 → 72)
                color: '#DDA0DD',
                emoji: '🪱',
                size: 18
            },
            'teleporter': {
                health: 144, // Increased by 20% (120 → 144)
                speed: 55,
                reward: 23, // Increased for better economic accessibility
                teleportCooldown: 6, // Teleports every 6 seconds
                teleportDistance: 100,
                color: '#FF69B4',
                emoji: '🌀',
                size: 16
            },
            'immune': {
                health: 360, // Increased by 20% (300 → 360)
                speed: 40,
                reward: 36, // Increased for better economic accessibility
                immunities: ['poison', 'slow'], // Immune to poison and slow
                resistances: { 'fire': 0.5 },
                color: '#DAA520',
                emoji: '⚔️',
                size: 20
            },
            'healer': {
                health: 180, // Increased by 20% (150 → 180)
                speed: 35,
                reward: 29, // Increased for better economic accessibility
                healRange: 80,
                healAmount: 20,
                healCooldown: 4,
                color: '#98FB98',
                emoji: '💚',
                size: 18
            },
            'boss': {
                health: 960, // Increased by 20% (800 → 960)
                speed: 30,
                reward: 72, // Increased for better economic accessibility
                armor: 15,
                resistances: { 'poison': 0.2, 'slow': 0.4, 'fire': 0.3 },
                abilities: ['teleport', 'summon'],
                color: '#DC143C',
                emoji: '👹',
                size: 36
            },
            'mini_boss': {
                health: 600, // Increased by 20% (500 → 600)
                speed: 40,
                reward: 43, // Increased for better economic accessibility
                armor: 10,
                resistances: { 'splash': 0.6, 'basic': 0.2 },
                abilities: ['charge'],
                color: '#FF4500',
                emoji: '🎃',
                size: 32
            },
            'mega_boss': {
                health: 1800, // Increased by 20% (1500 → 1800)
                speed: 25,
                reward: 145, // Increased for better economic accessibility
                armor: 25,
                shield: 360, // Increased by 20% (300 → 360)
                resistances: { 'poison': 0.1, 'slow': 0.3, 'fire': 0.4, 'basic': 0.3 },
                abilities: ['summon', 'rage', 'heal'],
                immunities: ['stun'],
                color: '#8B0000',
                emoji: '💀',
                size: 45
            }
        };

        if (!enemyTypes[type]) {
            throw new Error(`Unknown enemy type: ${type}`);
        }
        return enemyTypes[type];
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
                // Enemy reached end - but only rotate if still alive
                if (!this.isDead && this.health > 0) {
                    this.pathIndex = 0;
                    this.target = this.path[0];
                    this.position = new Vector2(this.path[0].x, this.path[0].y);
                    gameEvents.emit('enemyRotated', this);
                }
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

        // Special handling for poison effects - only keep the strongest poison
        if (effectType === 'poison') {
            const existingPoison = this.effects.get('poison');
            if (existingPoison) {
                // Compare poison strength (DPS) and only apply if new poison is stronger
                if (effect.dps <= existingPoison.dps) {
                    return; // Don't apply weaker poison
                }
                // New poison is stronger, remove old poison and apply new one
                this.effects.delete('poison');
            }
        }

        this.effects.set(effectType, effect);
    }

    render(ctx) {
        if (this.isDead && !this.isFlashing) return;
        if (this.isInvisible) return; // Don't render invisible enemies

        ctx.save();

        // Check if enemy is in approach zone (not targetable)
        const isInApproachZone = this.position.x < 20; // Before the first visible grid cell (x=0 in world coords = 20)
        
        // Flash effect when taking damage
        if (this.isFlashing) {
            ctx.filter = 'brightness(200%)';
        }
        
        // Approach zone effect (semi-transparent and different color)
        if (isInApproachZone) {
            ctx.globalAlpha = 0.6; // More transparent in approach zone
            ctx.filter = 'sepia(50%) hue-rotate(30deg)'; // Different color tint
        }
        
        // Stealth effect (partial transparency when entering/exiting stealth)
        if (this.stealthCooldown > 0 && !this.isInvisible) {
            const stealthProgress = this.stealthTimer / this.stealthCooldown;
            if (stealthProgress > 0.8) {
                const baseAlpha = isInApproachZone ? 0.6 : 1.0;
                ctx.globalAlpha = baseAlpha - ((stealthProgress - 0.8) / 0.2) * 0.7;
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
        // Initialize debug logging
        if (typeof window !== 'undefined') {
            window.waveDebugLog = window.waveDebugLog ?? [];
            this.logDebug = (message, data) => {
                const logEntry = { timestamp: Date.now(), message, data };
                console.log(message, data);
                window.waveDebugLog.push(logEntry);
                // Keep only last 50 entries
                if (window.waveDebugLog.length > 50) {
                    window.waveDebugLog = window.waveDebugLog.slice(-50);
                }
            };
        } else {
            this.logDebug = (message, data) => console.log(message, data);
        }
        
        this.logDebug('WaveManager constructor starting...');
        
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
        
        this.logDebug('Wave data generated:', { totalWaves: this.waveData.length, first3: this.waveData.slice(0, 3) });
        
        // Auto-wave countdown system
        this.autoWaveCountdown = 30.0; // 30 seconds countdown after wave clear
        this.countdownTimer = 0;
        this.isCountdownActive = false;
        this.rotatedEnemies = new Set(); // Track enemies that have been rotated
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.logDebug('WaveManager constructor complete');
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
                spawnInterval: Math.max(0.4, 1.3 - wave * 0.015), // Slightly slower spawn timing for more strategic play
                prepTime: 4.0 // Increased prep time for better planning (was 3.0)
            };

            // Determine enemy composition based on wave number - increased difficulty
            if (wave <= 3) {
                // Tutorial waves - more manageable for economic setup
                const enemyCount = 5 + (wave * 2); // Wave 1: 7, Wave 2: 9, Wave 3: 11 (reduced from 9,12,15)
                for (let i = 0; i < enemyCount; i++) {
                    // Introduce fast enemies in wave 3 sparingly
                    if (wave === 3 && Math.random() < 0.15) {
                        waveInfo.enemies.push('fast');
                    } else {
                        waveInfo.enemies.push('basic');
                    }
                }
            } else if (wave <= 5) {
                // Early progression waves with controlled difficulty
                const enemyCount = 9 + (wave * 2); // Wave 4: 17, Wave 5: 19 (reduced from 24,27)
                for (let i = 0; i < enemyCount; i++) {
                    waveInfo.enemies.push(Math.random() < 0.3 ? 'fast' : 'basic'); // 30% fast enemies (reduced from 40%)
                }
            } else if (wave <= 8) {
                // Add heavy enemies gradually
                const enemyCount = 12 + (wave * 2);
                for (let i = 0; i < enemyCount; i++) {
                    const rand = Math.random();
                    if (rand < 0.55) waveInfo.enemies.push('basic');
                    else if (rand < 0.75) waveInfo.enemies.push('fast');
                    else waveInfo.enemies.push('heavy');
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
        console.log('startWave called with waveNumber:', waveNumber, 'current state:', {
            isWaveActive: this.isWaveActive,
            isPreparingWave: this.isPreparingWave,
            currentWave: this.currentWave,
            waveDataLength: this.waveData.length
        });
        
        if (this.isWaveActive || this.isPreparingWave) {
            console.log('Cannot start wave - wave already active or preparing');
            return false;
        }

        if (waveNumber !== null) {
            this.currentWave = waveNumber - 1;
            console.log('Set currentWave to:', this.currentWave, 'based on waveNumber:', waveNumber);
        }

        this.currentWave++;
        console.log('Incremented currentWave to:', this.currentWave);
        
        if (this.currentWave > this.waveData.length) {
            // Game completed!
            console.log('Game completed! currentWave:', this.currentWave, 'exceeds waveData.length:', this.waveData.length);
            gameEvents.emit('gameCompleted');
            return false;
        }

        // Stop any active countdown
        this.isCountdownActive = false;
        this.countdownTimer = 0;
        this.rotatedEnemies.clear(); // Reset rotated enemies tracking

        this.isPreparingWave = true;
        console.log('Set isPreparingWave to true for wave:', this.currentWave);
        
        // Prepare wave
        const wave = this.waveData[this.currentWave - 1];
        console.log('Retrieved wave data for wave', this.currentWave, 'at index', this.currentWave - 1, ':', wave);
        console.log('Wave data array length:', this.waveData.length);
        console.log('First few wave data entries:', this.waveData.slice(0, 3));
        
        if (!wave) {
            console.error('No wave data found for wave:', this.currentWave, 'index:', this.currentWave - 1);
            console.error('Available wave data:', this.waveData);
            this.isPreparingWave = false;
            return false;
        }
        
        if (!wave.enemies || wave.enemies.length === 0) {
            console.error('Wave data has no enemies:', wave);
            this.isPreparingWave = false;
            return false;
        }
        
        this.enemiesInCurrentWave = wave.enemies.length;
        this.enemiesSpawned = 0;
        
        // Set spawn interval
        this.spawnTimer.duration = wave.spawnInterval;
        this.spawnTimer.reset();

        console.log('Wave preparation complete:', {
            enemiesInWave: this.enemiesInCurrentWave,
            spawnInterval: wave.spawnInterval,
            prepTime: wave.prepTime
        });

        // Start preparation timer
        console.log('Starting preparation timer for', wave.prepTime, 'seconds');
        setTimeout(() => {
            try {
                console.log('Preparation timer complete, starting wave:', this.currentWave);
                console.log('Pre-activation state:', {
                    isPreparingWave: this.isPreparingWave,
                    isWaveActive: this.isWaveActive,
                    currentWave: this.currentWave
                });
                
                this.isPreparingWave = false;
                this.isWaveActive = true;
                
                console.log('Starting spawn timer...');
                this.spawnTimer.start();
                
                console.log('Wave', this.currentWave, 'is now active');
                gameEvents.emit('waveStarted', this.currentWave);
                
                console.log('Wave started successfully');
            } catch (error) {
                console.error('Error during wave activation:', error);
                console.error('Error stack:', error.stack);
                // Reset state if there's an error
                this.isPreparingWave = false;
                this.isWaveActive = false;
            }
        }, wave.prepTime * 1000);

        gameEvents.emit('wavePreparation', {
            wave: this.currentWave,
            enemies: wave.enemies,
            prepTime: wave.prepTime
        });

        return true;
    }

    spawnNextEnemy() {
        console.log('spawnNextEnemy called:', {
            isWaveActive: this.isWaveActive,
            enemiesSpawned: this.enemiesSpawned,
            enemiesInCurrentWave: this.enemiesInCurrentWave,
            currentWave: this.currentWave
        });
        
        if (!this.isWaveActive || this.enemiesSpawned >= this.enemiesInCurrentWave) {
            console.log('Cannot spawn enemy - wave not active or all enemies spawned');
            return;
        }

        const wave = this.waveData[this.currentWave - 1];
        if (!wave) {
            console.error('No wave data found for current wave:', this.currentWave);
            return;
        }
        
        console.log('Wave data for spawn:', wave);
        
        const enemyType = wave.enemies[this.enemiesSpawned];
        console.log('Spawning enemy type:', enemyType, 'at index:', this.enemiesSpawned);
        
        if (!enemyType) {
            console.error('No enemy type found at index:', this.enemiesSpawned, 'in wave:', wave);
            return;
        }
        
        try {
            // Create enemy with wave-based scaling
            const enemy = new Enemy(enemyType, this.spawnPosition, this.getWorldPath());
            console.log('Enemy created successfully:', enemy);
            
            // Apply gradual health scaling to maintain challenge without creating difficulty spikes
            let healthMultiplier = 1.0;
            
            if (this.currentWave <= 5) {
                // Early waves: gentle scaling to preserve economic balance
                healthMultiplier = 1.0 + (this.currentWave - 1) * 0.08; // 8% increase per wave
            } else if (this.currentWave <= 12) {
                // Mid waves: moderate scaling
                const earlyBonus = 1.0 + (4 * 0.08); // 32% from early waves
                const midBonus = (this.currentWave - 5) * 0.12; // 12% per wave after 5
                healthMultiplier = earlyBonus + midBonus;
            } else if (this.currentWave <= 25) {
                // Late waves: more aggressive but controlled scaling
                const earlyBonus = 1.0 + (4 * 0.08);
                const midBonus = 7 * 0.12; // 84% from mid waves
                const lateBonus = (this.currentWave - 12) * 0.18; // 18% per wave after 12
                healthMultiplier = earlyBonus + midBonus + lateBonus;
            } else {
                // End game: exponential scaling for ultimate challenge
                const baseMultiplier = 1.0 + (4 * 0.08) + (7 * 0.12) + (13 * 0.18);
                const endGameMultiplier = Math.pow(1.25, this.currentWave - 25);
                healthMultiplier = baseMultiplier * endGameMultiplier;
            }
            
            enemy.maxHealth = Math.floor(enemy.maxHealth * healthMultiplier);
            enemy.health = enemy.maxHealth;
            
            // Scale shield and armor for shielded/armored enemies in late game
            if (this.currentWave >= 10) {
                if (enemy.maxShield > 0) {
                    enemy.maxShield = Math.floor(enemy.maxShield * Math.pow(1.10, this.currentWave - 10));
                    enemy.shield = enemy.maxShield;
                }
                if (enemy.armor > 0) {
                    enemy.armor = Math.floor(enemy.armor * Math.pow(1.08, this.currentWave - 10));
                }
            }
            
            // Add bonus speed scaling for late waves to prevent easy kiting
            if (this.currentWave >= 15) {
                const speedMultiplier = 1.0 + ((this.currentWave - 15) * 0.02); // 2% speed increase per wave after 15
                enemy.speed = Math.floor(enemy.speed * speedMultiplier);
            }
            
            // Add bonus resistance scaling for very late waves
            if (this.currentWave >= 25) {
                const resistanceBonus = Math.min(0.3, (this.currentWave - 25) * 0.02); // Up to 30% resistance bonus
                Object.keys(enemy.resistances).forEach(key => {
                    enemy.resistances[key] = Math.min(0.9, enemy.resistances[key] + resistanceBonus);
                });
            }
            
            this.enemies.push(enemy);
            this.enemiesSpawned++;
            console.log('Enemy added to array. Total enemies:', this.enemies.length, 'Spawned:', this.enemiesSpawned);

            // Schedule next spawn
            if (this.enemiesSpawned < this.enemiesInCurrentWave) {
                console.log('Scheduling next enemy spawn');
                this.spawnTimer.reset();
                this.spawnTimer.start();
            } else {
                // All enemies spawned, start checking for wave completion
                console.log('All enemies spawned, checking wave completion');
                this.checkWaveCompletion();
            }

            gameEvents.emit('enemySpawned', enemy);
        } catch (error) {
            console.error('Error spawning enemy:', error);
            console.error('Enemy type:', enemyType);
            console.error('Spawn position:', this.spawnPosition);
            console.error('Wave data:', wave);
        }
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
            // All enemies spawned and all killed - start countdown instead of ending immediately
            console.log('All enemies killed - starting countdown');
            if (!this.isCountdownActive) {
                this.startAutoWaveCountdown();
            }
        } else if (this.enemiesSpawned >= this.enemiesInCurrentWave && aliveEnemies.length > 0 && !this.isCountdownActive) {
            // All enemies spawned but some are still alive (rotating) - start auto countdown
            console.log('All enemies spawned but some still alive - starting countdown');
            this.startAutoWaveCountdown();
        }
    }

    startAutoWaveCountdown() {
        console.log('startAutoWaveCountdown called:', {
            isCountdownActive: this.isCountdownActive,
            isWaveActive: this.isWaveActive,
            currentWave: this.currentWave
        });
        
        if (this.isCountdownActive || !this.isWaveActive) {
            console.log('Countdown not started - already active or wave not active');
            return;
        }
        
        this.isCountdownActive = true;
        this.countdownTimer = this.autoWaveCountdown;
        
        console.log('Auto wave countdown started for next wave:', this.currentWave + 1);
        
        gameEvents.emit('waveCountdownStarted', {
            duration: this.autoWaveCountdown,
            nextWave: this.currentWave + 1
        });
    }

    endWave() {
        if (!this.isWaveActive) return;

        this.isWaveActive = false;
        this.isPreparingWave = false; // Ensure we're not stuck in preparing state
        gameEvents.emit('waveCompleted', this.currentWave);
    }

    update(deltaTime) {
        try {
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
                    console.log('Countdown timer reached 0, auto-starting next wave');
                    this.isCountdownActive = false;
                    this.countdownTimer = 0;
                    
                    console.log('State before auto wave start:', {
                        currentWave: this.currentWave,
                        isWaveActive: this.isWaveActive,
                        isPreparingWave: this.isPreparingWave
                    });
                    
                    // Use the same logic as forceNextWave() for consistency
                    // End current wave and ensure proper state reset
                    if (this.isWaveActive) {
                        console.log('Ending current wave:', this.currentWave);
                        this.isWaveActive = false;
                        gameEvents.emit('waveCompleted', this.currentWave);
                    }
                    
                    // Ensure we're not in preparing state
                    this.isPreparingWave = false;
                    
                    console.log('Starting next wave automatically');
                    const success = this.startWave();
                    console.log('Auto startWave result:', success);
                    
                    if (!success) {
                        console.error('Failed to auto-start next wave! Current state:', {
                            currentWave: this.currentWave,
                            isWaveActive: this.isWaveActive,
                            isPreparingWave: this.isPreparingWave,
                            waveDataLength: this.waveData.length
                        });
                    }
                }
            }

            // Update all enemies and track if any die
            let enemyStateChanged = false;
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (enemy && typeof enemy.update === 'function') {
                    enemy.update(deltaTime);
                } else {
                    console.error('Invalid enemy found at index:', i, enemy);
                    this.enemies.splice(i, 1);
                    enemyStateChanged = true;
                    continue;
                }

                // Remove dead enemies, but keep rotated ones
                if (enemy.isDead) {
                    this.enemies.splice(i, 1);
                    enemyStateChanged = true;
                }
            }

            // Only check wave completion when enemy state changes, not every frame
            if (this.isWaveActive && enemyStateChanged) {
                this.checkWaveCompletion();
            }
        } catch (error) {
            console.error('Error in WaveManager.update:', error);
            console.error('Stack trace:', error.stack);
            console.error('Current state:', {
                currentWave: this.currentWave,
                isWaveActive: this.isWaveActive,
                isPreparingWave: this.isPreparingWave,
                isCountdownActive: this.isCountdownActive,
                enemyCount: this.enemies.length
            });
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

    getWaveEnemyCount(waveNumber) {
        // Get the number of enemies for a specific wave
        if (waveNumber < 1 || waveNumber > this.waveData.length) {
            return 0;
        }
        
        const wave = this.waveData[waveNumber - 1];
        return wave ? wave.enemies.length : 0;
    }

    getWaveCompletionTime(wave) {
        // Return completion time for a wave (placeholder - would need to track this)
        return 0; // TODO: Implement wave completion time tracking
    }

    getWaveEnemiesKilled(wave) {
        // Return enemies killed in a wave (placeholder - would need to track this)
        return 0; // TODO: Implement wave enemies killed tracking
    }

    getWaveDamageDealt(wave) {
        // Return damage dealt in a wave (placeholder - would need to track this)
        return 0; // TODO: Implement wave damage dealt tracking
    }

    getWaveMoneyEarned(wave) {
        // Return money earned in a wave (placeholder - would need to track this)
        return 0; // TODO: Implement wave money earned tracking
    }

    getNextWavePreview() {
        if (this.currentWave >= this.waveData.length) {
            return null;
        }
        
        const nextWave = this.waveData[this.currentWave];
        const enemyCount = {};
        
        for (const enemyType of nextWave.enemies) {
            enemyCount[enemyType] = (enemyCount[enemyType] ?? 0) + 1;
        }
        
        return {
            wave: this.currentWave + 1,
            enemies: enemyCount,
            total: nextWave.enemies.length
        };
    }

    canStartNextWave() {
        // Can start next wave if:
        // 1. No wave is currently active or being prepared AND we haven't reached the end
        // 2. OR there's an active countdown (allowing manual override)
        const hasMoreWaves = this.currentWave < this.waveData.length;
        const isIdle = !this.isWaveActive && !this.isPreparingWave;
        const canOverrideCountdown = this.isCountdownActive;
        
        return hasMoreWaves && (isIdle || canOverrideCountdown);
    }

    forceNextWave() {
        console.log('forceNextWave called - Current state:', {
            isWaveActive: this.isWaveActive,
            isPreparingWave: this.isPreparingWave,
            isCountdownActive: this.isCountdownActive,
            currentWave: this.currentWave,
            waveDataLength: this.waveData.length
        });
        
        if (this.isCountdownActive) {
            console.log('Countdown is active, forcing next wave immediately');
            // Stop countdown and force next wave immediately
            this.isCountdownActive = false;
            this.countdownTimer = 0;
            
            // Emit countdown update to immediately update UI to 0
            gameEvents.emit('waveCountdownUpdate', {
                timeLeft: 0,
                nextWave: this.currentWave + 1
            });
            
            // End current wave and ensure proper state reset
            if (this.isWaveActive) {
                console.log('Ending current wave:', this.currentWave);
                this.isWaveActive = false;
                gameEvents.emit('waveCompleted', this.currentWave);
            }
            
            // Ensure we're not in preparing state
            this.isPreparingWave = false;
            
            // Start next wave immediately (no setTimeout to avoid race conditions)
            console.log('Starting next wave from countdown state');
            const result = this.startWave();
            console.log('startWave result:', result);
            return result;
        } else if (this.canStartNextWave()) {
            console.log('Starting next wave directly');
            const result = this.startWave();
            console.log('startWave result:', result);
            return result;
        }
        
        console.log('Cannot start next wave - conditions not met');
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
    
    // Cleanup method to properly destroy WaveManager instance
    destroy() {
        console.log('Destroying WaveManager instance...');
        
        // Stop all timers
        if (this.spawnTimer) {
            this.spawnTimer.reset();
        }
        if (this.waveTimer) {
            this.waveTimer.reset();
        }
        
        // Clear arrays and state
        this.enemies.length = 0;
        this.rotatedEnemies.clear();
        this.isWaveActive = false;
        this.isPreparingWave = false;
        this.isCountdownActive = false;
        
        // Remove event listeners
        gameEvents.off('enemyRotated', (enemy) => this.onEnemyRotated(enemy));
        
        // Clear debug log reference
        if (typeof window !== 'undefined' && window.waveDebugLog) {
            // Don't delete the global log, just mark this instance as destroyed
            this.logDebug('WaveManager instance destroyed');
        }
        
        console.log('WaveManager destroyed successfully');
    }
}
