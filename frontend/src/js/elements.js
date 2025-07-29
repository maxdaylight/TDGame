// Elements.js - Elemental system and trinkets for towers
import { gameEvents } from './utils.js';

// Elemental types with their properties and interactions
export const ELEMENTS = {
    EARTH: {
        name: 'Earth',
        color: '#8B4513',
        emoji: '🌍',
        description: 'Increases damage and armor penetration'
    },
    FIRE: {
        name: 'Fire',
        color: '#FF4500',
        emoji: '🔥',
        description: 'Adds burn damage over time'
    },
    WATER: {
        name: 'Water',
        color: '#4169E1',
        emoji: '💧',
        description: 'Slows enemies and increases range'
    },
    AIR: {
        name: 'Air',
        color: '#87CEEB',
        emoji: '💨',
        description: 'Increases attack speed and projectile speed'
    },
    NATURE: {
        name: 'Nature',
        color: '#228B22',
        emoji: '🌿',
        description: 'Poison effects and life steal'
    },
    VOID: {
        name: 'Void',
        color: '#4B0082',
        emoji: '🌌',
        description: 'Pierces armor and ignores resistances'
    }
};

// Trinket types that can be applied to towers
export const TRINKET_TYPES = {
    // Damage trinkets
    SHARP_STONE: {
        name: 'Sharp Stone',
        type: 'damage',
        rarity: 'common',
        cost: 30,
        effects: { damageMultiplier: 1.2 },
        description: '+20% damage',
        emoji: '🪨'
    },
    BLAZING_CORE: {
        name: 'Blazing Core',
        type: 'elemental',
        rarity: 'rare',
        cost: 60,
        effects: { element: 'FIRE', burnDamage: 15, burnDuration: 3 },
        description: 'Adds fire element and burn effect',
        emoji: '🔥'
    },
    FROST_CRYSTAL: {
        name: 'Frost Crystal',
        type: 'elemental',
        rarity: 'rare',
        cost: 65,
        effects: { element: 'WATER', slowFactor: 0.6, slowDuration: 2 },
        description: 'Adds water element and slowing',
        emoji: '❄️'
    },
    
    // Speed trinkets
    WIND_ESSENCE: {
        name: 'Wind Essence',
        type: 'speed',
        rarity: 'common',
        cost: 25,
        effects: { attackSpeedMultiplier: 1.3 },
        description: '+30% attack speed',
        emoji: '💨'
    },
    LIGHTNING_RUNE: {
        name: 'Lightning Rune',
        type: 'elemental',
        rarity: 'epic',
        cost: 100,
        effects: { element: 'AIR', attackSpeedMultiplier: 1.5, chainTargets: 2 },
        description: 'Air element, +50% speed, chains to 2 enemies',
        emoji: '⚡'
    },
    
    // Range trinkets
    EAGLE_EYE: {
        name: 'Eagle Eye',
        type: 'range',
        rarity: 'common',
        cost: 35,
        effects: { rangeMultiplier: 1.25 },
        description: '+25% range',
        emoji: '👁️'
    },
    EARTH_LENS: {
        name: 'Earth Lens',
        type: 'elemental',
        rarity: 'rare',
        cost: 70,
        effects: { element: 'EARTH', rangeMultiplier: 1.4, armorPenetration: 10 },
        description: 'Earth element, +40% range, +10 armor pen',
        emoji: '🔍'
    },
    
    // Special trinkets
    VOID_SHARD: {
        name: 'Void Shard',
        type: 'elemental',
        rarity: 'legendary',
        cost: 150,
        effects: { 
            element: 'VOID', 
            armorPenetration: 20, 
            resistancePiercing: true,
            damageMultiplier: 1.3 
        },
        description: 'Void element, pierces all armor and resistances',
        emoji: '🌌'
    },
    NATURE_HEART: {
        name: 'Nature Heart',
        type: 'elemental',
        rarity: 'epic',
        cost: 120,
        effects: { 
            element: 'NATURE', 
            poisonDamage: 25, 
            poisonDuration: 4,
            lifeSteal: 0.2 
        },
        description: 'Nature element, poison and 20% life steal',
        emoji: '💚'
    },
    
    // Combination trinkets (require multiple elements)
    MOLTEN_EARTH: {
        name: 'Molten Earth',
        type: 'combination',
        rarity: 'legendary',
        cost: 200,
        requirements: ['EARTH', 'FIRE'],
        effects: { 
            damageMultiplier: 1.8,
            splashRadius: 40,
            burnDamage: 30,
            burnDuration: 5,
            armorPenetration: 15
        },
        description: 'Earth + Fire: Massive damage with splash and burn',
        emoji: '🌋'
    },
    STORM_SURGE: {
        name: 'Storm Surge',
        type: 'combination',
        rarity: 'legendary',
        cost: 180,
        requirements: ['WATER', 'AIR'],
        effects: {
            attackSpeedMultiplier: 2.0,
            rangeMultiplier: 1.6,
            chainTargets: 3,
            slowFactor: 0.4,
            slowDuration: 3
        },
        description: 'Water + Air: Ultra-fast attacks with chaining and slowing',
        emoji: '⛈️'
    },
    TOXIC_VOID: {
        name: 'Toxic Void',
        type: 'combination',
        rarity: 'legendary',
        cost: 220,
        requirements: ['NATURE', 'VOID'],
        effects: {
            poisonDamage: 50,
            poisonDuration: 6,
            resistancePiercing: true,
            armorPenetration: 25,
            damageMultiplier: 1.4,
            spreadsPoison: true
        },
        description: 'Nature + Void: Spreading poison that ignores all defenses',
        emoji: '☢️'
    }
};

