# 💎 TDGAME Gem System Guide

## 🎯 Overview

This guide explains the simplified gem mechanics focusing on pure elemental mastery.

## 🔮 Core Gem System

### **Socket Mechanics**

- **Level-Based Slots**: Gem slots increase as towers are upgraded
  - Level 1 Tower: 1 gem slot (all towers start here)
  - Level 2 Tower: 2 gem slots (after first upgrade)  
  - Level 3 Tower: 3 gem slots (after second upgrade)
- **Universal System**: All tower types follow the same slot progression
- **Strategic Upgrades**: Upgrading towers increases both power and gem capacity

### **Gem Categories**

#### **Pure Elemental Gems Only**

- **Purpose**: Single-element mastery and strategic focus
- **Pure Bonus**: Enhanced effects when all gems are same element
- **Elements**: Fire 🔥, Water 💧, Thunder ⚡, Wind 💨, Earth 🌍
- **Philosophy**: Simplified system focusing on elemental specialization

**Available Gems:**

- **Fire Gem** 🔥 - 25% damage increase + burn effects
- **Water Gem** 💧 - 20% damage + enemy slowdown
- **Thunder Gem** ⚡ - 15% damage + chain lightning + speed
- **Wind Gem** 💨 - 40% attack speed + 10% range + projectile speed
- **Earth Gem** 🌍 - 10% damage + armor penetration + splash radius

## 🎨 Visual Design

### **Circular Gem Sockets**

- **Empty Sockets**: Dark circular slots with inner shadow
- **Filled Sockets**: Glowing gems with element-specific colors
- **Hover Effects**: Border highlighting and scale animation
- **Click Interaction**: Modal gem selection interface

### **Tower Type Indicators**

- **Purity Badges**:
  - Pure (green): All same element gems
  - Mixed (purple): Different element gems
  - None (gray): No gems socketed
- **Element Display**: Shows dominant element of tower

## ⚖️ Game Balance

### **Economic Balance**

- **Starting Money**: $95 (unchanged)
- **Gem Costs**: 25-160 coins (balanced for strategic choices)
- **Refund System**: 60% refund on gem removal (right-click)

### **Power Scaling**

- **Multiplicative Effects**: Gem effects stack multiplicatively
- **Pure Tower Bonus**: Enhanced elemental effects for pure builds
- **Combination Power**: Unique abilities from element mixing

## 🎮 Strategic Depth

### **Build Paths**

#### **Pure Builds**

- **Strategy**: Focus single element for maximum specialization
- **Benefits**: Enhanced elemental bonuses
- **Example**: Pure Fire Tower with all fire gems = maximum burn damage

#### **Hybrid Builds**

- **Strategy**: Mix elements for versatile performance
- **Benefits**: Access to combination gems
- **Example**: Fire + Earth = Magma Gem with burn + armor penetration

#### **Enhancement Focus**

- **Strategy**: Non-elemental stat maximization
- **Benefits**: Reliable damage without element dependencies
- **Example**: Damage + Speed + Range crystals for consistent DPS

### **Meta Strategies**

#### **Early Game** (Waves 1-10)

1. Socket Damage Crystals for immediate impact
2. Add first elemental gem based on enemy types
3. Focus on economy and basic defense

#### **Mid Game** (Waves 11-25)

1. Begin element specialization
2. Save for combination gems
3. Establish tower element identities

#### **Late Game** (Waves 26-50)

1. Perfect gem synergies
2. Multiple combination gems
3. Pure builds for specialized roles

## 🔧 Technical Implementation

### **Data Structure**

```javascript
// Tower gem system
tower.gems = [gem1, gem2, gem3]; // Fixed-size array
tower.gemSlots = 2; // Based on tower type
tower.purity = 'pure|impure|none'; // Calculated from gems
tower.dominantElement = 'FIRE'; // Most common element
```

### **Gem Definition**

```javascript
GEM_TYPES.EXAMPLE = {
    name: 'Example Gem',
    type: 'element|enhancement|combination',
    element: 'FIRE', // For elemental gems
    pure: true, // For pure elemental gems
    cost: 40,
    effects: {
        damageMultiplier: 1.25,
        burnDamage: 10,
        burnDuration: 2
    },
    description: 'Clear effect description',
    emoji: '🔥',
    rarity: 'common'
};
```

## 🎯 Player Experience Improvements

### **Visual Clarity**

- **Clear Socket States**: Easy to see empty vs filled slots
- **Element Identification**: Color-coded gems and effects
- **Status Indicators**: Purity badges and element display

### **Interaction Design**

- **Click to Socket**: Intuitive gem placement
- **Right-click Remove**: Easy gem removal with refund
- **Modal Selection**: Organized gem browser interface

### **Strategic Feedback**

- **Purity System**: Clear indication of build direction
- **Effect Stacking**: Transparent effect calculation
- **Cost/Benefit**: Clear investment vs return

### **Strategic Depth Maintained**

- **Limited Slots**: Meaningful choices due to slot constraints
- **Economic Pressure**: Gems require significant investment
- **Specialization vs Versatility**: Pure builds vs hybrid builds
- **Progressive Complexity**: Simple early game, complex late game

## 📝 Documentation Updates

All game documentation has been updated to reflect the gem system:

- **README.md**: Complete overview rewrite
- **GAMEPLAY_GUIDE.md**: Strategy guide conversion
- **BALANCE_TESTING.md**: Updated for gem system
- **.github/copilot-instructions.md**: Development guidelines

## ✅ Quality Assurance

### **Balance Verification**

- **Expert Success Rate**: 92.0% (healthy difficulty)
- **Average Success Rate**: 48.0% (challenging but fair)
- **Multi-skill Testing**: Comprehensive difficulty curve

### **Feature Completeness**

- ✅ Visual gem sockets with animations
- ✅ Complete gem type system (pure, enhancement, combination)
- ✅ Purity calculation and display
- ✅ Economic balance maintained
- ✅ All UI elements converted
- ✅ Modal gem selection interface
- ✅ Right-click gem removal
- ✅ Effect stacking system

---

## **Ready to Master the Gems! 💎⚔️**
