# Balance Testing Prompts

This directory contains prompts for GitHub Copilot to run and analyze balance tests for the TDGame tower defense project.

## Available Prompts

### 1. `quick-balance-test.md`

#### **For rapid testing and immediate feedback**

- Quick single command execution
- Summary-level analysis
- Immediate balance verdict
- Basic performance check

#### **Use when**: You need fast feedback on current balance state

### 2. `balance-test-analysis.md`

#### **For comprehensive analysis and detailed reporting**

- Complete timeline breakdown
- Detailed event analysis
- Performance assessment
- Technical validation
- Strategic evaluation

#### **Use when**: You need thorough analysis for balance adjustments

### 3. `expert-balance-analysis.md`

#### **For professional-grade evaluation and reporting**

- Expert-level analysis matching professional game balance standards
- Complete technical and strategic assessment
- Actionable recommendations with specific parameters
- Comprehensive performance evaluation
- Ready-to-implement suggestions

#### **Use when**: Making critical balance decisions or preparing detailed reports

## How to Use

1. **Select appropriate prompt** based on your analysis needs
2. **Copy the prompt content** into your conversation with GitHub Copilot
3. **Follow the instructions** in the prompt to execute the balance test
4. **Receive detailed analysis** based on the prompt's specifications

## Prerequisites

- Docker must be running for the game server
- Python environment configured for the balance test script
- `optimal_ai_balance_test.py` script available in project root
- PowerShell or compatible terminal for command execution

## Expected Outputs

All prompts will generate:

- ✅ **Balance verdict** (Too Easy/Optimal/Too Hard)
- 📊 **Performance metrics** (FPS, entity counts, timing)
- 🎯 **Success rate analysis** with target ranges
- 🔧 **Specific recommendations** for improvements
- 📋 **Detailed timeline** of game events

## Integration with Development Workflow

These prompts are designed to integrate with the mandatory balance testing workflow outlined in the project's copilot instructions:

1. **Before making balance changes**: Run quick test to establish baseline
2. **After making changes**: Run comprehensive analysis to validate changes
3. **For major updates**: Use expert analysis for thorough evaluation
4. **For CI/CD integration**: Incorporate test results into deployment decisions

## Customization

You can modify the prompts to:

- Change wave counts or AI skill levels
- Focus on specific game mechanics
- Adjust analysis depth requirements
- Add custom metrics or evaluation criteria

## Related Files

- `optimal_ai_balance_test.py` - The Python script these prompts execute
- `BALANCE_TESTING.md` - Detailed documentation on balance testing
- `.github/copilot-instructions.md` - Overall project guidance for Copilot
- `logs/` - Directory where test results are saved
