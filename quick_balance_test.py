#!/usr/bin/env python3
"""
Quick Balance Test - Fast verification for GitHub Copilot workflow
Run this script whenever making balance changes to towers, enemies, or economy.
Simulates 10 different player skill levels from optimal to dismal placement.
"""

import sys
import re
import random
from dataclasses import dataclass


@dataclass
class TowerStats:
    damage: int
    range: int
    fire_rate: float
    cost: int
    name: str

    @property
    def dps(self):
        return self.damage * self.fire_rate


@dataclass
class EnemyStats:
    health: int
    speed: int
    reward: int
    name: str


def extract_current_settings():
    """Extract current game settings from JavaScript files."""
    settings = {}

    try:
        # Read towers.js for tower stats
        with open('frontend/src/js/towers.js', 'r', encoding='utf-8') as f:
            towers_content = f.read()

        # Extract basic tower stats
        damage_match = re.search(r'damage:\s*(\d+)', towers_content)
        if damage_match:
            settings['basic_damage'] = int(damage_match.group(1))

        fire_rate_match = re.search(r'fireRate:\s*([\d.]+)', towers_content)
        if fire_rate_match:
            settings['basic_fire_rate'] = float(fire_rate_match.group(1))

        # Read enemies.js for enemy stats
        with open('frontend/src/js/enemies.js', 'r', encoding='utf-8') as f:
            enemies_content = f.read()

        # Extract basic enemy health (first health value)
        health_match = re.search(r'health:\s*(\d+)', enemies_content)
        if health_match:
            settings['basic_health'] = int(health_match.group(1))

        # Extract fast enemy health (typically second health value)
        health_matches = re.findall(r'health:\s*(\d+)', enemies_content)
        if len(health_matches) >= 2:
            settings['fast_health'] = int(health_matches[1])
        else:
            settings['fast_health'] = settings.get('basic_health', 80) - 20

        # Read game.js for economy settings
        with open('frontend/src/js/game.js', 'r', encoding='utf-8') as f:
            game_content = f.read()

        # Extract starting money
        money_match = re.search(r'(?:money|currency|cash).*?=\s*(\d+)',
                                game_content, re.IGNORECASE)
        if money_match:
            settings['starting_money'] = int(money_match.group(1))

        # Extract wave bonus
        bonus_match = re.search(r'(?:bonus|reward).*?(\d+)',
                                game_content, re.IGNORECASE)
        if bonus_match:
            settings['wave_bonus'] = int(bonus_match.group(1))

    except FileNotFoundError as e:
        print(f"Warning: Could not read {e.filename}, using defaults")

    # Apply defaults for any missing values
    defaults = {
        'basic_damage': 18,
        'basic_fire_rate': 1.4,
        'basic_health': 80,
        'fast_health': 60,
        'starting_money': 95,
        'wave_bonus': 12
    }

    for key, default_value in defaults.items():
        if key not in settings:
            settings[key] = default_value

    return settings


def quick_balance_test():
    """Quick balance verification with multiple skill level simulations."""

    print("🎯 QUICK BALANCE TEST - MULTI-SKILL SIMULATION")
    print("=" * 50)

    # Read current game settings from files
    settings = extract_current_settings()

    # Create towers and enemies with current settings
    towers = {
        'basic': TowerStats(
            settings['basic_damage'], 105, settings['basic_fire_rate'],
            50, 'Basic'
        ),
        'splash': TowerStats(
            settings['basic_damage'] + 5, 95,
            settings['basic_fire_rate'] * 0.8, 75, 'Splash'
        ),
        'poison': TowerStats(
            settings['basic_damage'] - 3, 110,
            settings['basic_fire_rate'] * 1.2, 100, 'Poison'
        ),
        'sniper': TowerStats(
            settings['basic_damage'] * 2, 150,
            settings['basic_fire_rate'] * 0.5, 150, 'Sniper'
        )
    }

    enemies = {
        'basic': EnemyStats(settings['basic_health'], 50, 5, 'Basic'),
        'fast': EnemyStats(settings['fast_health'], 90, 7, 'Fast')
    }

    print("Current Settings:")
    print(f"  Starting Money: ${settings['starting_money']}")
    basic_dmg = settings['basic_damage']
    basic_rate = settings['basic_fire_rate']
    print(f"  Basic Tower: {basic_dmg} dmg, {basic_rate} rate")
    print(f"  Basic Enemy: {settings['basic_health']} HP")
    print()

    # Run simulations at different skill levels
    skill_levels = [
        ("Expert (100%)", 1.0),        # Perfect placement and timing
        ("Very Good (90%)", 0.9),      # Nearly optimal
        ("Good (80%)", 0.8),           # Good strategic choices
        ("Above Average (70%)", 0.7),  # Decent placement
        ("Average (60%)", 0.6),        # Typical player
        ("Below Average (50%)", 0.5),  # Suboptimal choices
        ("Poor (40%)", 0.4),           # Bad placement
        ("Very Poor (30%)", 0.3),      # Very poor strategy
        ("Terrible (20%)", 0.2),       # Almost random
        ("Dismal (10%)", 0.1)          # Worst possible choices
    ]

    wave_results = {}
    overall_results = []

    print("🎮 SKILL LEVEL ANALYSIS:")
    print("-" * 50)

    for skill_name, efficiency in skill_levels:
        wave_success_rates = []

        # Test waves 1-3 with this skill level
        for wave in [1, 2, 3]:
            success_rate = simulate_wave_with_skill(
                towers, enemies, settings, wave, efficiency
            )
            wave_success_rates.append(success_rate)

        avg_success = sum(wave_success_rates) / len(wave_success_rates)
        overall_results.append((skill_name, efficiency, avg_success))

        # Store detailed results
        wave_results[efficiency] = {
            'skill_name': skill_name,
            'wave_1': wave_success_rates[0],
            'wave_2': wave_success_rates[1],
            'wave_3': wave_success_rates[2],
            'average': avg_success
        }

        # Status indicator
        if avg_success >= 0.8:
            status = "🟢 Easy"
        elif avg_success >= 0.6:
            status = "🟡 Balanced"
        elif avg_success >= 0.4:
            status = "🟠 Hard"
        else:
            status = "🔴 Too Hard"

        print(f"  {skill_name:18} | {avg_success:5.1%} | {status}")

    print()

    # Analyze results across skill levels
    analyze_skill_results(overall_results, wave_results)

    # Determine overall verdict
    verdict = determine_balance_verdict(overall_results)

    return verdict


