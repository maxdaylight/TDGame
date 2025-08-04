# 🍄 TDGAME - Tower Defense Game

A challenging, web-based tower defense game featuring a sophisticated **elemental gem system**, diverse enemy mechanics, and strategic depth. Build and upgrade towers to defend against waves of enemies using strategic gem combinations!

![Game Screenshot](https://via.placeholder.com/800x400/8FBC8F/2d5016?text=TDGAME+Tower+Defense)

## 🎮 Core Gameplay Features

### 🏗️ **Tower Defense Fundamentals**

- **Strategic Tower Placement**: Defend against 50 challenging waves
- **Resource Management**: Carefully spend limited currency earned from defeating enemies
- **Progressive Difficulty**: Each wave introduces new challenges and enemy combinations

### 💎 **Elemental Gem System**

- **5 Core Elements**: Fire 🔥, Water 💧, Thunder ⚡, Wind 💨, Earth 🌍
- **Level-Based Gem Slots**: Towers gain more slots as they upgrade (1→2→3 slots)
- **Elemental Mastery**: Specialize towers in specific elements for maximum effectiveness
- **Strategic Depth**: Choose gems carefully - each element has unique benefits!

### 🏰 **Tower Types & Upgrade System**

- 🌱 **Basic Tower**: 22 damage, balanced all-around performance
- 🍄 **Splash Tower**: 18 damage, area effect (reduced direct damage for balance)
- 🦠 **Poison Tower**: 8 damage + DoT poison effects
- 🎯 **Sniper Tower**: 85 damage, high precision long-range

**Level-Based Gem Slots:**

- **Level 1**: 1 gem slot
- **Level 2**: 2 gem slots
- **Level 3**: 3 gem slots

**Gem Enhancement System:**

- **Fire Gem** 🔥: +25% damage + burn effects over time
- **Water Gem** 💧: +20% damage + enemy slowdown effects  
- **Thunder Gem** ⚡: +15% damage + chain lightning + attack speed
- **Wind Gem** 💨: +40% attack speed + 10% range + projectile speed
- **Earth Gem** 🌍: +10% damage + armor penetration + splash radius

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

## 🔥 **Elemental Gem System**

### **Pure Element Effects**

- **🔥 Fire**: Burn damage over time, increased raw damage (+25%)
- **💧 Water**: Slowing effects (+20% damage, 30% slow)
- **⚡ Thunder**: Chain lightning between enemies (+15% damage, +20% speed)
- **💨 Wind**: Attack speed and range bonuses (+40% speed, +10% range)
- **🌍 Earth**: Armor penetration and stability (+10% damage, 8 armor pen)

### **Tower Purity System**

- **Pure Towers**: All gems are the same element → Enhanced elemental effects
- **Mixed Towers**: Different elements → Versatile effects from each gem
- **None**: No elemental gems → Basic tower performance

### **Strategic Depth**

- **Element Mastery**: Pure towers excel in their element's specialty
- **Diverse Strategies**: Mix elements for different tactical approaches
- **Socket Limitations**: Choose gems wisely - limited slots per tower
- **Economic Decisions**: Gems are expensive investments

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
sudo docker-compose up -d --build --no-cache

# Access at http://your-server-ip:3000
```

### **Local Development**

```bash
# Clone and start
git clone https://github.com/maxdaylight/TDGame.git
cd TDGame
docker-compose up -d --build --no-cache

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

1. **Start Simple**: Place Basic Towers to establish defense
2. **Socket Basic Gems**: Damage Crystal (+30%) or Haste Crystal (+50% speed)
3. **Add Elements**: Get Pure Fire Gem or Pure Water Gem for elemental effects
4. **Build Combinations**: Mix elements in multi-slot towers for combination gems
5. **Achieve Purity**: Focus on single elements for pure tower bonuses

### **Advanced Tactics**

- **Gem Synergy**: Fire + Earth = Magma for massive damage and burn
- **Purity Strategy**: Pure towers get enhanced elemental bonuses
- **Economic Management**: Gems are expensive - plan socket choices carefully
- **Element Counters**: Different elements excel against different enemy types
- **Right-click Removal**: Remove gems for 60% refund to respec towers

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
│   │   │   ├── towers.js      # Tower logic & gem system
│   │   │   ├── enemies.js     # Enemy AI & special abilities
│   │   │   ├── elements.js    # Elemental gem system
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

#### **New Gem Type**

```javascript
// In elements.js
GEM_TYPES.NEW_GEM = {
    name: 'New Gem',
    type: 'element',
    element: 'FIRE',
    pure: true,
    cost: 45,
    effects: { damageMultiplier: 1.3 },
    description: '+30% fire damage',
    emoji: '🔥',
    rarity: 'common'
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
    description: 'Amplifies damage based on gem purity'
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
docker-compose down && docker-compose up -d --build --no-cache
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
- **Gem Costs**: 25-160 coins (strategic investment required)

### **Difficulty Progression**

- **Wave 1-5**: Tutorial, 8-14 basic enemies
- **Wave 6-15**: 16-28 mixed enemies with special abilities
- **Wave 16-30**: 30-48 enemies, all types, multiple bosses
- **Wave 31-50**: 50-100+ enemies, hardcore survival challenge

### **Gem Rarity Distribution**

- **Common** (60%): Basic elemental and enhancement gems
- **Rare** (25%): Combination gems (2 elements)
- **Epic** (10%): Multi-element legendary gems
- **Legendary** (5%): Ultimate combination effects

## 🏆 **Achievements & Challenges**

### **Survival Challenges**

- **Wave 10**: First real test with flying enemies
- **Wave 15**: Multiple enemy types with special abilities
- **Wave 25**: First mega boss encounter
- **Wave 35**: Economic management becomes critical
- **Wave 50**: Ultimate survival test

### **Strategic Challenges**

- **Elemental Master**: Use all 5 elements in one game
- **Purity Seeker**: Create 3 pure towers in a single run
- **Combination Expert**: Socket all available combination gems
- **Minimalist**: Beat wave 20 with only basic towers and no gems
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
- Verify gem combinations work correctly
- Update documentation for new features

## 📄 **License**

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 **Acknowledgments**

- **Inspired by**: Tower defense gaming classics
- **Built with**: Modern web technologies for maximum compatibility
- **Designed for**: Strategic depth and replayability
- **Community**: Feedback and contributions welcome!

---

## **Ready to defend your base? �️⚔️**

**Victory awaits, Commander!**

*Deploy at: `docker-compose up -d --build --no-cache` and access at `http://localhost:3000`*
