# Game Monitoring System - AI Analysis Guide

## Overview

The TDGame now includes a comprehensive GameMonitor system that logs every action, decision, and event that occurs during gameplay. This creates a detailed trace that AI systems can analyze to understand player strategies, game balance, and performance patterns.

## How It Works

### Automatic Logging

- Every game action is automatically logged with precise timing
- Logs include game state context (health, money, wave, enemy count, etc.)
- Performance metrics are tracked continuously
- All logs are formatted for easy AI parsing

### AI-Readable Format

Each log entry follows this structure:

```md
[AI-LOG] TIME:12.34s SESSION:45.67s TYPE:tower_placed WAVE:3 HEALTH:18/20 MONEY:85 SCORE:1200 ENEMIES:5 TOWERS:3 PROJECTILES:2 DATA:type:basic cost:25 position:(120.0,240.0)
```

Key components:

- **TIME**: Game time in seconds since game start
- **SESSION**: Session time since page load
- **TYPE**: Event type (tower_placed, enemy_killed, wave_started, etc.)
- **WAVE**: Current wave number
- **HEALTH**: Player health remaining
- **MONEY**: Current money
- **SCORE**: Current score  
- **ENEMIES/TOWERS/PROJECTILES**: Current counts
- **DATA**: Event-specific details

## Event Types Logged

### Core Game Events

- `game_started` - Game begins
- `game_over` - Game ends (with reason)
- `game_paused` / `game_resumed` - Game state changes
- `game_completed` - All waves completed successfully

### Player Actions

- `tower_placed` - Tower placement with type, position, cost
- `tower_upgraded` - Tower upgrades with new level
- `tower_sold` - Tower sales with sell value
- `tower_selected` / `tower_deselected` - UI interactions
- `gem_socketed` - Gem installations with effects
- `speed_changed` - Game speed adjustments

### Game Events

- `enemy_spawned` - New enemy appears
- `enemy_killed` - Enemy destroyed (with reward, killer)
- `enemy_damaged` - Damage dealt to enemies
- `enemy_reached_end` - Enemy escapes
- `wave_started` / `wave_completed` - Wave transitions
- `projectile_fired` / `projectile_hit` - Combat actions

### System Events

- `health_changed` / `money_changed` / `score_changed` - Resource updates
- `performance_issue` - FPS drops or memory warnings
- `error` - Game errors with stack traces

## Browser Console Access

### Real-time Monitoring

Open browser console (F12) and use these commands:

```javascript
// Get current session statistics
GameMonitoringAPI.getSessionStats()

// Get live game state
GameMonitoringAPI.getLiveGameState()

// Export entire session log to console
GameMonitoringAPI.exportCurrentLog()

// Download session as JSON file
GameMonitoringAPI.downloadSessionLog()
```

### Sample AI Analysis Commands

```javascript
// Get the current monitor instance
const monitor = GameMonitoringAPI.getCurrentSession();

// Analyze tower placement patterns
const towerEvents = monitor.getEventsByType('tower_placed');
console.log('Tower placement analysis:', towerEvents);

// Get wave completion statistics
const waveStats = monitor.getWaveStatistics();
console.log('Wave performance:', waveStats);

// Check economic efficiency
const efficiency = monitor.calculateGameplayEfficiency();
console.log('Economic efficiency:', efficiency);
```

## AI Analysis Examples

### Strategy Pattern Detection

```javascript
// Find early vs late game tower preferences
const towerPlacements = monitor.getEventsByType('tower_placed');
const earlyGame = towerPlacements.filter(e => e.gameState.currentWave <= 3);
const lateGame = towerPlacements.filter(e => e.gameState.currentWave > 10);

console.log('Early game towers:', earlyGame.map(e => e.data.type));
console.log('Late game towers:', lateGame.map(e => e.data.type));
```

### Economic Decision Analysis

```javascript
// Analyze spending patterns
const moneyEvents = monitor.getEventsByType('money_changed');
const spendingDecisions = towerPlacements.map(event => ({
    wave: event.gameState.currentWave,
    moneyBefore: event.gameState.money + event.data.cost,
    moneyAfter: event.gameState.money,
    towerType: event.data.type,
    riskLevel: event.gameState.money / event.gameState.health // Money per health point
}));
```

### Performance Correlation

