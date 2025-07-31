// Towers.js - Tower classes and management
import { Vector2, GameMath, Timer, ParticleSystem, gameEvents } from './utils.js';
import { ELEMENTS } from './elements.js';

export class Projectile {
    constructor(start, target, damage, speed, type = 'basic', tower = null) {
        this.position = new Vector2(start.x, start.y);
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.type = type;
        this.tower = tower;
        this.isAlive = true;
        this.hasHit = false;
        
        // Visual properties
        this.size = this.getSizeForType(type);
        this.color = this.getColorForType(type);
        this.trail = [];
        this.maxTrailLength = 5;
        
        // Homing properties
        this.isHoming = type === 'sniper' || type === 'guided';
    }

    getSizeForType(type) {
        const sizes = {
            'basic': 4,
            'splash': 6,
            'poison': 5,
            'sniper': 3,
            'guided': 4
        };
        return sizes[type] || 4;
    }

    getColorForType(type) {
        const colors = {
            'basic': '#90EE90',
            'splash': '#FF6B35',
            'poison': '#8A2BE2',
            'sniper': '#FFD700',
            'guided': '#00CED1'
        };
        return colors[type] || '#90EE90';
    }

    update(deltaTime) {
        if (!this.isAlive || this.hasHit) return;

        // Add current position to trail
        this.trail.push(new Vector2(this.position.x, this.position.y));
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Update target for homing projectiles
        if (this.isHoming && this.target && !this.target.isAlive()) {
            this.target = this.tower ? this.tower.findTarget() : null;
            if (!this.target) {
                this.isAlive = false;
                return;
            }
        }

        // Calculate direction to target
        let direction;
        if (this.target && this.target.isAlive()) {
            direction = this.target.getPosition().subtract(this.position).normalize();
        } else {
            // Continue in current direction if target is lost
            if (this.trail.length >= 2) {
                direction = this.position.subtract(this.trail[this.trail.length - 2]).normalize();
            } else {
                this.isAlive = false;
                return;
            }
        }

        // Move projectile
        const moveDistance = this.speed * deltaTime;
        this.position = this.position.add(direction.multiply(moveDistance));

        // Check collision with target
        if (this.target && this.target.isAlive()) {
            const distance = this.position.distance(this.target.getPosition());
            if (distance < 15) {
                this.hit();
            }
        }

        // Remove projectile if it goes off screen
        if (this.position.x < -50 || this.position.x > 850 || 
            this.position.y < -50 || this.position.y > 650) {
            this.isAlive = false;
        }
    }

    hit() {
        if (this.hasHit) return;
        
        this.hasHit = true;
        this.isAlive = false;

        if (this.target && this.target.isAlive()) {
            const damage = this.target.takeDamage(
                this.damage, 
                this.type, 
                this.armorPenetration || 0,
                this.specialEffects?.resistancePiercing || false
            );
            
            gameEvents.emit('projectileHit', {
                position: this.position,
                damage: damage,
                type: this.type,
                element: this.element
            });

            // Handle special projectile effects
            this.handleSpecialEffects();
            
            // Handle elemental effects
            this.handleElementalEffects();
        }
    }
    
    handleElementalEffects() {
        if (!this.target || !this.target.isAlive() || !this.element) return;
        
        switch (this.element) {
            case 'FIRE':
                if (this.specialEffects.burnDamage) {
                    this.target.applyEffect('burn', {
                        dps: this.specialEffects.burnDamage,
                        duration: this.specialEffects.burnDuration || 3
                    });
                }
                break;
                
            case 'WATER':
                if (this.specialEffects.slowFactor) {
                    this.target.applyEffect('slow', {
                        factor: this.specialEffects.slowFactor,
                        duration: this.specialEffects.slowDuration || 2
                    });
                }
                break;
                
            case 'NATURE':
                if (this.specialEffects.poisonDamage) {
                    this.target.applyEffect('poison', {
                        dps: this.specialEffects.poisonDamage,
                        duration: this.specialEffects.poisonDuration || 4
                    });
                    
                    // Spread poison if applicable
                    if (this.specialEffects.spreadsPoison) {
                        this.spreadPoison();
                    }
                }
                break;
                
            case 'AIR':
                if (this.specialEffects.chainTargets) {
                    this.chainLightning();
                }
                break;
        }
    }
    
