# Balance Testing Tools

This directory contains Python scripts for testing and maintaining game balance in the Tower Defense game.

## Quick Start

### Primary Tool (Use this for all changes)

```bash
python quick_balance_test.py
```

Fast verification tool that extracts current settings from game files and tests balance.

## All Tools

### 🎯 `quick_balance_test.py`

#### **Primary tool for GitHub Copilot workflow**

- Automatically extracts current settings from game files
- Tests waves 1-3 for quick feedback
- Returns PASS/FAIL for CI integration
- **Use this before and after every balance change**

### 📊 `balance_simulator.py`

Comprehensive balance analysis with detailed statistics

- Tests multiple waves
- Provides strategy recommendations
- Generates detailed reports
- Saves results to JSON

### ✅ `verify_final_balance.py`

Quick verification of current settings with detailed math

- Shows DPS calculations
- Verifies spawn timing
- Provides clear pass/fail verdict

### 🔧 `find_balance.py`

Mathematical optimization for finding perfect balance

- Tests multiple scenarios
- Calculates optimal settings
- Provides specific recommendations

### 🧪 `test_corrected_balance.py`

Test specific parameter combinations

- Useful for A/B testing changes
- Compare different configurations

## Target Success Rates

- **Early Waves (1-3)**: 65-75% success rate
- **Mid Waves (4-6)**: 55-70% success rate  
- **Late Waves (7+)**: 45-65% success rate

## Current Optimal Settings

```javascript
STARTING_MONEY = 95;           // Tight but manageable
BASIC_TOWER_DAMAGE = 18;       // Mathematically calculated
BASIC_TOWER_FIRE_RATE = 1.4;   // 25.2 DPS total
BASIC_ENEMY_HEALTH = 80;       // Requires 4.4 shots to kill
WAVE_BONUS_MULTIPLIER = 12;    // Economy progression
```

## Usage Examples

```bash
# Quick test (use this most often)
python quick_balance_test.py

# Detailed analysis
python quick_balance_test.py --verbose

# Find optimal settings if balance is broken
python find_balance.py

# Full comprehensive test
python balance_simulator.py
```

## Integration with Development

1. Before making changes: `python quick_balance_test.py`
2. Make your changes to game files
3. After changes: `python quick_balance_test.py`
4. If test fails, use `python find_balance.py` for recommendations
5. Rebuild Docker: `docker-compose up --build`
6. Manual test in browser: <http://localhost:3000>

## File Dependencies

The tools automatically extract settings from:

- `frontend/src/js/game.js` - Starting money, wave bonuses
- `frontend/src/js/towers.js` - Tower stats (damage, fire rate, cost)
- `frontend/src/js/enemies.js` - Enemy stats (health, speed, rewards)

No manual configuration needed - just run the tools!
