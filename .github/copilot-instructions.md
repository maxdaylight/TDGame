# Copilot Instructions for Mushroom Revolution Tower Defense

This document provides comprehensive development guidelines and best practices for GitHub Copilot when working on the Mushroom Revolution Tower Defense game.

## 🎯 Project Overview

**Mushroom Revolution** is a sophisticated web-based tower defense game featuring:
- **Elemental trinket system** with 6 elements and 15+ trinket types
- **15 diverse enemy types** with unique abilities and resistances
- **4 tower types** with extensive upgrade and customization options
- **Real-time multiplayer** support with Socket.io
- **Docker-based deployment** with frontend/backend separation
- **Automated balance testing** with Python simulation tools

## 🚨 MANDATORY BALANCE TESTING WORKFLOW

**BEFORE making ANY changes to game balance (towers.js, enemies.js, game.js):**

1. **Run baseline test**: 
   ```powershell
   python quick_balance_test.py
   ```

2. **Make your changes** to tower stats, enemy stats, or economy

3. **Run verification test**:
   ```powershell
   python quick_balance_test.py
   ```

4. **Check results**:
   - ✅ **OPTIMAL/ACCEPTABLE**: Proceed with changes
   - ❌ **TOO EASY/TOO HARD**: Adjust parameters and re-test

5. **If balance fails**, use detailed analysis:
   ```powershell
   python find_balance.py
   ```

**⚠️ NEVER skip balance testing when modifying game mechanics! ⚠️**

This ensures the game remains challenging yet possible for players.

## ⚖️ Balance Testing Protocol

### **CRITICAL: Always Test Balance Changes**

**Before making ANY changes to tower stats, enemy stats, or economy:**

1. **Run Balance Simulation:**
   ```powershell
   python balance_simulator.py
   ```

2. **Target Success Rates:**
   - Early Waves (1-3): 65-75% success rate
   - Mid Waves (4-6): 55-70% success rate  
   - Late Waves (7+): 45-65% success rate

3. **Quick Balance Check:**
   ```powershell
   python quick_balance_test.py
   ```

4. **If balance is broken, use:**
   ```powershell
   python find_balance.py
   ```

### **Balance Testing Workflow for GitHub Copilot**

**MANDATORY PROCESS when making game balance changes:**

1. **Before Changes**: Run `python quick_balance_test.py` to establish baseline
2. **Make Changes**: Edit towers.js, enemies.js, or game.js
3. **Test Changes**: Run `python quick_balance_test.py` after changes
4. **Validate Results**: Ensure success rates are within target ranges (65-75% for early waves)
5. **If Failed**: Use `python find_balance.py` to calculate optimal settings
6. **Docker Test**: Test with `docker-compose up --build` for final verification
7. **Manual Verification**: Test gameplay in browser at http://localhost:3000

### **Balance Testing Checklist**
- [ ] Run `python quick_balance_test.py` before changes
- [ ] Make your changes to towers.js, enemies.js, or game.js
- [ ] Run `python quick_balance_test.py` after changes
- [ ] Ensure success rates are within target ranges (65-75% early waves)
- [ ] Test with Docker: `docker-compose up --build`
- [ ] Manual verification in browser

### **Critical Balance Parameters**
```javascript
// Current Optimal Settings (DO NOT CHANGE without testing)
STARTING_MONEY = 95;           // Tight but manageable
BASIC_TOWER_DAMAGE = 18;       // Mathematically calculated
BASIC_TOWER_FIRE_RATE = 1.4;   // 25.2 DPS total
BASIC_ENEMY_HEALTH = 80;       // Requires 4.4 shots to kill
WAVE_BONUS_MULTIPLIER = 12;    // Economy progression
```

### **When Balance Testing Fails**
If simulation shows:
- **>85% success rate**: Game too easy - increase enemy health or reduce tower damage
- **<55% success rate**: Game too hard - decrease enemy health or increase tower damage
- **Uneven progression**: Adjust wave composition in enemies.js

