---
title: Quick Balance Test
description: Run a fast balance test with immediate analysis
---

# Quick Balance Test Prompt

## Quick Command

Run this single command for immediate balance testing and analysis:

```powershell
python real_balance_test.py --waves 3 --runs 1 --skills optimal
```

## What to Look For

After running the test, analyze the log file and provide:

### 1. **Quick Summary**

- **Success Rate**: X% (from final verdict)
- **Waves Completed**: X/3
- **Final Health**: X/20
- **Difficulty Assessment**: Too Easy/Optimal/Too Hard

### 2. **Key Events Timeline**

Extract the major events with timestamps:

- **Tower Placements**: When and where towers were built
- **Wave Completions**: How each wave ended
- **Critical Health Loss**: When player took significant damage
- **Enemy Kills**: Major elimination events
- **Economic Milestones**: Currency growth and spending

### 3. **Performance Check**

- **FPS Performance**: Average and any drops below 30 FPS
- **Enemy Count**: Maximum enemies on screen simultaneously
- **Logging Quality**: Confirm no message flooding occurred

### 4. **Balance Verdict**

Based on the test results, determine if the game is:

- ✅ **Balanced**: 65-75% success rate for optimal play
- ⚠️ **Too Easy**: >85% success rate
- ❌ **Too Hard**: <55% success rate

### 5. **Immediate Recommendations**

If balance issues found, suggest specific parameter adjustments:

- **Enemy Health**: Increase/decrease by X%
- **Tower Damage**: Increase/decrease by X points  
- **Currency Economy**: Adjust starting money or rewards
- **Wave Timing**: Modify spawn rates or preparation time

## Expected Output Format

```markdown
## Balance Test Results - [Date/Time]

**Quick Verdict**: [Too Easy/Optimal/Too Hard] - [Success Rate]%

### Timeline Summary
- 0-15s: Wave 1 prep, placed X towers
- 15-45s: Wave 1 active, lost X health
- 45-75s: Wave 2 active, [outcome]
- [Continue...]

### Performance
- Average FPS: X
- Peak enemies: X
- Logging: ✅ Clean / ❌ Flooding

### Recommendations
[Specific balance adjustments needed]
```

This prompt is designed for quick testing and immediate feedback on game balance status.
