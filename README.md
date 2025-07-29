# 🍄 TDGAME - Tower Defense Game

A modern, web-based tower defense game inspired by "Mushroom Revolution" featuring organic graphics, strategic gameplay, and multiplayer capabilities. Built with modern web technologies and containerized for easy deployment.

![Game Screenshot](https://via.placeholder.com/800x400/8FBC8F/2d5016?text=Mushroom+Revolution+Tower+Defense)

## 🎮 Game Features

### Core Gameplay

- **Strategic Tower Defense**: Place and upgrade towers to defend against waves of enemies
- **Multiple Tower Types**: 4 unique towers with distinct abilities and 3 upgrade levels each
  - 🌱 **Spore Shooter**: Basic defensive tower with reliable damage
  - 🍄 **Boom Mushroom**: Explosive splash damage tower
  - 🦠 **Toxic Spore**: Poison and slow effects tower
  - 🎯 **Laser Bloom**: High damage, long-range sniper tower
- **Diverse Enemies**: 7 different enemy types with unique characteristics
  - 🐛 Basic enemies, 🦎 Fast runners, 🐢 Heavy armored units
  - 🦋 Flying enemies, 🦠 Regenerating foes, 👹 Boss monsters
- **50 Progressive Waves**: Increasing difficulty with boss battles every 5-10 waves
- **Resource Management**: Strategic economy with tower costs and upgrade decisions

### Visual & Audio

- **Organic Art Style**: Nature-themed graphics with mushroom colony aesthetics
- **Smooth Animations**: 60fps gameplay with particle effects and visual feedback
- **Responsive Design**: Works on desktop, tablets, and mobile devices
- **Sound Design**: Background music and interactive sound effects

### Multiplayer & Social

- **Real-time Spectating**: Watch other players' games live
- **Global Leaderboards**: Compete for high scores
- **Session Sharing**: Join friends' games as spectators
- **Statistics Tracking**: Detailed performance analytics

## 🏗️ Technical Architecture

### Frontend Stack

- **HTML5 Canvas**: Hardware-accelerated game rendering
- **Modern JavaScript (ES6+)**: Modular, maintainable codebase
- **CSS3**: Responsive design with custom animations
- **Vite**: Fast build system and development server
- **Socket.io Client**: Real-time communication

### Backend Stack

- **Node.js**: Server runtime
- **Express.js**: Web framework
- **Socket.io**: Real-time multiplayer functionality
- **Winston**: Structured logging
- **JSON Storage**: Lightweight data persistence

### DevOps & Deployment

- **Docker Compose**: Multi-container orchestration
- **Nginx**: Frontend static file serving with caching
- **Health Checks**: Monitoring and auto-recovery
- **Environment Configuration**: Easy dev/prod deployment

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Installation & Launch

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd TDGame
   ```

2. **Start with Docker Compose**

   ```bash
   docker-compose up --build
   ```

3. **Access the Game**
   - Open your browser to: `http://localhost:3000`
   - Backend API available at: `http://localhost:3001`

4. **Stop the Game**

   ```bash
   docker-compose down
   ```

### Development Mode

1. **Frontend Development**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Backend Development**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

## 🎯 Game Controls

### Mouse Controls

- **Left Click**: Place towers, select towers, interact with UI
- **Right Click**: Cancel placement, deselect towers
- **Mouse Hover**: Preview tower placement and range

### Keyboard Shortcuts

- **Space**: Pause/Resume game
- **1-4**: Quick select tower types (Spore, Boom, Toxic, Laser)
- **U**: Upgrade selected tower
- **S**: Sell selected tower
- **N**: Start next wave
- **Escape**: Cancel current action

### UI Elements

- **Health**: Remaining lives (game over at 0)
- **Money**: Currency for buying/upgrading towers
- **Wave**: Current wave number and progress
- **Score**: Points earned from defeating enemies

## 📊 Game Mechanics

### Economy System

- **Starting Resources**: 20 health, 100 coins
- **Income**: Earn coins by defeating enemies
- **Wave Bonuses**: Additional rewards for completing waves
- **Upgrade Costs**: Progressive pricing for tower improvements

### Tower Strategies

- **Spore Shooter**: Reliable early-game defense, good for choke points
- **Boom Mushroom**: Excellent against grouped enemies, moderate range
- **Toxic Spore**: Crowd control specialist, slows enemy advances
- **Laser Bloom**: High-value targets and boss elimination

### Enemy Progression

- **Waves 1-5**: Basic enemy introduction
- **Waves 6-15**: Mixed enemy types with increasing health
- **Waves 16-25**: Flying enemies and advanced tactics required
- **Waves 26-50**: All enemy types with boss encounters

## 🛠️ Development Guide

### Project Structure

```md
TDGame/
├── docker-compose.yml          # Container orchestration
├── frontend/                   # Game client
│   ├── src/
│   │   ├── index.html         # Main game page
│   │   ├── js/
│   │   │   ├── game.js        # Core game engine
│   │   │   ├── towers.js      # Tower logic & management
│   │   │   ├── enemies.js     # Enemy AI & wave system
│   │   │   ├── ui.js          # User interface
│   │   │   └── utils.js       # Utilities & helpers
│   │   └── css/
│   │       └── style.css      # Game styling
│   ├── Dockerfile
│   └── package.json
├── backend/                    # Game server
│   ├── src/
│   │   ├── server.js          # Main server
│   │   ├── game-state.js      # Game state management
│   │   └── routes/
│   │       └── api.js         # REST API endpoints
│   ├── Dockerfile
│   └── package.json
├── data/                       # Persistent storage
└── README.md
```

### Key Game Classes

#### Frontend Classes

- **Game**: Main game engine and loop
- **Tower**: Individual tower logic and rendering
- **TowerManager**: Tower placement and management
- **Enemy**: Enemy behavior and pathfinding
- **WaveManager**: Wave spawning and progression
- **UIManager**: Interface updates and interactions
- **Vector2**: 2D math utilities
- **ParticleSystem**: Visual effects

#### Backend Classes

- **TowerDefenseServer**: Main server orchestration
- **GameState**: Session and score management
- **Socket Handlers**: Real-time communication

### Adding New Features

#### New Tower Type

1. Add tower configuration in `towers.js` `getStatsForType()`
2. Create tower icon/emoji in UI
3. Add tower item in `index.html`
4. Implement special projectile effects if needed

#### New Enemy Type

1. Add enemy stats in `enemies.js` `getStatsForType()`
2. Add to wave generation in `generateWaveData()`
3. Create enemy emoji/icon
4. Implement special behaviors in `Enemy.update()`

#### New Game Mechanics

1. Extend `Game` class with new systems
2. Add UI elements in `index.html` and `style.css`
3. Integrate with `UIManager` for user interaction
4. Add event handlers in `game.js`

## 🔧 Configuration

### Environment Variables

#### Frontend

- `NODE_ENV`: Development/production mode
- `BACKEND_URL`: Backend server URL

#### Backend

- `NODE_ENV`: Development/production mode
- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS
- `DATA_DIR`: Data storage directory
- `ADMIN_TOKEN`: Admin API access token

### Docker Compose Override

Create `docker-compose.override.yml` for local customization:

```yaml
version: '3.8'
services:
  frontend:
    ports:
      - "8080:80"  # Custom port
  backend:
    environment:
      - NODE_ENV=development
    volumes:
      - ./logs:/app/logs  # Custom log directory
```

## 📈 Performance Optimization

### Frontend Optimizations

- **Canvas Rendering**: Hardware-accelerated 2D graphics
- **Object Pooling**: Reuse enemy and projectile objects
- **Efficient Collision Detection**: Spatial partitioning for large enemy counts
- **Asset Preloading**: Minimize runtime loading delays
- **Delta Time**: Frame-rate independent gameplay

### Backend Optimizations

- **Connection Pooling**: Efficient socket management
- **Data Compression**: Minimize network payload
- **Session Cleanup**: Automatic removal of inactive sessions
- **Rate Limiting**: Prevent abuse and ensure fair play

## 🧪 Testing

### Manual Testing Checklist

- [ ] Tower placement and collision detection
- [ ] Enemy pathfinding and wave progression
- [ ] UI responsiveness and keyboard shortcuts
- [ ] Score submission and leaderboard updates
- [ ] Multiplayer spectating functionality
- [ ] Container startup and health checks

### Performance Testing

```bash
# Test server health
curl http://localhost:3001/health

# Check API endpoints
curl http://localhost:3001/api/stats
curl http://localhost:3001/api/leaderboard

# Load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3000/
```

## 🐛 Troubleshooting

### Common Issues

#### Game Won't Start

1. Check Docker containers: `docker-compose ps`
2. View logs: `docker-compose logs frontend backend`
3. Verify ports aren't in use: `netstat -an | grep :3000`

#### Performance Issues

1. Check browser console for JavaScript errors
2. Monitor network tab for failed requests
3. Reduce game speed if frame rate drops
4. Clear browser cache and restart

#### Multiplayer Connection Issues

1. Verify backend WebSocket connectivity
2. Check firewall settings for port 3001
3. Confirm CORS configuration in backend

#### Score Not Saving

1. Check backend logs for database errors
2. Verify data directory permissions
3. Test API endpoint: `curl -X POST localhost:3001/api/submit-score`

### Debug Mode

Set `NODE_ENV=development` to enable:

- Additional console logging
- Debug information overlay
- Extended error messages
- Performance metrics display

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Submit pull request with detailed description

### Code Style

- Use ES6+ JavaScript features
- Follow consistent indentation (2 spaces)
- Add comments for complex game logic
- Use descriptive variable and function names

### Pull Request Guidelines

- Include screenshots for UI changes
- Test with multiple tower configurations
- Verify multiplayer functionality
- Update documentation if needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by classic tower defense games (Specifically Mushroom Revolution by fortunacus)
- Built with modern web technologies
- Designed for educational and entertainment purposes
- Community feedback and contributions welcome

## 📞 Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section
- Join community discussions

---

## **Happy defending, Commander! May your mushroom colony thrive! 🍄⚔️
