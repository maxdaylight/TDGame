# Balance Testing Tools

This directory contains Python scripts for testing and maintaining game balance in the Tower Defense game with its complete gem system.

## 🎯 Recommended Testing Workflow

### Primary Testing (Use for all changes)

```bash
# Quick development check
python quick_balance_test.py

# Comprehensive analysis (RECOMMENDED for final validation)
python master_balance_test.py --waves 5 --simulations 20
```

## All Testing Tools

### ⭐ `master_balance_test.py` - **COMPREHENSIVE ANALYSIS**

**Most accurate and recommended tool** - Tests complete game systems:

- **Complete player strategies**: Resource allocation, upgrading, gem choices
- **Realistic behavior modeling**: 11 skill levels from optimal to dismal
- **Full system integration**: Towers + leveling + gems + placement quality
- **Detailed analysis**: Wave-by-wave breakdown and efficiency metrics

```bash
# Standard comprehensive test
python master_balance_test.py

# Detailed analysis with JSON output
python master_balance_test.py --waves 5 --simulations 20 --detailed --json-output results.json
```

### 🎯 `quick_balance_test.py` - **DEVELOPMENT WORKFLOW**

Fast verification tool for development workflow:

- Automatically extracts current settings from game files
- Tests waves 1-3 for quick feedback  
- Returns PASS/FAIL for CI integration
- **Use this before and after every balance change**
- **Note**: Tests only base towers without gems

### 💎 `gem_balance_test.py` - **GEM SYSTEM ANALYSIS**

Specialized tool for gem system balance:

- Tests gem combinations and strategies
- Analyzes gem power levels and costs
- Compares vanilla vs gem-enhanced gameplay
- Identifies overpowered gem combinations

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