### **Balance Testing Tools**
- `quick_balance_test.py`: Fast verification for development workflow (⭐ PRIMARY TOOL)
- `balance_simulator.py`: Comprehensive balance analysis
- `verify_final_balance.py`: Quick verification of current settings  
- `find_balance.py`: Mathematical optimization for perfect balance
- `test_corrected_balance.py`: Test specific parameter combinations

## 🏗️ Architecture Guidelines

### Frontend Structure (`frontend/`)
- **HTML5 Canvas** for 60fps hardware-accelerated rendering
- **Modern ES6+ JavaScript** with modular design
- **Vite** for fast development and optimized builds
- **Socket.io client** for real-time communication

### Backend Structure (`backend/`)
- **Node.js 22+** with Express.js framework
- **Socket.io** for WebSocket-based multiplayer
- **Winston** for structured logging
- **RESTful API** design patterns

### Key Files and Responsibilities
```
frontend/src/js/
├── game.js       # Core game engine, main loop, state management
├── towers.js     # Tower logic, trinket system, upgrades
├── enemies.js    # Enemy AI, movement, special abilities
├── elements.js   # Elemental trinket definitions and effects
├── ui.js         # User interface, controls, HUD
└── utils.js      # Math utilities, collision detection, helpers

backend/src/
├── server.js     # Express server, Socket.io setup
├── game-state.js # Multiplayer state synchronization
└── routes/api.js # REST API endpoints
```

## 🎮 Game System Guidelines

### Trinket System Development
When working with the trinket system:

```javascript
// Always follow this structure for new trinkets
TRINKET_TYPES.NEW_TRINKET = {
    name: 'Descriptive Name',
    type: 'damage|speed|range|special',
    rarity: 'common|rare|epic|legendary',
    cost: 25-220, // Based on rarity and power
    effects: {
        damageMultiplier: 1.0,    // Multiplicative damage
        speedMultiplier: 1.0,     // Attack speed multiplier
        rangeMultiplier: 1.0,     // Range multiplier
        // Custom effects for special trinkets
    },
    elements: ['earth', 'fire'], // Required elements (for legendary)
    description: 'Clear, concise description',
    emoji: '💎'
};
```

### Enemy System Development
When adding new enemies:

```javascript
// In enemies.js getStatsForType()
'new_enemy_type': {
    health: 100,        // Base health points
    speed: 50,          // Movement speed (pixels/frame)
    reward: 10,         // Currency reward when killed
    armor: 0,           // Damage reduction
    resistances: [],    // Array of resistance types
    immunities: [],     // Array of immunity types
    color: '#FF0000',   // Visual color
    emoji: '👾',        // Display emoji
    size: 15,           // Collision radius
    abilities: []       // Special abilities array
}
```

### Element Interactions
Always consider elemental interactions:

```javascript
// Element effectiveness matrix
const ELEMENT_INTERACTIONS = {
    'fire': { effective: ['nature'], weak: ['water'] },
    'water': { effective: ['fire'], weak: ['earth'] },
    'earth': { effective: ['air'], weak: ['nature'] },
    'air': { effective: ['water'], weak: ['fire'] },
    'nature': { effective: ['earth'], weak: ['fire'] },
    'void': { effective: ['all'], weak: [] } // Void ignores all resistances
};
```

## 💻 Coding Standards

### JavaScript Best Practices
1. **Use ES6+ features**: Arrow functions, destructuring, template literals
2. **Modular design**: Keep functions focused and single-purpose
3. **Consistent naming**: camelCase for variables/functions, UPPER_CASE for constants
4. **Performance-conscious**: Optimize for 60fps rendering

```javascript
// ✅ Good: Modular, clear function
const calculateDamage = (baseDamage, trinketEffects, targetArmor) => {
    const damageMultiplier = trinketEffects.damageMultiplier || 1.0;
    const armorReduction = Math.max(0, targetArmor - (trinketEffects.armorPen || 0));
    return Math.max(1, (baseDamage * damageMultiplier) - armorReduction);
};

// ❌ Avoid: Monolithic, unclear function
function doStuff(tower, enemy) {
    // Complex logic without clear purpose
}
```

### Canvas Rendering Guidelines
1. **Batch draw calls**: Group similar rendering operations
2. **Use requestAnimationFrame**: Never use setInterval for animation
3. **Clear efficiently**: Only clear dirty regions when possible

