// Elements.js - Mushroom Revolution Gem System
import { gameEvents } from './utils.js';

// Mushroom Revolution Elements (5 core elements)
export const ELEMENTS = {
    FIRE: {
        name: 'Fire',
        color: '#FF4500',
        emoji: '🔥',
        description: 'Increases damage and adds burn effects'
    },
    WATER: {
        name: 'Water',
        color: '#4169E1',
        emoji: '💧',
        description: 'Slows enemies and increases damage'
    },
    THUNDER: {
        name: 'Thunder',
        color: '#FFD700',
        emoji: '⚡',
        description: 'Chain lightning and attack speed'
    },
    WIND: {
        name: 'Wind',
        color: '#32CD32',
        emoji: '💨',
        description: 'Increases speed and range'
    },
    EARTH: {
        name: 'Earth',
        color: '#8B4513',
        emoji: '�',
        description: 'Armor penetration and stability'
    }
};

// Gem Types (Mushroom Revolution Style)
export const GEM_TYPES = {
    // Pure Element Gems
    PURE_FIRE: {
        name: 'Pure Fire Gem',
        type: 'element',
        element: 'FIRE',
        pure: true,
        cost: 40,
        effects: {
            damageMultiplier: 1.25,
            burnDamage: 10,
            burnDuration: 2
        },
        description: 'Pure fire essence increases damage by 25%',
        emoji: '🔥',
        rarity: 'common'
    },
    
    PURE_WATER: {
        name: 'Pure Water Gem',
        type: 'element',
        element: 'WATER',
        pure: true,
        cost: 40,
        effects: {
            damageMultiplier: 1.2,
            slowFactor: 0.7,
            slowDuration: 2
        },
        description: 'Pure water essence slows enemies and increases damage',
        emoji: '�',
        rarity: 'common'
    },
    
    PURE_THUNDER: {
        name: 'Pure Thunder Gem',
        type: 'element',
        element: 'THUNDER',
        pure: true,
        cost: 45,
        effects: {
            damageMultiplier: 1.15,
            chainTargets: 1,
            attackSpeedMultiplier: 1.2
        },
        description: 'Pure thunder essence chains between enemies',
        emoji: '⚡',
        rarity: 'common'
    },
    
    PURE_WIND: {
        name: 'Pure Wind Gem',
        type: 'element',
        element: 'WIND',
        pure: true,
        cost: 35,
        effects: {
            attackSpeedMultiplier: 1.4,
            rangeMultiplier: 1.1,
            projectileSpeedMultiplier: 1.3
        },
        description: 'Pure wind essence increases speed and range',
        emoji: '💨',
        rarity: 'common'
    },
    
    PURE_EARTH: {
        name: 'Pure Earth Gem',
        type: 'element',
        element: 'EARTH',
        pure: true,
        cost: 50,
        effects: {
            damageMultiplier: 1.1,
            armorPenetration: 8,
            splashRadius: 20
        },
        description: 'Pure earth essence pierces armor',
        emoji: '🌍',
        rarity: 'common'
    },
    
    // Enhancement Gems
    DAMAGE_GEM: {
        name: 'Damage Crystal',
        type: 'enhancement',
        cost: 30,
        effects: {
            damageMultiplier: 1.3
        },
        description: 'Increases raw damage by 30%',
        emoji: '�',
        rarity: 'common'
    },
    
    SPEED_GEM: {
        name: 'Haste Crystal',
        type: 'enhancement',
        cost: 25,
        effects: {
            attackSpeedMultiplier: 1.5
        },
        description: 'Increases attack speed by 50%',
        emoji: '💨',
        rarity: 'common'
    },
    
    RANGE_GEM: {
        name: 'Scope Crystal',
        type: 'enhancement',
        cost: 35,
        effects: {
            rangeMultiplier: 1.4
        },
        description: 'Increases range by 40%',
        emoji: '�',
        rarity: 'common'
    },
    
    // Impure Combination Gems
    STEAM_GEM: {
        name: 'Steam Gem',
        type: 'combination',
        elements: ['FIRE', 'WATER'],
        pure: false,
        cost: 80,
        effects: {
            damageMultiplier: 1.4,
            steamCloud: true,
            splashRadius: 30
        },
        description: 'Fire + Water: Creates damaging steam clouds',
        emoji: '💨',
        rarity: 'rare'
    },
    
    STORM_GEM: {
        name: 'Storm Gem',
        type: 'combination',
        elements: ['WIND', 'THUNDER'],
        pure: false,
        cost: 85,
        effects: {
            damageMultiplier: 1.3,
            chainTargets: 2,
            attackSpeedMultiplier: 1.6,
            rangeMultiplier: 1.2
        },
        description: 'Wind + Thunder: Lightning chains with wind burst',
        emoji: '⛈️',
        rarity: 'rare'
    },
    
    MAGMA_GEM: {
        name: 'Magma Gem',
        type: 'combination',
        elements: ['FIRE', 'EARTH'],
        pure: false,
        cost: 90,
        effects: {
            damageMultiplier: 1.5,
            burnDamage: 20,
            burnDuration: 4,
            armorPenetration: 12
        },
        description: 'Fire + Earth: Molten damage that burns and pierces',
        emoji: '🌋',
        rarity: 'rare'
    },
    
    // Epic Multi-Element Gems
    ELEMENTAL_FURY: {
        name: 'Elemental Fury',
        type: 'legendary',
        elements: ['FIRE', 'WATER', 'THUNDER'],
        pure: false,
        cost: 150,
        effects: {
            damageMultiplier: 1.8,
            randomElementalEffect: true,
            chainTargets: 3
        },
        description: 'Three elements combine for devastating effect',
        emoji: '🌟',
        rarity: 'epic'
    },
    
    NATURE_HARMONY: {
        name: 'Nature\'s Harmony',
        type: 'legendary',
        elements: ['EARTH', 'WIND', 'WATER'],
        pure: false,
        cost: 160,
        effects: {
            damageMultiplier: 1.6,
            healingAura: true,
            rangeMultiplier: 1.5,
            armorPenetration: 10
        },
        description: 'Earth, Wind, Water create perfect balance',
        emoji: '🌿',
        rarity: 'epic'
    }
};