def simulate_wave_with_skill(towers, enemies, settings, wave_num,
                             efficiency):
    """Simulate a wave with a specific player skill level."""

    # Generate wave (simplified)
    if wave_num <= 3:
        enemy_count = 4 + wave_num * 2
        enemy_list = ['basic'] * enemy_count
    else:
        enemy_count = 6 + wave_num * 2
        enemy_list = []
        for _ in range(enemy_count):
            enemy_list.append('basic' if random.random() < 0.7 else 'fast')

    # Calculate available money
    starting_money = settings['starting_money']
    wave_bonus = settings['wave_bonus']
    money_available = (starting_money +
                       (wave_num - 1) * wave_bonus * wave_num // 2)

    # Simulate tower placement based on skill level
    success_count = 0
    simulations = 50  # Number of simulations per skill level

    for _ in range(simulations):
        # Generate strategy based on efficiency
        strategy = generate_strategy_by_skill(towers, money_available,
                                              efficiency)

        # Simulate with placement efficiency
        placement_modifier = simulate_placement_efficiency(efficiency)

        # Calculate if wave succeeds
        wave_success = simulate_wave_outcome(towers, enemies, enemy_list,
                                             strategy, placement_modifier)
        if wave_success:
            success_count += 1

    return success_count / simulations


def generate_strategy_by_skill(towers, money_available, efficiency):
    """Generate tower strategy based on player skill level."""

    remaining_money = money_available
    strategy = []

    # All players use the same decision framework, but with different
    # probabilities
    while remaining_money >= 50:
        # Determine if player makes optimal choice based on efficiency
        makes_optimal_choice = random.random() < efficiency

        if makes_optimal_choice:
            # Optimal choice: prioritize cost-effective towers
            if remaining_money >= 100:
                # Best value: two basic towers
                strategy.append('basic')
                remaining_money -= 50
            elif remaining_money >= 75:
                # Good alternative: splash tower
                if random.random() < 0.7:  # Slight preference for basic
                    strategy.append('basic')
                    remaining_money -= 50
                else:
                    strategy.append('splash')
                    remaining_money -= 75
            else:
                strategy.append('basic')
                remaining_money -= 50
        else:
            # Suboptimal choice: make poor decisions based on how bad
            # player is
            poor_decision_severity = 1 - efficiency

            bad_sniper_chance = poor_decision_severity * 0.3
            if (remaining_money >= 150 and
                    random.random() < bad_sniper_chance):
                # Very bad: expensive sniper early
                strategy.append('sniper')
                remaining_money -= 150
            elif (remaining_money >= 100 and
                  random.random() < poor_decision_severity * 0.5):
                # Bad: expensive poison early
                strategy.append('poison')
                remaining_money -= 100
            elif (remaining_money >= 75 and
                  random.random() < poor_decision_severity * 0.4):
                # Mediocre: splash when basic would be better
                strategy.append('splash')
                remaining_money -= 75
            else:
                # Default to basic (not terrible)
                strategy.append('basic')
                remaining_money -= 50

        # Higher efficiency players are more likely to continue spending
        continue_spending_chance = 0.5 + (efficiency * 0.4)  # 50-90%
        if random.random() > continue_spending_chance:
            break

    # Poor players might not spend all money (waste factor)
    if efficiency < 0.5:
        # 0-30% chance to waste money
        waste_probability = (0.5 - efficiency) * 0.6
        if random.random() < waste_probability:
            # Remove last tower (didn't buy it due to indecision)
            if strategy:
                strategy.pop()

    return strategy if strategy else ['basic']


def simulate_placement_efficiency(efficiency):
    """Simulate how placement efficiency affects tower performance."""

    # Perfect placement gets full effectiveness
    # Poor placement reduces effectiveness significantly

    # Add some randomness to simulate real gameplay variance
    base_efficiency = efficiency
    variance = 0.1  # ±10% variance

    actual_efficiency = base_efficiency + random.uniform(-variance, variance)
    # Clamp to reasonable range
    actual_efficiency = max(0.1, min(1.0, actual_efficiency))

    return actual_efficiency


def simulate_wave_outcome(towers, enemies, enemy_list, strategy,
                          placement_efficiency):
    """Simplified wave outcome simulation with placement efficiency."""

    if not strategy:
        return False

    # Calculate total DPS with placement efficiency
    total_dps = 0
    for tower_type in strategy:
        if tower_type in towers:
            tower_dps = towers[tower_type].dps
            # Apply placement efficiency (bad placement = less effective DPS)
            effective_dps = tower_dps * placement_efficiency
            total_dps += effective_dps

    # Calculate total enemy health
    total_enemy_health = 0
    for enemy_type in enemy_list:
        if enemy_type in enemies:
            total_enemy_health += enemies[enemy_type].health

    # Simplified success calculation
    # Account for spawn timing and path traversal
    total_time_available = len(enemy_list) * 1.2 + 12  # spawn + path time
    total_damage_possible = total_dps * total_time_available

    # Add some randomness for micro-management differences
    effectiveness_variance = random.uniform(0.9, 1.1)
    total_damage_possible *= effectiveness_variance

    # Success if we can deal enough damage
    return total_damage_possible >= total_enemy_health


def analyze_skill_results(overall_results, wave_results):
    """Analyze results across different skill levels."""

    print("📊 BALANCE ANALYSIS:")
    print("-" * 30)

    # Find skill ranges for different success levels
    easy_skills = [r for r in overall_results if r[2] >= 0.8]
    balanced_skills = [r for r in overall_results if 0.6 <= r[2] < 0.8]
    hard_skills = [r for r in overall_results if 0.4 <= r[2] < 0.6]
    too_hard_skills = [r for r in overall_results if r[2] < 0.4]

    print(f"  Easy for: {len(easy_skills)}/10 skill levels")
    print(f"  Balanced for: {len(balanced_skills)}/10 skill levels")
    print(f"  Hard for: {len(hard_skills)}/10 skill levels")
    print(f"  Too Hard for: {len(too_hard_skills)}/10 skill levels")
    print()

    # Target: Balanced should be achievable for average+ players (60%+ skill)
    average_plus_results = [r[2] for r in overall_results if r[1] >= 0.6]
    if average_plus_results:
        avg_success_for_avg_players = (sum(average_plus_results) /
                                       len(average_plus_results))
        avg_rate = avg_success_for_avg_players
        print(f"  Average+ Players Success Rate: {avg_rate:.1%}")

    # Expert players should have high success but not trivial
    expert_success = overall_results[0][2]  # First is expert
    print(f"  Expert Players Success Rate: {expert_success:.1%}")

    # Poor players should still have some chance
    poor_results = [r[2] for r in overall_results if r[1] <= 0.3]
    if poor_results:
        avg_poor_success = (sum(poor_results) / len(poor_results)
                            if poor_results else 0)
        print(f"  Poor Players Success Rate: {avg_poor_success:.1%}")


def determine_balance_verdict(overall_results):
    """Determine overall balance verdict based on skill level results."""

    # Extract key metrics
    expert_success = overall_results[0][2]  # 100% skill
    # 60% skill
    average_success = [r[2] for r in overall_results if r[1] == 0.6][0]
    poor_success = [r[2] for r in overall_results if r[1] <= 0.3]
    avg_poor_success = (sum(poor_success) / len(poor_success)
                        if poor_success else 0)

    print("\n🎯 KEY METRICS:")
    print(f"  Expert Success Rate: {expert_success:.1%}")
    print(f"  Average Success Rate: {average_success:.1%}")
    print(f"  Poor Players Average: {avg_poor_success:.1%}")
    print()

    # Determine verdict based on target ranges
    if expert_success >= 0.95 and average_success >= 0.8:
        print("❌ BALANCE: TOO EASY")
        print("   Even average players succeed too often")
        rec_msg = "   Recommendation: Increase enemy health or reduce damage"
        print(rec_msg)
        return "FAIL"

    elif expert_success < 0.7 or average_success < 0.4:
        print("❌ BALANCE: TOO HARD")
        print("   Even expert players struggle significantly")
        rec_msg = "   Recommendation: Reduce enemy health or increase damage"
        print(rec_msg)
        return "FAIL"

    elif 0.75 <= expert_success <= 0.95 and 0.5 <= average_success <= 0.75:
        print("🏆 BALANCE: OPTIMAL")
        print("   Challenging for experts, achievable for average players")
        return "PASS"

    else:
        print("✅ BALANCE: ACCEPTABLE")
        print("   Within reasonable difficulty range")
        return "PASS"


if __name__ == "__main__":
    verdict = quick_balance_test()
    sys.exit(0 if verdict == "PASS" else 1)