```javascript
// ✅ Efficient rendering pattern
function render(ctx, gameState) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Batch similar elements
    renderBackground(ctx);
    renderTowers(ctx, gameState.towers);
    renderEnemies(ctx, gameState.enemies);
    renderProjectiles(ctx, gameState.projectiles);
    renderUI(ctx, gameState);
}
```

### Error Handling
Always implement proper error handling:

```javascript
// ✅ Robust error handling
try {
    const trinket = TRINKET_TYPES[trinketId];
    if (!trinket) {
        throw new Error(`Unknown trinket type: ${trinketId}`);
    }
    tower.addTrinket(trinket);
} catch (error) {
    console.error('Failed to add trinket:', error);
    showErrorMessage('Could not equip trinket');
}
```

## 🔧 Development Workflow

### Local Development Setup
```powershell
# Clone and setup
git clone https://github.com/maxdaylight/TDGame.git
cd TDGame

# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Development mode (separate terminals)
cd frontend && npm run dev    # Vite dev server
cd backend && npm run dev     # Nodemon auto-restart

# Or use Docker for full environment
docker-compose up --build
```

### Testing Guidelines
1. **Manual testing required**: Test all enemy waves, trinket combinations
2. **Performance testing**: Ensure 60fps with 100+ enemies on screen
3. **Cross-browser testing**: Chrome, Firefox, Safari, Edge
4. **Mobile responsive**: Test on various screen sizes

### Code Review Checklist
- [ ] **Performance**: No frame drops or memory leaks
- [ ] **Balance**: New features don't break game difficulty
- [ ] **Compatibility**: Works in all supported browsers
- [ ] **Documentation**: Complex functions have JSDoc comments
- [ ] **Error handling**: Graceful degradation for edge cases

## 🎨 UI/UX Guidelines

### Visual Consistency
1. **Color scheme**: Earth tones with bright accent colors
2. **Typography**: Use system fonts for performance
3. **Icons**: Emoji for cross-platform compatibility
4. **Spacing**: Consistent 8px grid system

### Accessibility
1. **Keyboard support**: All controls accessible via keyboard
2. **Color blind friendly**: Don't rely solely on color for information
3. **Clear feedback**: Visual and audio feedback for all actions
4. **Scalable text**: Respect user font size preferences

## 🚀 Performance Optimization

### Frontend Performance
1. **Object pooling**: Reuse enemy/projectile objects
2. **Efficient collision detection**: Use spatial partitioning
3. **Minimize DOM manipulation**: Use canvas for game elements
4. **Optimize assets**: Compress images, minimize CSS/JS

```javascript
// ✅ Object pooling example
class EnemyPool {
    constructor(size = 100) {
        this.pool = Array(size).fill(null).map(() => new Enemy());
        this.activeEnemies = [];
    }
    
    spawn(type, position) {
        const enemy = this.pool.pop();
        if (enemy) {
            enemy.reset(type, position);
            this.activeEnemies.push(enemy);
            return enemy;
        }
        return new Enemy(type, position); // Fallback
    }
    
    despawn(enemy) {
        const index = this.activeEnemies.indexOf(enemy);
        if (index > -1) {
            this.activeEnemies.splice(index, 1);
            this.pool.push(enemy);
        }
    }
}
```

### Backend Performance
1. **Efficient state synchronization**: Only send changed data
2. **Rate limiting**: Prevent spam/abuse
3. **Memory management**: Clean up disconnected players
4. **Database optimization**: Use indexes, connection pooling

## 🔒 Security Guidelines

### Frontend Security
1. **Input validation**: Validate all user inputs
2. **XSS prevention**: Sanitize dynamic content
3. **HTTPS only**: Force secure connections in production
4. **Content Security Policy**: Restrict resource loading

### Backend Security
1. **Helmet.js**: Security headers middleware
2. **CORS configuration**: Restrict origins appropriately
3. **Rate limiting**: Prevent DoS attacks
4. **Input sanitization**: Validate all API inputs

