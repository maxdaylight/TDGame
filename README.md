# 🍄 Mushroom Revolution - Tower Defense Game

A challenging, web-based tower defense game featuring a sophisticated **elemental trinket system**, diverse enemy mechanics, and strategic depth. Defend your mushroom colony using elemental magic and tactical upgrades!

![Game Screenshot](https://via.placeholder.com/800x400/8FBC8F/2d5016?text=Mushroom+Revolution+Tower+Defense)

## 🎮 Core Gameplay Features

### 🏗️ **Tower Defense Fundamentals**

- **Strategic Tower Placement**: Defend against 50 challenging waves
- **Resource Management**: Carefully spend limited currency earned from defeating enemies
- **Progressive Difficulty**: Each wave introduces new challenges and enemy combinations

### 💎 **Elemental Trinket System** (Like Mushroom Revolution)

- **6 Elemental Types**: Earth 🌍, Fire 🔥, Water 💧, Air 💨, Nature 🌿, Void 🌌
- **15+ Trinket Types**: Common to Legendary rarity trinkets with powerful effects
- **Combination System**: Legendary trinkets require multiple elements (e.g., Molten Earth = Earth + Fire)
- **Shop Mechanics**: Random trinket shop with refresh options
- **Strategic Depth**: Max 3 trinkets per tower, choose wisely!

### 🏰 **Tower Types & Upgrades**

- 🌱 **Spore Shooter**: Basic defensive tower (20 damage, fast rate)
- 🍄 **Boom Mushroom**: Splash damage specialist (30 damage, area effect)
- 🦠 **Toxic Spore**: Poison and debuff tower (15 damage + DoT)
- 🎯 **Laser Bloom**: Long-range sniper (60 damage, precise)

**Each tower can be enhanced with:**

- **Damage Trinkets**: Sharp Stone (+20% damage), Blazing Core (Fire element)
- **Speed Trinkets**: Wind Essence (+30% attack speed), Lightning Rune (Air + chaining)
- **Range Trinkets**: Eagle Eye (+25% range), Earth Lens (Earth + armor pen)
- **Special Trinkets**: Void Shard (ignores all defenses), Nature Heart (poison + life steal)

### 👹 **Diverse Enemy Arsenal** (15 Types!)

#### **Basic Enemies**

- 🐛 **Basic**: Standard enemy with moderate stats
- 🦎 **Fast**: High speed, lower health
- 🐢 **Heavy**: Armored tank with slow movement

#### **Special Ability Enemies**

- 🦋 **Flying**: Resistant to basic attacks, aerial movement
- 🦠 **Regenerating**: Constantly heals over time
- � **Stealth**: Becomes invisible periodically, untargetable
- 🛡️ **Shielded**: Regenerating shield that absorbs damage
- 😡 **Berserker**: Gains massive speed boost when low health
- 🪱 **Splitter**: Splits into multiple enemies when killed
- 🌀 **Teleporter**: Jumps forward along the path
- ⚔️ **Immune**: Immune to poison and slow effects
- 💚 **Healer**: Heals nearby enemies periodically

#### **Boss Enemies**

- 🎃 **Mini Boss**: Strong enemy with resistances (every 3-5 waves)
- 👹 **Boss**: Major threat with multiple abilities (every 10 waves)
- 💀 **Mega Boss**: Endgame nightmare with shields and immunities (wave 30+)

## 🔥 **Elemental Combat System**

### **Element Effects**

- **🌍 Earth**: Armor penetration, increased damage, range bonuses
- **🔥 Fire**: Burn damage over time, area effects
- **💧 Water**: Slowing effects, extended range, crowd control
- **💨 Air**: Attack speed boosts, chain lightning effects
- **🌿 Nature**: Poison damage, life steal, spreading effects
- **🌌 Void**: Ignores ALL resistances and armor, ultimate damage

### **Legendary Combinations**

- **🌋 Molten Earth** (Earth + Fire): Massive splash damage with burn
- **⛈️ Storm Surge** (Water + Air): Ultra-fast attacks with chaining slows
- **☢️ Toxic Void** (Nature + Void): Spreading poison that ignores defenses

### **Strategic Depth**

- **Counter-Play**: Use Void against immune enemies, Fire against regenerating
- **Synergy Building**: Combine elements for exponentially powerful effects
- **Economic Decisions**: Trinkets are expensive - choose wisely!

## 🎯 **Difficulty & Challenge**

### **Hardcore Balancing**

- **Reduced Rewards**: Enemy kills give 50-70% less currency than typical TD games
- **Faster Waves**: Enemies spawn much more frequently
- **Complex Enemies**: Multiple special abilities and immunities
- **Resource Scarcity**: Every purchase decision matters

### **Wave Progression**

- **Waves 1-3**: Tutorial with basic enemies
- **Waves 4-8**: Introduction of fast, heavy, and stealth enemies
- **Waves 9-15**: Flying, shielded, and berserker enemies join
- **Waves 16-25**: Splitters, teleporters, and immune enemies
- **Waves 26-35**: Healers and complex combinations
- **Waves 36-50**: All enemy types with multiple bosses per wave

## 🏗️ **Technical Architecture**

### **Frontend Stack**

- **HTML5 Canvas**: 60fps hardware-accelerated rendering
- **Modern JavaScript ES6+**: Modular, maintainable codebase
- **Vite Build System**: Fast development and optimized production builds
- **Socket.io Client**: Real-time multiplayer communication

### **Backend Stack**

- **Node.js 22**: Server runtime with latest features
- **Express.js**: RESTful API framework
- **Socket.io**: WebSocket-based real-time features
- **Winston Logging**: Structured application logging

### **DevOps**

- **Docker Compose**: Multi-container orchestration
- **Nginx**: Static file serving and reverse proxy
- **Health Checks**: Container monitoring and auto-recovery
- **Security Hardening**: Non-root containers, minimal attack surface

## 🚀 **Quick Deployment**

### **Prerequisites**

- Docker and Docker Compose installed
- Git for cloning the repository

### **Linux Server Deployment** (Recommended)

```bash
# Clone the repository
git clone https://github.com/maxdaylight/TDGame.git
cd TDGame

# Install Docker (if needed)
sudo apt update && sudo apt install -y docker.io docker-compose

# Start the game
sudo docker-compose up --build

# Access at http://your-server-ip:3000
```

### **Local Development**

```bash
# Clone and start
git clone https://github.com/maxdaylight/TDGame.git
cd TDGame
docker-compose up --build

# Access at http://localhost:3000
```

### **Stop the Game**

```bash
sudo docker-compose down
```

## 🎮 **How to Play**

### **Basic Controls**

- **Mouse**: Click to place towers, select/upgrade existing towers
- **Keyboard Shortcuts**:
  - `1-4`: Select tower types (Spore, Boom, Toxic, Laser)
  - `U`: Upgrade selected tower
  - `S`: Sell selected tower
  - `Space`: Pause/Resume
  - `N`: Start next wave

### **Getting Started Strategy**

1. **Start Simple**: Place Spore Shooters to establish basic defense
2. **Buy Basic Trinkets**: Sharp Stone (+20% damage) or Wind Essence (+30% speed)
3. **Add Elements**: Get Blazing Core (Fire) or Frost Crystal (Water) for elemental effects
4. **Build Combinations**: Once you have elements, buy legendary combination trinkets
5. **Counter Enemies**: Use Void against immune enemies, Fire against regenerating ones

### **Advanced Tactics**

- **Trinket Synergy**: Earth + Fire = Molten Earth for massive splash damage
- **Economic Management**: Currency is scarce - plan your purchases carefully
- **Enemy Adaptation**: Different enemy types require different elemental counters
- **Late Game**: Focus on Void element to pierce through boss immunities

## 🛠️ **Development Guide**

### **Project Structure**

```md
TDGame/
├── docker-compose.yml          # Container orchestration
├── frontend/                   # Game client
│   ├── src/
│   │   ├── index.html         # Main game page
│   │   ├── js/
│   │   │   ├── game.js        # Core game engine
│   │   │   ├── towers.js      # Tower logic & trinket system
│   │   │   ├── enemies.js     # Enemy AI & special abilities
│   │   │   ├── elements.js    # Elemental trinket system
│   │   │   ├── ui.js          # User interface
│   │   │   └── utils.js       # Math & utility functions
│   │   └── css/style.css      # Game styling
├── backend/                    # Game server
│   ├── src/
│   │   ├── server.js          # Express server & Socket.io
│   │   ├── game-state.js      # Multiplayer state management
│   │   └── routes/api.js      # REST API endpoints
└── README.md
```

### **Adding New Features**

#### **New Trinket Type**

```javascript
// In elements.js
TRINKET_TYPES.NEW_TRINKET = {
    name: 'New Trinket',
    type: 'damage',
    rarity: 'rare',
    cost: 75,
    effects: { damageMultiplier: 1.5 },
    description: '+50% damage',
    emoji: '⚡'
};
```

#### **New Enemy Type**

```javascript
// In enemies.js getStatsForType()
'new_enemy': {
    health: 200,
    speed: 45,
    reward: 15,
    armor: 5,
    color: '#FF0000',
    emoji: '👾',
    size: 20
}
```

#### **New Element**

```javascript
// In elements.js
ELEMENTS.CRYSTAL = {
    name: 'Crystal',
    color: '#FF00FF',
    emoji: '💎',
    description: 'Multiplies damage based on enemy health'
};
```

## 🔧 **Configuration & Troubleshooting**

### **Environment Variables**

- `NODE_ENV`: Set to 'development' for debug mode
- `PORT`: Backend port (default: 3001)

### **Common Issues**

#### **Game Won't Start**

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs frontend backend

# Restart containers
docker-compose down && docker-compose up --build
```

#### **Performance Issues**

- Reduce browser zoom if frame rate drops
- Close other browser tabs
- Check browser console for JavaScript errors

#### **Can't Connect to Multiplayer**

- Verify port 3001 is accessible
- Check firewall settings
- Ensure backend container is running

### **Debug Mode**

Set `NODE_ENV=development` in docker-compose.yml to enable:

- Extended console logging
- Performance metrics
- Debug information overlay

## 📊 **Game Balance & Statistics**

### **Economy Balance**

- **Starting Resources**: 100 coins, 20 health
- **Enemy Rewards**: 4-100 coins (significantly reduced for challenge)
- **Tower Costs**: 50-150 coins (unchanged)
- **Trinket Costs**: 25-220 coins (major investment required)

### **Difficulty Progression**

- **Wave 1-5**: Tutorial, 8-14 basic enemies
- **Wave 6-15**: 16-28 mixed enemies with special abilities
- **Wave 16-30**: 30-48 enemies, all types, multiple bosses
- **Wave 31-50**: 50-100+ enemies, hardcore survival challenge

### **Trinket Rarity Distribution**

- **Common** (50%): Basic stat boosts
- **Rare** (30%): Elemental effects
- **Epic** (15%): Powerful combinations
- **Legendary** (5%): Game-changing abilities

## 🏆 **Achievements & Challenges**

### **Survival Challenges**

- **Wave 10**: First real test with flying enemies
- **Wave 15**: Multiple enemy types with special abilities
- **Wave 25**: First mega boss encounter
- **Wave 35**: Economic management becomes critical
- **Wave 50**: Ultimate survival test

### **Strategic Challenges**

- **Elemental Master**: Use all 6 elements in one game
- **Legendary Collector**: Equip all 3 legendary combination trinkets
- **Minimalist**: Beat wave 20 with only basic towers
- **Economic Genius**: Finish wave 30 with 500+ coins remaining

## 🤝 **Contributing**

### **Development Setup**

```bash
# Frontend development
cd frontend && npm install && npm run dev

# Backend development
cd backend && npm install && npm run dev
```

### **Code Style**

- Use ES6+ JavaScript features
- Follow consistent 2-space indentation
- Add JSDoc comments for complex functions
- Test new features thoroughly

### **Pull Request Guidelines**

- Include screenshots for UI changes
- Test with multiple enemy wave configurations
- Verify trinket combinations work correctly
- Update documentation for new features

## 📄 **License**

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 **Acknowledgments**

- **Inspired by**: Mushroom Revolution by fortunacus
- **Built with**: Modern web technologies for maximum compatibility
- **Designed for**: Strategic depth and replayability
- **Community**: Feedback and contributions welcome!

---

## **Ready to defend your mushroom colony? 🍄⚔️**

**The spores are counting on you, Commander!**

*Deploy at: `docker-compose up --build` and access at `http://localhost:3000`*
