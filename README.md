# 🍄 Mushroom Revolution - Tower Defense Game

A challenging, web-based tower defense game featuring a sophisticated **elemental gem system**, diverse enemy mechanics, and strategic depth. Defend your mushroom colony using elemental magic and tactical upgrades!

![Game Screenshot](https://via.placeholder.com/800x400/8FBC8F/2d5016?text=Mushroom+Revolution+Tower+Defense)

## 🎮 Core Gameplay Features

### 🏗️ **Tower Defense Fundamentals**

- **Strategic Tower Placement**: Defend against 50 challenging waves
- **Resource Management**: Carefully spend limited currency earned from defeating enemies
- **Progressive Difficulty**: Each wave introduces new challenges and enemy combinations

### 💎 **Elemental Gem System** (Mushroom Revolution Style)

- **5 Core Elements**: Fire 🔥, Water 💧, Thunder ⚡, Wind 💨, Earth �
- **Gem Socket System**: Towers have 1-3 gem slots based on type
- **Pure vs Impure**: Pure gems (single element) vs Impure combinations
- **Combination Gems**: Special gems created from multiple elements
- **Strategic Depth**: Socket gems carefully - each choice impacts tower behavior!

### 🏰 **Tower Types & Gem Slots**

- 🌱 **Basic Tower**: 2 gem slots (22 damage, balanced)
- 🍄 **Splash Tower**: 3 gem slots (35 damage, area effect)
- 🦠 **Poison Tower**: 2 gem slots (18 damage + DoT)
- 🎯 **Sniper Tower**: 1 gem slot (75 damage, precise)

**Gem Enhancement System:**

- **Pure Elemental Gems**: Fire (+25% damage + burn), Water (+20% damage + slow), Thunder (chains + speed)
- **Enhancement Gems**: Damage Crystal (+30%), Haste Crystal (+50% speed), Scope Crystal (+40% range)
- **Combination Gems**: Steam (Fire+Water), Storm (Wind+Thunder), Magma (Fire+Earth)
- **Legendary Gems**: Multi-element combinations with devastating effects

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
- **� Water**: Slowing effects (+20% damage, 30% slow)
- **⚡ Thunder**: Chain lightning between enemies (+15% damage, +20% speed)
- **💨 Wind**: Attack speed and range bonuses (+40% speed, +10% range)
- **� Earth**: Armor penetration and stability (+10% damage, 8 armor pen)

### **Tower Purity System**

- **Pure Towers**: All gems are the same element and pure → Enhanced elemental effects
- **Impure Towers**: Mixed elements or impure gems → Versatile but less specialized
- **None**: No elemental gems → Basic tower performance

### **Combination Gems** (Impure)

- **💨 Steam Gem** (Fire + Water): Damaging steam clouds with splash
- **⛈️ Storm Gem** (Wind + Thunder): Lightning chains with wind burst effects
- **🌋 Magma Gem** (Fire + Earth): Molten damage with burn and armor piercing

### **Legendary Multi-Element Gems**

- **🌟 Elemental Fury** (Fire + Water + Thunder): Random elemental effects, triple chains
- **🌿 Nature's Harmony** (Earth + Wind + Water): Perfect balance with healing aura

### **Strategic Depth**

- **Element Mastery**: Pure towers excel in their element's specialty
- **Combination Power**: Mix elements for unique multi-effect abilities
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