```javascript
// ✅ Secure input validation
function validateTowerPlacement(x, y, towerType) {
    // Validate coordinates
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
        throw new Error('Invalid coordinates');
    }
    
    // Validate bounds
    if (x < 0 || x >= GAME_WIDTH || y < 0 || y >= GAME_HEIGHT) {
        throw new Error('Coordinates out of bounds');
    }
    
    // Validate tower type
    if (!TOWER_TYPES.hasOwnProperty(towerType)) {
        throw new Error('Invalid tower type');
    }
    
    return true;
}
```

## 🐛 Debugging Guidelines

### Common Debug Patterns
1. **Console logging**: Use structured logging with Winston
2. **Performance profiling**: Use browser dev tools
3. **State inspection**: Add debug overlays in development
4. **Network monitoring**: Monitor Socket.io connections

### Debug Mode Features
When `NODE_ENV=development`:
- Extended console logging
- Performance metrics overlay
- Debug information display
- Skip wave functionality for testing

```javascript
// ✅ Conditional debug code
if (process.env.NODE_ENV === 'development') {
    window.DEBUG = {
        skipToWave: (waveNumber) => {
            gameState.currentWave = waveNumber;
            console.log(`Skipped to wave ${waveNumber}`);
        },
        addCurrency: (amount) => {
            gameState.currency += amount;
            console.log(`Added ${amount} currency`);
        }
    };
}
```

## 📦 Deployment Guidelines

### Docker Best Practices
1. **Multi-stage builds**: Optimize image sizes
2. **Health checks**: Monitor container health
3. **Environment variables**: Configure via env vars
4. **Security**: Run as non-root user

### Production Considerations
1. **Minification**: Compress CSS/JS assets
2. **CDN**: Serve static assets from CDN
3. **Monitoring**: Log errors and performance metrics
4. **Backup**: Regular backup of high scores/user data

## 📚 Documentation Standards

### Code Documentation
1. **JSDoc comments**: For complex functions and classes
2. **README updates**: Keep project documentation current
3. **API documentation**: Document all backend endpoints
4. **Change logs**: Document breaking changes

```javascript
/**
 * Calculates effective damage after applying trinket effects and enemy resistances
 * @param {number} baseDamage - Base tower damage
 * @param {Object} trinketEffects - Combined effects from all trinkets
 * @param {Object} enemy - Target enemy with resistances
 * @returns {number} Final damage amount
 */
function calculateEffectiveDamage(baseDamage, trinketEffects, enemy) {
    // Implementation...
}
```

## 🎯 Feature Development Process

### Adding New Features
1. **Plan**: Document the feature requirements
2. **Design**: Consider impact on game balance
3. **Implement**: Follow coding standards
4. **Test**: Verify functionality and performance
5. **Document**: Update relevant documentation

### Game Balance Considerations
- **Currency economy**: Maintain scarcity for challenge
- **Power progression**: Avoid trivializing early content
- **Counter-play**: Ensure all strategies have counters
- **Accessibility**: New players should be able to learn

## 🤝 Collaboration Guidelines

### Git Workflow
1. **Feature branches**: Create branches for new features
2. **Descriptive commits**: Clear, concise commit messages
3. **Small PRs**: Keep pull requests focused and reviewable
4. **Testing**: Test before committing

### Communication
1. **Clear descriptions**: Explain complex changes in PR descriptions
2. **Screenshots**: Include visuals for UI changes
3. **Breaking changes**: Clearly mark and document breaking changes
4. **Performance impact**: Note any performance implications

---

## 🎮 Quick Reference

### Common Commands
```powershell
# Development
npm run dev          # Start development server
npm run build        # Build for production
docker-compose up    # Full environment

# Debugging
npm run dev -- --debug    # Enable debug mode
docker-compose logs        # View container logs
```

### Key Constants
```javascript
// Game dimensions
GAME_WIDTH = 1200;
GAME_HEIGHT = 800;

// Performance targets
TARGET_FPS = 60;
MAX_ENEMIES = 100;

// Balance values
STARTING_CURRENCY = 100;
STARTING_HEALTH = 20;
```

Remember: This is a challenging tower defense game that emphasizes strategic depth, resource management, and elemental combat mechanics. All development should maintain this core identity while improving the player experience.