export class GemSystem {
    constructor() {
        this.availableGems = this.generateShop();
        this.refreshCost = 20;
        this.refreshCount = 0;
    }

    generateShop() {
        const shop = [];
        const rarityWeights = {
            'common': 60,
            'rare': 25,
            'epic': 10,
            'legendary': 5
        };

        // Generate 6 random gems based on rarity weights
        for (let i = 0; i < 6; i++) {
            const rarity = this.selectRarity(rarityWeights);
            const gems = Object.values(GEM_TYPES).filter(g => g.rarity === rarity);
            const gem = gems[Math.floor(Math.random() * gems.length)];
            shop.push({ ...gem, id: Math.random().toString(36).substr(2, 9) });
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

        this.availableGems = this.generateShop();
        this.refreshCount++;
        
        return { success: true, cost, newShop: this.availableGems };
    }

    canSocketGem(tower, gem, slotIndex) {
        // Check if tower has enough gem slots
        if (slotIndex >= tower.gemSlots) {
            return { canSocket: false, reason: 'Tower has no more gem slots' };
        }

        // Check if slot is already occupied
        if (tower.gems[slotIndex]) {
            return { canSocket: false, reason: 'Gem slot already occupied' };
        }

        // Check combination requirements for rare gems
        if (gem.elements && gem.elements.length > 1) {
            const towerElements = tower.gems
                .filter(g => g && g.element)
                .map(g => g.element);
            
            const hasRequiredElements = gem.elements.every(req => 
                towerElements.includes(req)
            );
            
            if (!hasRequiredElements) {
                return { 
                    canSocket: false, 
                    reason: `Requires elements: ${gem.elements.join(', ')}` 
                };
            }
        }

        return { canSocket: true };
    }

    socketGem(tower, gem, slotIndex) {
        const canSocket = this.canSocketGem(tower, gem, slotIndex);
        if (!canSocket.canSocket) return canSocket;

        // Add gem to tower
        tower.gems[slotIndex] = { ...gem };
        
        // Apply effects and recalculate stats
        this.recalculateTowerStats(tower);
        
        gameEvents.emit('gemSocketed', { tower, gem, slotIndex });
        return { success: true };
    }

    removeGem(tower, slotIndex) {
        if (slotIndex < 0 || slotIndex >= tower.gems.length || !tower.gems[slotIndex]) {
            return false;
        }
        
        const removed = tower.gems[slotIndex];
        tower.gems[slotIndex] = null;
        this.recalculateTowerStats(tower);
        
        gameEvents.emit('gemRemoved', { tower, gem: removed, slotIndex });
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
        tower.primaryElement = null;
        tower.specialEffects = {};
        
        // Apply gem effects
        for (const gem of tower.gems.filter(g => g !== null)) {
            this.applyGemEffects(tower, gem.effects);
            
            // Set primary element from first elemental gem
            if (gem.element && !tower.primaryElement) {
                tower.primaryElement = gem.element;
            }
        }
        
        // Update shot cooldown
        tower.shotCooldown = 1.0 / tower.fireRate;
        
        // Calculate tower purity and type
        tower.purity = this.calculateTowerPurity(tower.gems);
        tower.dominantElement = this.getDominantElement(tower.gems);
    }

    applyGemEffects(tower, effects) {
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
        
        // Special effects
        const specialEffectTypes = [
            'burnDamage', 'burnDuration', 'slowFactor', 'slowDuration',
            'chainTargets', 'splashRadius', 'steamCloud', 'healingAura',
            'randomElementalEffect'
        ];
        
        for (const effectType of specialEffectTypes) {
            if (effects[effectType] !== undefined) {
                tower.specialEffects[effectType] = effects[effectType];
            }
        }
    }

    calculateTowerPurity(gems) {
        const validGems = gems.filter(g => g !== null);
        if (validGems.length === 0) return 'none';
        
        const elements = validGems.map(g => g.element).filter(e => e);
        const uniqueElements = [...new Set(elements)];
        
        // Pure if all gems are the same element and all are pure
        if (uniqueElements.length === 1 && validGems.every(g => g.pure)) {
            return 'pure';
        }
        
        // Impure if mixed elements or any impure gems
        return 'impure';
    }

    getDominantElement(gems) {
        const validGems = gems.filter(g => g !== null);
        if (validGems.length === 0) return null;
        
        const elementCounts = {};
        validGems.forEach(gem => {
            if (gem.element) {
                elementCounts[gem.element] = (elementCounts[gem.element] || 0) + 1;
            }
        });
        
        if (Object.keys(elementCounts).length === 0) return null;
        
        return Object.keys(elementCounts).reduce((a, b) => 
            elementCounts[a] > elementCounts[b] ? a : b
        );
    }

    canCombineGems(gem1, gem2, gem3 = null) {
        const gems = [gem1, gem2, gem3].filter(g => g !== null);
        
        // Check for specific combinations in GEM_TYPES
        for (const [key, gemType] of Object.entries(GEM_TYPES)) {
            if (gemType.type === 'combination' || gemType.type === 'legendary') {
                if (gemType.elements && gems.length >= 2) {
                    const hasRequiredElements = gemType.elements.every(element => 
                        gems.some(gem => gem.element === element)
                    );
                    if (hasRequiredElements) {
                        return { canCombine: true, result: key };
                    }
                }
            }
        }
        
        return { canCombine: false };
    }

    getShop() {
        return this.availableGems;
    }

    getGemInfo(gemName) {
        return GEM_TYPES[gemName];
    }
}

export const gemSystem = new GemSystem();