export class TowerUpgradeSystem {
    constructor() {
        this.availableTrinkets = this.generateShop();
        this.refreshCost = 20;
        this.refreshCount = 0;
    }

    generateShop() {
        const shop = [];
        const rarityWeights = {
            'common': 50,
            'rare': 30,
            'epic': 15,
            'legendary': 5
        };

        // Generate 6 random trinkets based on rarity weights
        for (let i = 0; i < 6; i++) {
            const rarity = this.selectRarity(rarityWeights);
            const trinkets = Object.values(TRINKET_TYPES).filter(t => t.rarity === rarity);
            const trinket = trinkets[Math.floor(Math.random() * trinkets.length)];
            shop.push({ ...trinket, id: Math.random().toString(36).substr(2, 9) });
        }

        return shop;
    }

    selectRarity(weights) {
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        
        for (const [rarity, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return rarity;
        }
        
        return 'common';
    }

    refreshShop(playerMoney) {
        const cost = this.refreshCost + (this.refreshCount * 10);
        if (playerMoney < cost) return { success: false, cost };

        this.availableTrinkets = this.generateShop();
        this.refreshCount++;
        
        return { success: true, cost, newShop: this.availableTrinkets };
    }

    canApplyTrinket(tower, trinket) {
        // Check if tower already has this trinket
        if (tower.trinkets.some(t => t.name === trinket.name)) {
            return { canApply: false, reason: 'Already equipped' };
        }

        // Check combination requirements
        if (trinket.requirements) {
            const towerElements = tower.trinkets
                .filter(t => t.effects.element)
                .map(t => t.effects.element);
            
            const hasRequiredElements = trinket.requirements.every(req => 
                towerElements.includes(req)
            );
            
            if (!hasRequiredElements) {
                return { 
                    canApply: false, 
                    reason: `Requires elements: ${trinket.requirements.join(', ')}` 
                };
            }
        }

        // Check trinket slot limit (max 3 trinkets per tower)
        if (tower.trinkets.length >= 3) {
            return { canApply: false, reason: 'Maximum trinkets equipped (3/3)' };
        }

        return { canApply: true };
    }

    applyTrinket(tower, trinket) {
        const canApply = this.canApplyTrinket(tower, trinket);
        if (!canApply.canApply) return canApply;

        // Add trinket to tower
        tower.trinkets.push({ ...trinket });
        
        // Apply effects
        this.recalculateTowerStats(tower);
        
        gameEvents.emit('trinketApplied', { tower, trinket });
        return { success: true };
    }

    removeTrinket(tower, trinketIndex) {
        if (trinketIndex < 0 || trinketIndex >= tower.trinkets.length) return false;
        
        const removed = tower.trinkets.splice(trinketIndex, 1)[0];
        this.recalculateTowerStats(tower);
        
        gameEvents.emit('trinketRemoved', { tower, trinket: removed });
        return true;
    }

    recalculateTowerStats(tower) {
        // Reset to base stats
        const baseStats = tower.getStatsForType(tower.type);
        tower.damage = baseStats.damage * Math.pow(1.5, tower.level - 1);
        tower.range = baseStats.range * Math.pow(1.2, tower.level - 1);
        tower.fireRate = baseStats.fireRate * Math.pow(1.3, tower.level - 1);
        tower.projectileSpeed = baseStats.projectileSpeed;
        
        // Reset special properties
        tower.armorPenetration = 0;
        tower.element = null;
        tower.specialEffects = {};
        
        // Apply trinket effects
        for (const trinket of tower.trinkets) {
            this.applyTrinketEffects(tower, trinket.effects);
        }
        
        // Update shot cooldown
        tower.shotCooldown = 1.0 / tower.fireRate;
    }

    applyTrinketEffects(tower, effects) {
        // Damage multipliers stack multiplicatively
        if (effects.damageMultiplier) {
            tower.damage *= effects.damageMultiplier;
        }
        
        // Range multipliers stack multiplicatively
        if (effects.rangeMultiplier) {
            tower.range *= effects.rangeMultiplier;
        }
        
        // Attack speed multipliers stack multiplicatively
        if (effects.attackSpeedMultiplier) {
            tower.fireRate *= effects.attackSpeedMultiplier;
        }
        
        // Armor penetration stacks additively
        if (effects.armorPenetration) {
            tower.armorPenetration = (tower.armorPenetration || 0) + effects.armorPenetration;
        }
        
        // Projectile speed multiplier
        if (effects.projectileSpeedMultiplier) {
            tower.projectileSpeed *= effects.projectileSpeedMultiplier;
        }
        
        // Set element (last one applied wins)
        if (effects.element) {
            tower.element = effects.element;
        }
        
        // Special effects
        const specialEffectTypes = [
            'burnDamage', 'burnDuration', 'slowFactor', 'slowDuration',
            'poisonDamage', 'poisonDuration', 'chainTargets', 'splashRadius',
            'lifeSteal', 'resistancePiercing', 'spreadsPoison'
        ];
        
        for (const effectType of specialEffectTypes) {
            if (effects[effectType] !== undefined) {
                tower.specialEffects[effectType] = effects[effectType];
            }
        }
    }

    getShop() {
        return this.availableTrinkets;
    }

    getTrinketInfo(trinketName) {
        return TRINKET_TYPES[trinketName];
    }
}

export const upgradeSystem = new TowerUpgradeSystem();