    spreadPoison() {
        const spreadRange = 50;
        const nearbyEnemies = this.tower.game.waveManager.getAllEnemies().filter(enemy => 
            enemy !== this.target && 
            enemy.getPosition().distance(this.position) <= spreadRange
        );
        
        for (const enemy of nearbyEnemies) {
            enemy.applyEffect('poison', {
                dps: this.specialEffects.poisonDamage * 0.5,
                duration: this.specialEffects.poisonDuration || 4
            });
        }
    }
    
    chainLightning() {
        const chainRange = 80;
        const chainTargets = this.specialEffects.chainTargets || 1;
        let currentTarget = this.target;
        
        for (let i = 0; i < chainTargets; i++) {
            const nearbyEnemies = this.tower.game.waveManager.getAllEnemies().filter(enemy => 
                enemy !== currentTarget && 
                enemy.getPosition().distance(currentTarget.getPosition()) <= chainRange
            );
            
            if (nearbyEnemies.length === 0) break;
            
            // Find closest enemy
            let closestEnemy = nearbyEnemies[0];
            let closestDistance = currentTarget.getPosition().distance(closestEnemy.getPosition());
            
            for (const enemy of nearbyEnemies) {
                const distance = currentTarget.getPosition().distance(enemy.getPosition());
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
            
            // Deal chain damage (reduced)
            const chainDamage = this.damage * Math.pow(0.7, i + 1);
            closestEnemy.takeDamage(
                chainDamage, 
                this.type,
                this.armorPenetration || 0,
                this.specialEffects?.resistancePiercing || false
            );
            
            gameEvents.emit('chainLightning', {
                from: currentTarget.getPosition(),
                to: closestEnemy.getPosition(),
                damage: chainDamage
            });
            
            currentTarget = closestEnemy;
        }
    }

    handleSpecialEffects() {
        switch (this.type) {
            case 'splash':
                this.handleSplashDamage();
                break;
            case 'poison':
                this.handlePoisonEffect();
                break;
        }
    }

    handleSplashDamage() {
        const splashRange = 50;
        const splashDamage = this.damage * 0.5;
        
        // Find enemies in splash range
        const nearbyEnemies = this.tower.game.waveManager.getAllEnemies().filter(enemy => 
            enemy !== this.target && 
            enemy.getPosition().distance(this.position) <= splashRange
        );

        // Apply splash damage
        for (const enemy of nearbyEnemies) {
            enemy.takeDamage(splashDamage, 'splash');
        }

        // Create explosion effect
        gameEvents.emit('explosion', {
            position: this.position,
            radius: splashRange,
            color: this.color
        });
    }

    handlePoisonEffect() {
        if (this.target && this.target.isAlive()) {
            this.target.applyEffect('poison', {
                dps: this.damage * 0.25, // Increased from 0.15 to make poison more viable
                duration: 3.0 // Increased from 2.5 seconds
            });
            
            this.target.applyEffect('slow', {
                factor: 0.75, // Improved from 0.8 (more slow effect)
                duration: 2.0 // Increased from 1.5 seconds
            });
        }
    }

    render(ctx) {
        if (!this.isAlive) return;

        ctx.save();

        // Render trail
        if (this.trail.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < this.trail.length - 1; i++) {
                const alpha = i / this.trail.length;
                ctx.globalAlpha = alpha * 0.3;
                
                if (i === 0) {
                    ctx.moveTo(this.trail[i].x, this.trail[i].y);
                } else {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
            }
            ctx.stroke();
        }

        // Render projectile
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow effect for special projectiles
        if (this.type === 'sniper' || this.type === 'poison') {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export class Tower {
    constructor(x, y, type, game) {
        this.position = new Vector2(x, y);
        this.type = type;
        this.level = 1;
        this.game = game;
        
        // Get base stats for tower type
        const stats = this.getStatsForType(type);
        this.damage = stats.damage;
        this.range = stats.range;
        this.fireRate = stats.fireRate; // Shots per second
        this.cost = stats.cost;
        this.projectileType = stats.projectileType;
        this.upgradeCost = stats.upgradeCost;
        this.sellValue = Math.floor(stats.cost * 0.7);
        this.color = stats.color;
        this.emoji = stats.emoji;
        this.size = 30;
        
        // Gem System
        this.gemSlots = this.getGemSlotsForType(type);
        this.gems = new Array(this.gemSlots).fill(null);
        this.purity = 'none'; // none, pure, impure
        this.dominantElement = null;
        this.primaryElement = null;
        this.element = null;
        this.armorPenetration = 0;
        this.specialEffects = {};
        
        // Targeting and shooting
        this.target = null;
        this.lastShotTime = 0;
        this.shotCooldown = 1.0 / this.fireRate; // Time between shots
        this.projectileSpeed = stats.projectileSpeed || 200;
        
        // Visual properties
        this.animationTime = 0;
        this.shootAnimation = 0;
        this.rangeVisible = false;
        
        // Statistics
        this.totalDamageDealt = 0;
        this.enemiesKilled = 0;
        this.shotsFired = 0;
    }

    getStatsForType(type) {
        const towerTypes = {
            'basic': {
                damage: 22, // Reduced slightly to balance with enemy health increase
                range: 110,
                fireRate: 1.5,
                cost: 45,
                upgradeCost: 22,
                projectileType: 'basic',
                projectileSpeed: 220,
                color: '#4CAF50',
                emoji: '🌱'
            },
            'splash': {
                damage: 40, // Increased from 35 for better area damage
                range: 85, // Balanced range
                fireRate: 1.1, // Slightly improved fire rate
                cost: 65, // Reduced cost
                upgradeCost: 35, // Reduced upgrade cost
                projectileType: 'splash',
                projectileSpeed: 160,
                color: '#FF5722',
                emoji: '🍄'
            },
            'poison': {
                damage: 8, // Slightly increased from 5 for viability
                range: 95, // Good range for poison tower
                fireRate: 1.3, // Improved fire rate
                cost: 85, // Reduced cost for accessibility
                upgradeCost: 45, // Reduced upgrade cost
                projectileType: 'poison',
                projectileSpeed: 190,
                color: '#9C27B0',
                emoji: '🦠'
            },
            'sniper': {
                damage: 85, // Increased from 75 for high-damage role
                range: 160, // Increased range for sniper advantage
                fireRate: 0.7, // Slightly improved fire rate
                cost: 125, // Reduced cost for accessibility
                upgradeCost: 60, // Reduced upgrade cost
                projectileType: 'sniper',
                projectileSpeed: 450,
                color: '#FFD700',
                emoji: '🎯'
            }
        };

        return towerTypes[type] || towerTypes['basic'];
    }

    update(deltaTime) {
        this.animationTime += deltaTime;
        this.lastShotTime += deltaTime;
        
        // Decay shoot animation
        this.shootAnimation = Math.max(0, this.shootAnimation - deltaTime * 5);

        // Find and acquire target
        this.acquireTarget();

        // Try to shoot if we have a target and cooldown is ready
        if (this.target && this.lastShotTime >= this.shotCooldown) {
            this.shoot();
        }
    }

    acquireTarget() {
        const enemies = this.game.waveManager.getAllEnemies();
        let bestTarget = null;
        let bestScore = -1;

        for (const enemy of enemies) {
            const distance = this.position.distance(enemy.getPosition());
            
            if (distance <= this.range) {
                // Prioritize enemies closer to the end of the path
                const progressScore = enemy.pathIndex / enemy.path.length;
                const distanceScore = 1 - (distance / this.range);
                const score = progressScore * 0.7 + distanceScore * 0.3;

                if (score > bestScore) {
                    bestScore = score;
                    bestTarget = enemy;
                }
            }
        }

        // Check if current target is still valid
        if (this.target) {
            if (!this.target.isAlive() || 
                this.position.distance(this.target.getPosition()) > this.range) {
                this.target = null;
            }
        }

        // Acquire new target if we don't have one
        if (!this.target && bestTarget) {
            this.target = bestTarget;
        }
    }

    findTarget() {
        this.acquireTarget();
        return this.target;
    }

    shoot() {
        if (!this.target || !this.target.isAlive()) {
            this.target = null;
            return;
        }

        // Create projectile
        const projectile = new Projectile(
            this.position,
            this.target,
            this.getDamageWithUpgrades(),
            this.projectileSpeed,
            this.projectileType,
            this
        );
        
        // Apply elemental effects
        this.applyElementalEffects(projectile);

        this.game.addProjectile(projectile);
        
        // Update statistics
        this.shotsFired++;
        this.shootAnimation = 1.0;
        
        // Reset shot timer
        this.lastShotTime = 0;

        gameEvents.emit('towerShoot', {
            tower: this,
            target: this.target,
            projectile: projectile
        });
    }
    
    applyElementalEffects(projectile) {
        if (this.element) {
            projectile.element = this.element;
            projectile.armorPenetration = this.armorPenetration;
            projectile.specialEffects = { ...this.specialEffects };
            
            // Update projectile color based on element
            if (ELEMENTS[this.element]) {
                projectile.color = ELEMENTS[this.element].color;
            }
        }
    }

    upgrade() {
        if (this.level >= 3) return false;
        
        const cost = this.getUpgradeCost();
        if (this.game.getMoney() < cost) return false;

        this.game.spendMoney(cost);
        this.level++;

        // Upgrade stats
        const multiplier = 1.5;
        this.damage = Math.floor(this.damage * multiplier);
        this.range = Math.floor(this.range * 1.2);
        this.fireRate *= 1.3;
        // Keep upgrade cost static - no inflation per upgrade
        this.sellValue = Math.floor(this.sellValue * 1.4);

        // Update fire timer with new rate
        this.shotCooldown = 1.0 / this.fireRate;

        gameEvents.emit('towerUpgraded', this);
        return true;
    }

    sell() {
        this.game.addMoney(this.sellValue);
        gameEvents.emit('towerSold', this);
        return this.sellValue;
    }

    getDamageWithUpgrades() {
        return this.damage;
    }

    getUpgradeCost() {
        if (this.level >= 3) return 0;
        
        // Level 2 upgrade costs the base upgrade cost
        // Level 3 upgrade costs twice as much as level 2
        if (this.level === 1) {
            return this.upgradeCost;
        } else if (this.level === 2) {
            return this.upgradeCost * 2;
        }
        
        return 0;
    }

    getSellValue() {
        return this.sellValue;
    }

    canUpgrade() {
        return this.level < 3 && this.game.getMoney() >= this.getUpgradeCost();
    }

    render(ctx) {
        ctx.save();

        // Render range circle if selected
        if (this.rangeVisible) {
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.globalAlpha = 1.0;

        // Render tower base
        const baseSize = this.size + this.shootAnimation * 5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, baseSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Render tower border
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, baseSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Render tower emoji/icon
        ctx.fillStyle = 'white';
        ctx.font = `${this.size * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.position.x, this.position.y);

        // Render level indicators
        if (this.level > 1) {
            const levelIndicatorSize = 8;
            const numDots = this.level - 1;
            const totalWidth = (numDots - 1) * 12; // Total width of all dots including spacing
            const startX = this.position.x - totalWidth / 2; // Center the dots
            
            for (let i = 0; i < numDots; i++) {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(
                    startX + i * 12,
                    this.position.y - this.size / 2 - 10,
                    levelIndicatorSize / 2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }

        // Render targeting line
        if (this.target && this.target.isAlive()) {
            ctx.strokeStyle = this.color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(this.target.getPosition().x, this.target.getPosition().y);
            ctx.stroke();
        }

        ctx.restore();
    }

    showRange() {
        this.rangeVisible = true;
    }

    hideRange() {
        this.rangeVisible = false;
    }

    isPointInside(x, y) {
        const distance = this.position.distance(new Vector2(x, y));
        return distance <= this.size / 2;
    }

    getStats() {
        return {
            type: this.type,
            level: this.level,
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            totalDamageDealt: this.totalDamageDealt,
            enemiesKilled: this.enemiesKilled,
            shotsFired: this.shotsFired,
            upgradeCost: this.getUpgradeCost(),
            sellValue: this.getSellValue(),
            canUpgrade: this.canUpgrade()
        };
    }

    getGemSlotsForType(type) {
        // Gem slot configuration
        const gemSlots = {
            'basic': 2,     // 2 gem slots
            'splash': 3,    // 3 gem slots  
            'poison': 2,    // 2 gem slots
            'sniper': 1     // 1 gem slot (precision tower)
        };
        return gemSlots[type] || 2;
    }

    // Gem System Methods
    socketGem(slotIndex, gemKey, gemData) {
        // Ensure gems array has enough slots
        while (this.gems.length <= slotIndex) {
            this.gems.push(null);
        }

        // Socket the gem
        this.gems[slotIndex] = {
            key: gemKey,
            name: gemData.name,
            emoji: gemData.emoji,
            effects: gemData.effects,
            element: gemData.element,
            pure: gemData.pure,
            ...gemData
        };

        // Apply gem effects
        this.applyGemEffects();

        // Update elements array if gem adds an element
        if (gemData.element) {
            this.primaryElement = gemData.element;
            
            if (!this.elements.includes(gemData.element)) {
                this.elements.push(gemData.element);
            }
        }

        // Recalculate purity and dominant element
        this.updateTowerType();

        return true;
    }

    removeGem(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.gems.length) return false;
        
        const removedGem = this.gems[slotIndex];
        this.gems[slotIndex] = null;
        
        // Reapply all gem effects
        this.applyGemEffects();
        
        // Update tower type
        this.updateTowerType();
        
        return removedGem;
    }

    applyGemEffects() {
        // Reset to base stats
        const baseStats = this.getStatsForType(this.type);
        this.damage = baseStats.damage * Math.pow(1.5, this.level - 1);
        this.range = baseStats.range * Math.pow(1.2, this.level - 1);
        this.fireRate = baseStats.fireRate * Math.pow(1.3, this.level - 1);
        
        // Reset modifiers
        this.armorPenetration = 0;
        this.specialEffects = {};
        this.elements = [];
        this.primaryElement = null;
        
        // Apply each gem's effects
        for (const gem of this.gems.filter(g => g !== null)) {
            this.applyGemEffect(gem.effects);
            
            // Track elements
            if (gem.element) {
                if (!this.primaryElement) {
                    this.primaryElement = gem.element;
                }
                if (!this.elements.includes(gem.element)) {
                    this.elements.push(gem.element);
                }
            }
        }
        
        // Update shot cooldown
        this.shotCooldown = 1.0 / this.fireRate;
    }

    applyGemEffect(effects) {
        // Damage multipliers stack multiplicatively
        if (effects.damageMultiplier) {
            this.damage *= effects.damageMultiplier;
        }
        
        // Attack speed multipliers stack multiplicatively  
        if (effects.attackSpeedMultiplier) {
            this.fireRate *= effects.attackSpeedMultiplier;
        }
        
        // Range multipliers stack multiplicatively
        if (effects.rangeMultiplier) {
            this.range *= effects.rangeMultiplier;
        }
        
        // Armor penetration stacks additively
        if (effects.armorPenetration) {
            this.armorPenetration += effects.armorPenetration;
        }
        
        // Projectile speed multiplier
        if (effects.projectileSpeedMultiplier) {
            this.projectileSpeed *= effects.projectileSpeedMultiplier;
        }
        
        // Special effects
        const specialEffectTypes = [
            'burnDamage', 'burnDuration', 'slowFactor', 'slowDuration',
            'chainTargets', 'splashRadius', 'steamCloud', 'healingAura',
            'randomElementalEffect'
        ];
        
        for (const effectType of specialEffectTypes) {
            if (effects[effectType] !== undefined) {
                this.specialEffects[effectType] = effects[effectType];
            }
        }
    }

    updateTowerType() {
        // Calculate purity based on gems
        const validGems = this.gems.filter(g => g !== null);
        if (validGems.length === 0) {
            this.purity = 'none';
            this.dominantElement = null;
            return;
        }
        
        const elements = validGems.map(g => g.element).filter(e => e);
        const uniqueElements = [...new Set(elements)];
        
        // Pure if all gems are the same element and all are pure
        if (uniqueElements.length === 1 && validGems.every(g => g.pure)) {
            this.purity = 'pure';
        } else if (elements.length > 0) {
            this.purity = 'impure';
        } else {
            this.purity = 'none';
        }
        
        // Calculate dominant element
        if (elements.length > 0) {
            const elementCounts = {};
            elements.forEach(element => {
                elementCounts[element] = (elementCounts[element] || 0) + 1;
            });
            
            this.dominantElement = Object.keys(elementCounts).reduce((a, b) => 
                elementCounts[a] > elementCounts[b] ? a : b
            );
        } else {
            this.dominantElement = null;
        }
    }

    getBaseStats() {
        // Return the original base stats for this tower type
        const towerStats = TOWER_TYPES[this.type];
        return {
            damage: towerStats.damage,
            range: towerStats.range,
            fireRate: towerStats.fireRate,
            projectileSpeed: towerStats.projectileSpeed || 300
        };
    }

    resetToBaseStats() {
        // Reset to original tower stats
        const baseStats = this.getBaseStats();
        this.damage = baseStats.damage;
        this.range = baseStats.range;
        this.fireRate = baseStats.fireRate;
        this.projectileSpeed = baseStats.projectileSpeed;
        this.armorPenetration = 0;
        
        // Reset special effects
        this.specialEffects = {};
        this.elements = [];
        this.element = null;
    }

    updateGemEffects() {
        // Reset tower stats to base values
        this.resetToBaseStats();
        
        // Apply effects from all socketed gems
        this.gems.forEach(gem => {
            if (gem && gem.effects) {
                const effects = gem.effects;
                
                // Apply multiplicative effects
                if (effects.damageMultiplier) {
                    this.damage *= effects.damageMultiplier;
                }
                if (effects.attackSpeedMultiplier) {
                    this.fireRate *= effects.attackSpeedMultiplier;
                }
                
                // Apply additive effects
                if (effects.armorPenetration) {
                    this.armorPenetration += effects.armorPenetration;
                }
                
                // Apply special effects
                if (effects.slowFactor) {
                    this.specialEffects.slowFactor = effects.slowFactor;
                    this.specialEffects.slowDuration = effects.slowDuration || 2;
                }
                if (effects.poisonDamage) {
                    this.specialEffects.poisonDamage = effects.poisonDamage;
                    this.specialEffects.poisonDuration = effects.poisonDuration || 3;
                }
                if (effects.burnDamage) {
                    this.specialEffects.burnDamage = effects.burnDamage;
                    this.specialEffects.burnDuration = effects.burnDuration || 3;
                }
                if (effects.chainTargets) {
                    this.specialEffects.chainTargets = effects.chainTargets;
                }
                if (effects.spreadsPoison) {
                    this.specialEffects.spreadsPoison = true;
                }
                if (effects.resistancePiercing) {
                    this.specialEffects.resistancePiercing = true;
                }
                if (effects.lifeSteal) {
                    this.specialEffects.lifeSteal = effects.lifeSteal;
                }
                
                // Handle elements
                if (effects.element) {
                    this.element = effects.element;
                    if (!this.elements.includes(effects.element)) {
                        this.elements.push(effects.element);
                    }
                }
            }
        });

        // Update shot cooldown based on new fire rate
        this.shotCooldown = 1.0 / this.fireRate;
    }
}

export class TowerManager {
    constructor(game) {
        this.game = game;
        this.towers = [];
        this.selectedTower = null;
        this.projectiles = [];
        
        // Tower placement
        this.placementMode = false;
        this.selectedTowerType = null;
        this.previewPosition = new Vector2(0, 0);
        
        // Statistics
        this.totalTowersBuilt = 0;
        this.totalMoneySpent = 0;
    }

    enterPlacementMode(towerType) {
        this.placementMode = true;
        this.selectedTowerType = towerType;
        this.clearSelection();
    }

    exitPlacementMode() {
        this.placementMode = false;
        this.selectedTowerType = null;
    }

    updatePreviewPosition(x, y) {
        this.previewPosition.x = x;
        this.previewPosition.y = y;
    }

    canPlaceTower(x, y) {
        if (!this.selectedTowerType) return false;
        
        const towerStats = this.getTowerStats(this.selectedTowerType);
        if (this.game.getMoney() < towerStats.cost) return false;

        // Check if position is valid on the game grid
        const gridPos = this.game.grid.worldToGrid(x, y);
        if (!this.game.grid.canPlaceTower(gridPos.x, gridPos.y)) return false;

        // Check if there's already a tower nearby
        const minDistance = 35; // Minimum distance between towers
        for (const tower of this.towers) {
            if (tower.position.distance(new Vector2(x, y)) < minDistance) {
                return false;
            }
        }

        return true;
    }

    placeTower(x, y) {
        if (!this.canPlaceTower(x, y)) return false;

        const towerStats = this.getTowerStats(this.selectedTowerType);
        
        // Spend money
        this.game.spendMoney(towerStats.cost);
        
        // Create tower
        const tower = new Tower(x, y, this.selectedTowerType, this.game);
        this.towers.push(tower);
        
        // Update grid
        const gridPos = this.game.grid.worldToGrid(x, y);
        this.game.grid.placeTower(gridPos.x, gridPos.y);
        
        // Update statistics
        this.totalTowersBuilt++;
        this.totalMoneySpent += towerStats.cost;
        
        // Exit placement mode
        this.exitPlacementMode();
        
        gameEvents.emit('towerPlaced', tower);
        return tower;
    }

    selectTower(x, y) {
        this.clearSelection();
        
        for (const tower of this.towers) {
            if (tower.isPointInside(x, y)) {
                this.selectedTower = tower;
                tower.showRange();
                return tower;
            }
        }
        
        return null;
    }

    clearSelection() {
        if (this.selectedTower) {
            this.selectedTower.hideRange();
            this.selectedTower = null;
        }
    }

    upgradeTower(tower = null) {
        const targetTower = tower || this.selectedTower;
        if (!targetTower) return false;
        
        return targetTower.upgrade();
    }

    sellTower(tower = null) {
        const targetTower = tower || this.selectedTower;
        if (!targetTower) return false;
        
        const sellValue = targetTower.sell();
        
        // Remove from towers array
        const index = this.towers.indexOf(targetTower);
        if (index > -1) {
            this.towers.splice(index, 1);
        }
        
        // Update grid
        const gridPos = this.game.grid.worldToGrid(targetTower.position.x, targetTower.position.y);
        this.game.grid.removeTower(gridPos.x, gridPos.y);
        
        // Clear selection if this was the selected tower
        if (this.selectedTower === targetTower) {
            this.clearSelection();
        }
        
        return sellValue;
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    getTowerStats(type) {
        const tower = new Tower(0, 0, type, this.game);
        const baseStats = tower.getStatsForType(type);
        
        // Return static costs - no inflation based on wave progression
        return {
            ...baseStats,
            cost: baseStats.cost,
            upgradeCost: baseStats.upgradeCost
        };
    }

    update(deltaTime) {
        // Update all towers
        for (const tower of this.towers) {
            tower.update(deltaTime);
        }

        // Update all projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            if (!projectile.isAlive) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        // Render all towers
        for (const tower of this.towers) {
            tower.render(ctx);
        }

        // Render all projectiles
        for (const projectile of this.projectiles) {
            projectile.render(ctx);
        }

        // Render placement preview
        if (this.placementMode && this.selectedTowerType) {
            this.renderPlacementPreview(ctx);
        }
    }

    renderPlacementPreview(ctx) {
        ctx.save();
        
        const canPlace = this.canPlaceTower(this.previewPosition.x, this.previewPosition.y);
        const towerStats = this.getTowerStats(this.selectedTowerType);
        
        // Preview tower
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = canPlace ? towerStats.color : '#F44336';
        ctx.beginPath();
        ctx.arc(this.previewPosition.x, this.previewPosition.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Preview range
        ctx.strokeStyle = canPlace ? towerStats.color : '#F44336';
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.previewPosition.x, this.previewPosition.y, towerStats.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    getAllTowers() {
        return this.towers;
    }

    getSelectedTower() {
        return this.selectedTower;
    }

    isInPlacementMode() {
        return this.placementMode;
    }

    getStatistics() {
        return {
            totalTowersBuilt: this.totalTowersBuilt,
            totalMoneySpent: this.totalMoneySpent,
            towersActive: this.towers.length,
            projectilesActive: this.projectiles.length
        };
    }

    reset() {
        this.towers = [];
        this.projectiles = [];
        this.selectedTower = null;
        this.placementMode = false;
        this.selectedTowerType = null;
        this.totalTowersBuilt = 0;
        this.totalMoneySpent = 0;
    }
}