```javascript
// Correlate FPS with game complexity
const performanceData = monitor.sessionData.performance;
const complexityEvents = monitor.eventLog.filter(e => 
    e.gameState.enemyCount > 20 || e.gameState.projectileCount > 15
);

console.log('High complexity periods:', complexityEvents);
console.log('Average FPS during complexity:', performanceData.frameRates);
```

## Sample AI Analysis Workflow

1. **Start Analysis**: Load game and open console
2. **Monitor Real-time**: Watch `[AI-LOG]` entries in console
3. **Pattern Detection**: Use API commands to extract patterns
4. **Export Data**: Use `downloadSessionLog()` for offline analysis
5. **Cross-Session Analysis**: Compare multiple session files

## Example Log Output

```md
=== AI-READABLE GAME SESSION LOG ===
SESSION_ID:session_1mx2n3o4p5_abc12
SESSION_START:2025-07-30T10:30:00.000Z
SESSION_DURATION:245.67s
GAME_DURATION:198.34s

--- EVENT LOG ---
[AI-LOG] TIME:0.00s SESSION:47.33s TYPE:game_started WAVE:0 HEALTH:20/20 MONEY:100 SCORE:0 ENEMIES:0 TOWERS:0 PROJECTILES:0
[AI-LOG] TIME:2.15s SESSION:49.48s TYPE:wave_started WAVE:1 HEALTH:20/20 MONEY:100 SCORE:0 ENEMIES:0 TOWERS:0 PROJECTILES:0 DATA:waveNumber:1 enemyCount:5
[AI-LOG] TIME:5.67s SESSION:53.00s TYPE:tower_placed WAVE:1 HEALTH:20/20 MONEY:75 SCORE:0 ENEMIES:2 TOWERS:1 PROJECTILES:0 DATA:type:basic cost:25 position:(120.0,240.0)
[AI-LOG] TIME:8.92s SESSION:56.25s TYPE:enemy_killed WAVE:1 HEALTH:20/20 MONEY:80 SCORE:25 ENEMIES:1 TOWERS:1 PROJECTILES:1 DATA:reward:5 killedBy:tower_basic timeAlive:3.25
...

--- SESSION STATISTICS ---
[AI-SUMMARY] TOWERS_PLACED:12 TOWERS_UPGRADED:3 TOWERS_SOLD:1
[AI-SUMMARY] ENEMIES_KILLED:87 WAVES_COMPLETED:8 GEMS_SOCKETED:5
[AI-SUMMARY] MONEY_SPENT:485 MONEY_EARNED:520 DAMAGE_DEALT:2840
[AI-EFFICIENCY] DAMAGE_PER_TOWER:236.67 KILLS_PER_TOWER:7.25
[AI-PERFORMANCE] SURVIVAL_RATE:0.75 SCORE_EFFICIENCY:4.12
=== END AI-READABLE LOG ===
```

## Data Export Formats

### JSON Export (Detailed)

- Complete session data with nested structures
- Full event log with all metadata
- Performance metrics and statistics
- Suitable for programmatic analysis

### AI-Readable Export (Structured Text)

- Compact, line-by-line format
- Easy to parse with regex or simple text processing
- Human-readable while machine-friendly
- Ideal for feeding to AI analysis systems

### CSV Export (Tabular)

- Events as rows with timestamp, type, data columns
- Good for spreadsheet analysis
- Compatible with data science tools

## Integration with Balance Testing

The monitoring system works seamlessly with the real-time balance testing tool:

```powershell
# Run real-time balance test with monitoring
python real_balance_test.py --waves 50 --runs 10

# Run quick real-time balance test with monitoring
python real_balance_test.py --waves 3 --runs 1 --skills optimal

# The real-time testing uses actual game logs and browser automation
# for perfect comparison with human gameplay sessions
```

This allows comparison between:

- Human player strategies vs optimal AI strategies
- Real gameplay patterns vs simulated scenarios
- Balance expectations vs actual player performance

## Privacy and Performance

- All logging happens locally in the browser
- No data is sent to external servers unless explicitly exported
- Minimal performance impact (< 1% CPU overhead)
- Can be disabled by setting `ENABLE_MONITORING=false` in environment

The system provides comprehensive insight into every aspect of gameplay while maintaining privacy and performance.
