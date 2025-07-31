#!/usr/bin/env python3
"""
Master Balance Test - Comprehensive Tower Defense Balance Analysis
Tests ALL game systems: towers, leveling, gems, strategies, and player skills
This is the definitive balance testing script for the complete game experience.

Usage: python master_balance_test.py [--waves N] [--detailed] [--json-output]
"""

import sys
import re
import random
import json
import argparse
from dataclasses import dataclass, asdict, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class SkillLevel(Enum):
    """Player skill levels from optimal to dismal"""
    OPTIMAL = (1.0, "Optimal (100%)")
    EXPERT = (0.9, "Expert (90%)")
    VERY_GOOD = (0.8, "Very Good (80%)")
    GOOD = (0.7, "Good (70%)")
    ABOVE_AVERAGE = (0.6, "Above Average (60%)")
    AVERAGE = (0.5, "Average (50%)")
    BELOW_AVERAGE = (0.4, "Below Average (40%)")
    POOR = (0.3, "Poor (30%)")
    VERY_POOR = (0.2, "Very Poor (20%)")
    TERRIBLE = (0.1, "Terrible (10%)")
    DISMAL = (0.0, "Dismal (0%)")


@dataclass
class GameSettings:
    """Complete game configuration extracted from source files"""
    starting_money: int = 220  # Increased for better economic accessibility
    wave_bonus: int = 12
    starting_health: int = 20
    basic_tower_damage: int = 22  # Updated from source
    poison_tower_damage: int = 5  # Separate tracking for nerfed poison tower
    basic_tower_fire_rate: float = 1.4
    basic_tower_range: int = 105
    basic_tower_cost: int = 50  # Reduced for better economic accessibility
    splash_tower_cost: int = 70  # Reduced for better economic accessibility
    poison_tower_cost: int = 95  # Reduced for better economic accessibility
    sniper_tower_cost: int = 140  # Reduced for better economic accessibility
    basic_enemy_health: int = 102  # Updated from source (85 * 1.2 for scaling)
    fast_enemy_health: int = 72   # Updated from source
    armored_enemy_health: int = 420  # Updated from source (heavy enemy)
    basic_enemy_reward: int = 8  # Increased for better economic accessibility
    fast_enemy_reward: int = 10  # Increased for better economic accessibility
    heavy_enemy_reward: int = 18  # Increased for better economic accessibility
    # Gem costs - significantly reduced
    pure_fire_gem_cost: int = 25  # Reduced from 60
    pure_water_gem_cost: int = 25  # Reduced from 60
    pure_thunder_gem_cost: int = 30  # Reduced from 70
    damage_gem_cost: int = 20  # Reduced from 45
    speed_gem_cost: int = 18  # Reduced from 40
    range_gem_cost: int = 24  # Reduced from 55
    has_diminishing_returns: bool = False  # Track economic changes
    has_cost_inflation: bool = False  # Static costs - no inflation
    has_poison_stacking_prevention: bool = True  # Track poison fix
    player_health: int = 20  # Track for rotation damage


@dataclass
class GemEffect:
    """Gem effects on tower performance"""
    damage_multiplier: float = 1.0
    attack_speed_multiplier: float = 1.0
    range_multiplier: float = 1.0
    armor_penetration: int = 0
    burn_damage: int = 0
    burn_duration: float = 0.0
    slow_factor: float = 1.0
    slow_duration: float = 0.0
    chain_targets: int = 0
    splash_radius: int = 0
    special_effects: Optional[Dict] = None

    def __post_init__(self):
        if self.special_effects is None:
            self.special_effects = {}


@dataclass
class TowerConfig:
    """Complete tower configuration including level and gems"""
    tower_type: str
    level: int = 1
    position_quality: float = 1.0  # Placement effectiveness (0.0-1.0)
    gems: List[Optional[str]] = field(default_factory=list)

    def __post_init__(self):
        if not self.gems:  # If empty list
            slots = self.get_gem_slots()
            self.gems = [None for _ in range(slots)]

    def get_gem_slots(self) -> int:
        """Get number of gem slots for this tower type"""
        slots = {'basic': 2, 'splash': 3, 'poison': 2, 'sniper': 1}
        return slots.get(self.tower_type, 2)


@dataclass
class WaveComposition:
    """Enemy composition for a wave"""
    basic_enemies: int = 0
    fast_enemies: int = 0
    armored_enemies: int = 0
    total_health: int = 0
    spawn_time: float = 0.0
    path_time: float = 12.0


@dataclass
class SimulationResult:
    """Results from a single simulation run"""
    skill_level: SkillLevel
    wave_number: int
    success: bool
    towers_built: List[TowerConfig]
    total_cost: int
    total_dps: float
    effective_dps: float
    overkill_ratio: float
    strategy_efficiency: float


class MasterBalanceTester:
    """Comprehensive balance testing system"""

    def __init__(self):
        self.settings = self.extract_game_settings()
        self.gem_library = self.load_gem_library()
        self.gem_costs = self.load_gem_costs()
        self.results = []

    def extract_game_settings(self) -> GameSettings:
        """Extract all game settings from source files"""
        settings = GameSettings()

        try:
            # Read towers.js with proper encoding
            with open('frontend/src/js/towers.js', 'r', encoding='utf-8',
                      errors='ignore') as f:
                towers_content = f.read()

            # Extract basic tower damage (first occurrence)
            damage_match = re.search(r'damage:\s*(\d+)', towers_content)
            if damage_match:
                settings.basic_tower_damage = int(damage_match.group(1))

            # Extract poison tower damage (with reduced damage from nerf)
            poison_section = re.search(
                r"'poison':\s*\{[^}]*damage:\s*(\d+)", towers_content)
            if poison_section:
                poison_damage = int(poison_section.group(1))
                # Store poison damage separately for accurate testing
                settings.poison_tower_damage = poison_damage

            fire_rate_pattern = r'fireRate:\s*([\d.]+)'
            fire_rate_match = re.search(fire_rate_pattern, towers_content)
            if fire_rate_match:
                rate = float(fire_rate_match.group(1))
                settings.basic_tower_fire_rate = rate

            # Read enemies.js with proper encoding
            enemies_file = 'frontend/src/js/enemies.js'
            with open(enemies_file, 'r', encoding='utf-8',
                      errors='ignore') as f:
                enemies_content = f.read()

            health_matches = re.findall(r'health:\s*(\d+)', enemies_content)
            if health_matches:
                settings.basic_enemy_health = int(health_matches[0])
                if len(health_matches) >= 2:
                    settings.fast_enemy_health = int(health_matches[1])
                if len(health_matches) >= 3:
                    settings.armored_enemy_health = int(health_matches[2])

            # Read game.js with proper encoding
            with open('frontend/src/js/game.js', 'r', encoding='utf-8',
                      errors='ignore') as f:
                game_content = f.read()

            money_match = re.search(r'(?:money|currency|cash).*?=\s*(\d+)',
                                    game_content, re.IGNORECASE)
            if money_match:
                settings.starting_money = int(money_match.group(1))

            health_match = re.search(r'(?:health|lives).*?=\s*(\d+)',
                                     game_content, re.IGNORECASE)
            if health_match:
                settings.starting_health = int(health_match.group(1))

            # Check for recent balance fixes
            if 'diminishingFactor' in game_content:
                settings.has_diminishing_returns = True

            if 'inflationFactor' in towers_content:
                settings.has_cost_inflation = True

            # Check for poison stacking prevention
            if 'existingPoison' in enemies_content:
                settings.has_poison_stacking_prevention = True

        except FileNotFoundError as e:
            print(f"Warning: Could not read {e.filename}, using defaults")

        return settings

    def load_gem_library(self) -> Dict[str, GemEffect]:
        """Load gem effects from the game definition"""
        return {
            'PURE_FIRE': GemEffect(
                damage_multiplier=1.25, burn_damage=10, burn_duration=2.0
            ),
            'PURE_WATER': GemEffect(
                damage_multiplier=1.2, slow_factor=0.7, slow_duration=2.0
            ),
            'PURE_THUNDER': GemEffect(
                damage_multiplier=1.15, attack_speed_multiplier=1.2,
                chain_targets=1
            ),
            'PURE_WIND': GemEffect(
                attack_speed_multiplier=1.4, range_multiplier=1.1
            ),
            'PURE_EARTH': GemEffect(
                damage_multiplier=1.1, armor_penetration=5
            ),
            'STEAM': GemEffect(  # Fire + Water
                damage_multiplier=1.3, slow_factor=0.8, burn_damage=5
            ),
            'STORM': GemEffect(  # Thunder + Wind
                damage_multiplier=1.2, attack_speed_multiplier=1.5,
                chain_targets=2
            ),
            'MAGMA': GemEffect(  # Fire + Earth
                damage_multiplier=1.4, armor_penetration=8, burn_damage=15
            ),
            'ELEMENTAL_FURY': GemEffect(  # Multi-element legendary
                damage_multiplier=1.5, attack_speed_multiplier=1.3,
                range_multiplier=1.2, chain_targets=1, burn_damage=8
            )
        }

    def load_gem_costs(self) -> Dict[str, int]:
        """Load gem costs"""
        return {
            'PURE_FIRE': 40, 'PURE_WATER': 40, 'PURE_THUNDER': 45,
            'PURE_WIND': 35, 'PURE_EARTH': 35, 'STEAM': 65,
            'STORM': 70, 'MAGMA': 75, 'ELEMENTAL_FURY': 120
        }

    def get_tower_base_stats(self, tower_type: str) -> Tuple[int, int,
                                                             float, int]:
        """Get base stats for tower type: damage, range, fire_rate, cost"""
        base_damage = self.settings.basic_tower_damage
        base_range = self.settings.basic_tower_range
        base_fire_rate = self.settings.basic_tower_fire_rate

        stats = {
            'basic': (base_damage, base_range, base_fire_rate, 50),
            'splash': (base_damage + 5, base_range - 10,
                       base_fire_rate * 0.8, 75),
            'poison': (self.settings.poison_tower_damage, base_range + 5,
                       base_fire_rate * 1.2, 100),  # Nerfed poison damage
            'sniper': (base_damage * 2, base_range + 45,
                       base_fire_rate * 0.5, 150)
        }
        return stats.get(tower_type, stats['basic'])

    def apply_cost_inflation(self, base_cost: int, wave_number: int) -> int:
        """Apply progressive cost inflation based on current wave"""
        if not self.settings.has_cost_inflation:
            return base_cost

        # 3% cost increase per wave after wave 1
        inflation_factor = 1.0 + ((wave_number - 1) * 0.03)
        return int(base_cost * inflation_factor)

    def calculate_diminishing_money_rewards(self, base_reward: int,
                                            wave_number: int) -> int:
        """Calculate money rewards with diminishing returns"""
        if not self.settings.has_diminishing_returns:
            return base_reward

        # Enemy kill rewards: 2% reduction per wave, minimum 25%
        diminishing_factor = max(0.25, 1.0 - (wave_number * 0.02))
        return int(base_reward * diminishing_factor)

    def calculate_wave_bonus_with_diminishing_returns(self,
                                                      wave_number: int) -> int:
        """Calculate wave completion bonus with diminishing returns"""
        if not self.settings.has_diminishing_returns:
            return wave_number * self.settings.wave_bonus

        # Wave bonus: 2.5% reduction per wave, minimum 15%
        base_bonus = self.settings.wave_bonus
        diminishing_factor = max(0.15, 1.0 - (wave_number * 0.025))
        return int(base_bonus * diminishing_factor)

    def simulate_poison_stacking_prevention(
            self, poison_effects: List[Dict]) -> Dict:
        """Simulate poison stacking prevention - only strongest applies"""
        if not self.settings.has_poison_stacking_prevention:
            # Old behavior: all poison effects stack
            total_dps = sum(effect['dps'] for effect in poison_effects)
            if poison_effects:
                max_duration = max(effect['duration']
                                   for effect in poison_effects)
            else:
                max_duration = 0
            return {'dps': total_dps, 'duration': max_duration}

        # New behavior: only strongest poison effect applies
        if not poison_effects:
            return {'dps': 0, 'duration': 0}

        strongest_poison = max(poison_effects, key=lambda x: x['dps'])
        return strongest_poison

    def calculate_realistic_pathfinding_time(
            self, enemy_type: str, wave_number: int) -> float:
        """Calculate realistic path traversal time with obstacles"""
        # Base path time varies by enemy type and game progression
        base_times = {
            'basic': 12.0,
            'fast': 8.0,
            'heavy': 18.0,
            'flying': 10.0,  # Can fly over obstacles
            'teleporter': 9.0  # Can teleport sections
        }

        base_time = base_times.get(enemy_type, 12.0)

        # Later waves have more tower obstacles, increasing path time
        obstacle_factor = 1.0 + (wave_number * 0.02)  # 2% longer per wave

        # Add some randomness for realistic variation
        variance = random.uniform(0.9, 1.1)

        return base_time * obstacle_factor * variance

    def simulate_tower_targeting_priority(
            self, enemies: List[Dict], tower_stats: Dict) -> Dict:
        """Simulate realistic tower targeting priority"""
        if not enemies:
            return {'target': None, 'score': 0}

        # Prioritize enemies by multiple factors:
        # 1. Progress along path (closest to end)
        # 2. Distance from tower
        # 3. Enemy threat level

        scored_enemies = []
        for enemy in enemies:
            # Progress score (0.0 to 1.0)
            progress_score = enemy.get('path_progress', 0.0)

            # Distance score (closer = higher score)
            distance = enemy.get('distance_from_tower', tower_stats['range'])
            distance_score = max(0, 1.0 - (distance / tower_stats['range']))

            # Threat score (higher health = higher threat)
            threat_score = enemy.get('health', 100) / 200.0  # Normalized

            # Combined priority score
            total_score = (progress_score * 0.6 +
                           distance_score * 0.3 +
                           threat_score * 0.1)

            scored_enemies.append((total_score, enemy))

        # Return highest priority enemy
        best_enemy = max(scored_enemies, key=lambda x: x[0])[1]
        return best_enemy

    def simulate_status_effect_interactions(self, effects: List[Dict]) -> Dict:
        """Simulate complex status effect interactions"""
        result = {
            'damage_multiplier': 1.0,
            'speed_multiplier': 1.0,
            'total_dot_dps': 0.0,
            'armor_reduction': 0.0
        }

        burn_effects = [e for e in effects if e.get('type') == 'burn']
        slow_effects = [e for e in effects if e.get('type') == 'slow']
        poison_effects = [e for e in effects if e.get('type') == 'poison']

        # Burn effects stack additively
        for burn in burn_effects:
            result['total_dot_dps'] += burn.get('dps', 0)

        # Slow effects: strongest slow wins (multiplicative)
        if slow_effects:
            strongest_slow = min(effect.get('factor', 1.0)
                                 for effect in slow_effects)
            result['speed_multiplier'] *= strongest_slow

        # Poison effects: use our stacking prevention
        poison_result = self.simulate_poison_stacking_prevention(
            poison_effects)
        result['total_dot_dps'] += poison_result['dps']

        # Elemental combinations create bonus effects
        if burn_effects and slow_effects:
            # Steam effect: +10% damage
            result['damage_multiplier'] *= 1.1

        if len(burn_effects) >= 2:
            # Multiple fire sources: armor melting
            result['armor_reduction'] += 5

        return result

    def calculate_tower_effective_stats(self, config: TowerConfig) -> Dict:
        """Calculate effective tower stats with level and gems"""
        damage, range_val, fire_rate, cost = self.get_tower_base_stats(
            config.tower_type)

        # Apply level scaling
        level_multiplier = 1.0 + (config.level - 1) * 0.5
        damage *= level_multiplier
        range_val *= (1.0 + (config.level - 1) * 0.2)
        fire_rate *= (1.0 + (config.level - 1) * 0.3)

        # Apply gem effects
        armor_penetration = 0
        burn_dps = 0
        slow_effectiveness = 0
        chain_bonus = 1.0

        for gem_key in config.gems:
            if gem_key and gem_key in self.gem_library:
                gem = self.gem_library[gem_key]
                damage *= gem.damage_multiplier
                fire_rate *= gem.attack_speed_multiplier
                range_val *= gem.range_multiplier
                armor_penetration += gem.armor_penetration
                burn_dps += gem.burn_damage * (gem.burn_duration / 3.0)
                slow_effectiveness += (1.0 - gem.slow_factor) * 0.3
                if gem.chain_targets > 0:
                    chain_bonus += gem.chain_targets * 0.4

        # Apply position quality
        effective_damage = damage * config.position_quality
        effective_fire_rate = fire_rate * config.position_quality

        # Calculate total DPS
        base_dps = effective_damage * effective_fire_rate
        total_dps = base_dps * chain_bonus + burn_dps

        return {
            'damage': effective_damage,
            'fire_rate': effective_fire_rate,
            'range': range_val,
            'dps': total_dps,
            'armor_penetration': armor_penetration,
            'slow_effectiveness': slow_effectiveness,
            'chain_bonus': chain_bonus
        }

    def generate_wave_composition(self, wave_number: int) -> WaveComposition:
        """Generate enemy composition for a given wave"""
        if wave_number <= 3:
            # Early waves - basic enemies only (updated to match game changes)
            basic_count = 3 + wave_number  # Wave 1: 4, Wave 2: 5, Wave 3: 6
            composition = WaveComposition(
                basic_enemies=basic_count,
                total_health=basic_count * self.settings.basic_enemy_health,
                spawn_time=basic_count * 1.2,
                path_time=12.0
            )
        elif wave_number <= 6:
            # Mid waves - mix of basic and fast (updated to match game changes)
            total_enemies = 5 + wave_number * 2  # Wave 4-6: 13, 15, 17
            fast_ratio = min(0.3, (wave_number - 3) * 0.1)  # 30% fast max
            fast_count = int(total_enemies * fast_ratio)
            basic_count = total_enemies - fast_count

            composition = WaveComposition(
                basic_enemies=basic_count,
                fast_enemies=fast_count,
                total_health=(basic_count * self.settings.basic_enemy_health +
                              fast_count * self.settings.fast_enemy_health),
                spawn_time=total_enemies * 1.2,
                path_time=12.0
            )
        else:
            # Late waves - all enemy types
            total_enemies = 8 + wave_number * 2
            armored_ratio = min(0.2, (wave_number - 6) * 0.1)
            fast_ratio = min(0.4, 0.2 + (wave_number - 6) * 0.05)

            armored_count = int(total_enemies * armored_ratio)
            fast_count = int(total_enemies * fast_ratio)
            basic_count = total_enemies - armored_count - fast_count

            composition = WaveComposition(
                basic_enemies=basic_count,
                fast_enemies=fast_count,
                armored_enemies=armored_count,
                total_health=(
                    basic_count * self.settings.basic_enemy_health +
                    fast_count * self.settings.fast_enemy_health +
                    armored_count * self.settings.armored_enemy_health
                ),
                spawn_time=total_enemies * 1.2,
                path_time=12.0
            )

        return composition

    def calculate_available_money(self, wave_number: int) -> int:
        """Calculate money available at start of wave with new model"""
        money = self.settings.starting_money

        # Add wave completion bonuses with diminishing returns
        for wave in range(1, wave_number):
            wave_bonus = self.calculate_wave_bonus_with_diminishing_returns(
                wave)
            money += wave_bonus

            # Add estimated kill rewards for previous waves (diminishing)
            wave_composition = self.generate_wave_composition(wave)
            estimated_kills = (wave_composition.basic_enemies * 5 +
                               wave_composition.fast_enemies * 7 +
                               wave_composition.armored_enemies * 12)

            # Apply diminishing returns to kill rewards
            actual_kill_money = self.calculate_diminishing_money_rewards(
                estimated_kills, wave)
            money += actual_kill_money

        return money

    def generate_strategy_by_skill(self, skill_level: SkillLevel,
                                   available_money: int,
                                   wave_number: int) -> List[TowerConfig]:
        """Generate complete strategy based on skill level"""
        skill_value = skill_level.value[0]
        strategy = []

        # FIXED: Higher skill = more towers and better strategy
        if skill_value >= 0.95:
            # Optimal: Maximum towers early, strategic upgrades
            tower_money_ratio = 0.80
            upgrade_money_ratio = 0.15
            gem_money_ratio = 0.05
        elif skill_value >= 0.85:
            # Expert: Good tower focus with upgrades
            tower_money_ratio = 0.75
            upgrade_money_ratio = 0.18
            gem_money_ratio = 0.07
        elif skill_value >= 0.75:
            # Very Good: Balanced approach
            tower_money_ratio = 0.70
            upgrade_money_ratio = 0.20
            gem_money_ratio = 0.10
        elif skill_value >= 0.65:
            # Good: Some strategic thinking
            tower_money_ratio = 0.68
            upgrade_money_ratio = 0.22
            gem_money_ratio = 0.10
        elif skill_value >= 0.45:
            # Average: Focus mostly on towers, minimal strategy
            tower_money_ratio = 0.65
            upgrade_money_ratio = 0.25
            gem_money_ratio = 0.10
        else:
            # Poor: Inefficient spending - too many upgrades, not enough towers
            tower_money_ratio = 0.60
            upgrade_money_ratio = 0.30
            gem_money_ratio = 0.10

        tower_budget = int(available_money * tower_money_ratio)
        upgrade_budget = int(available_money * upgrade_money_ratio)
        gem_budget = int(available_money * gem_money_ratio)

        # Phase 1: Build towers
        remaining_tower_money = tower_budget

        while remaining_tower_money >= 50:
            tower_type = self.choose_tower_type_by_skill(
                skill_value, remaining_tower_money, wave_number)

            _, _, _, cost = self.get_tower_base_stats(tower_type)

            if cost <= remaining_tower_money:
                # Position quality based on skill
                position_quality = 0.6 + skill_value * 0.4

                tower_config = TowerConfig(
                    tower_type=tower_type,
                    level=1,
                    position_quality=position_quality
                )
                strategy.append(tower_config)
                remaining_tower_money -= cost
            else:
                break

        # Phase 2: Apply upgrades
        if upgrade_budget > 0 and strategy:
            self.apply_upgrades_by_skill(strategy, upgrade_budget, skill_value)

        # Phase 3: Socket gems
        if gem_budget > 0 and strategy:
            self.apply_gems_by_skill(strategy, gem_budget, skill_value)

        return strategy

    def choose_tower_type_by_skill(self, skill_value: float,
                                   available_money: int,
                                   wave_number: int) -> str:
        """Choose tower type based on skill level and context"""
        if skill_value >= 0.8:
            # Expert: Cost-effective choices
            if available_money >= 150 and wave_number >= 4:
                return random.choice(['basic', 'basic', 'splash', 'sniper'])
            elif available_money >= 100:
                return random.choice(['basic', 'basic', 'splash', 'poison'])
            else:
                return 'basic'
        elif skill_value >= 0.5:
            # Average: Sometimes suboptimal
            if available_money >= 150:
                return random.choice(['basic', 'splash', 'poison', 'sniper'])
            elif available_money >= 100:
                return random.choice(['basic', 'basic', 'splash', 'poison'])
            else:
                return 'basic'
        else:
            # Poor: Often makes bad choices
            bad_choice_chance = (1 - skill_value) * 0.4
            if available_money >= 150 and random.random() < bad_choice_chance:
                return 'sniper'  # Expensive early choice
            elif available_money >= 100:
                return random.choice(['basic', 'splash', 'poison'])
            else:
                return 'basic'

    def apply_upgrades_by_skill(self, strategy: List[TowerConfig],
                                upgrade_budget: int, skill_value: float):
        """Apply tower upgrades based on skill level"""
        remaining_budget = upgrade_budget

        # Upgrade cost per level (simplified)
        upgrade_costs = {2: 30, 3: 50, 4: 80, 5: 120}

        # Higher skill = better upgrade priority
        if skill_value >= 0.7:
            # Focus upgrades on fewer towers for efficiency
            priority_towers = strategy[:min(2, len(strategy))]
        else:
            # Spread upgrades (less efficient)
            priority_towers = strategy

        for tower in priority_towers:
            if remaining_budget <= 0:
                break

            # Determine max affordable level
            current_level = tower.level
            while current_level < 5:
                next_level = current_level + 1
                cost = upgrade_costs.get(next_level, 999999)

                if cost <= remaining_budget:
                    tower.level = next_level
                    remaining_budget -= cost
                    current_level = next_level
                else:
                    break

    def apply_gems_by_skill(self, strategy: List[TowerConfig],
                            gem_budget: int, skill_value: float):
        """Apply gems based on skill level"""
        remaining_budget = gem_budget

        # Generate gem strategy pool based on skill
        if skill_value >= 0.8:
            gem_priority = [
                'ELEMENTAL_FURY', 'MAGMA', 'STORM', 'PURE_FIRE',
                'PURE_THUNDER', 'STEAM'
            ]
        elif skill_value >= 0.5:
            gem_priority = [
                'PURE_FIRE', 'PURE_THUNDER', 'PURE_WIND', 'STEAM',
                'STORM', 'PURE_WATER'
            ]
        else:
            gem_priority = [
                'PURE_FIRE', 'PURE_WATER', 'PURE_WIND', 'PURE_EARTH'
            ]

        # Apply gems to towers
        for tower in strategy:
            available_slots = tower.get_gem_slots()

            for slot in range(available_slots):
                if remaining_budget <= 0:
                    break

                # Find affordable gem from priority list
                for gem_key in gem_priority:
                    cost = self.gem_costs.get(gem_key, 999999)
                    if cost <= remaining_budget:
                        tower.gems[slot] = gem_key
                        remaining_budget -= cost
                        break

    def simulate_wave(self, strategy: List[TowerConfig],
                      wave_composition: WaveComposition,
                      skill_level: SkillLevel) -> SimulationResult:
        """Simulate a single wave with given strategy"""
        skill_value = skill_level.value[0]

        # Calculate total DPS and costs
        total_dps = 0
        total_cost = 0
        armor_penetration = 0

        for tower in strategy:
            stats = self.calculate_tower_effective_stats(tower)
            total_dps += stats['dps']
            armor_penetration += stats['armor_penetration']

            # Calculate total cost
            _, _, _, base_cost = self.get_tower_base_stats(tower.tower_type)
            tower_cost = base_cost

            # Add upgrade costs
            upgrade_costs = {2: 30, 3: 50, 4: 80, 5: 120}
            for level in range(2, tower.level + 1):
                tower_cost += upgrade_costs.get(level, 0)

            # Add gem costs
            for gem_key in tower.gems:
                if gem_key:
                    tower_cost += self.gem_costs.get(gem_key, 0)

            total_cost += tower_cost

        # Apply micro-management effectiveness based on skill
        micro_effectiveness = 0.7 + skill_value * 0.3
        effective_dps = total_dps * micro_effectiveness

        # Calculate armor reduction
        effective_enemy_health = wave_composition.total_health
        if armor_penetration > 0:
            # Simplified armor calculation
            armor_reduction = min(0.2, armor_penetration * 0.01)
            effective_enemy_health *= (1 - armor_reduction)

        # Time available for damage
        total_time = wave_composition.spawn_time + wave_composition.path_time
        total_damage_possible = effective_dps * total_time

        # Add skill-dependent execution variance
        # Higher skill = more consistent execution (less variance)
        # Lower skill = more inconsistent execution (more variance)
        variance_range = 0.05 + (1 - skill_value) * 0.1  # 5% to 15% variance
        execution_variance = random.uniform(1 - variance_range,
                                            1 + variance_range)

        # Ensure optimal players get slight boost for perfect execution
        if skill_value == 1.0:
            execution_variance = max(execution_variance, 1.0)  # Never penalty

        total_damage_possible *= execution_variance

        # Determine success
        success = total_damage_possible >= effective_enemy_health
        overkill_ratio = total_damage_possible / effective_enemy_health
        if total_cost > 0:
            strategy_efficiency = effective_dps / total_cost
        else:
            strategy_efficiency = 0

        return SimulationResult(
            skill_level=skill_level,
            wave_number=0,  # Set by caller
            success=success,
            towers_built=strategy,
            total_cost=total_cost,
            total_dps=total_dps,
            effective_dps=effective_dps,
            overkill_ratio=overkill_ratio,
            strategy_efficiency=strategy_efficiency
        )

    def run_comprehensive_test(self, max_waves: int = 5,
                               simulations_per_test: int = 20) -> Dict:
        """Run comprehensive balance test across all skill levels and waves"""
        print("🎯 MASTER BALANCE TEST - COMPREHENSIVE ANALYSIS")
        print("=" * 60)
        print(f"Settings: Starting Money ${self.settings.starting_money}, "
              f"Tower {self.settings.basic_tower_damage} dmg")
        print(f"Testing {len(SkillLevel)} skill levels across "
              f"{max_waves} waves")
        print()

        all_results = {}

        # Test each skill level
        for skill_level in SkillLevel:
            skill_name = skill_level.value[1]
            skill_value = skill_level.value[0]

            wave_results = {}

            for wave_num in range(1, max_waves + 1):
                wave_composition = self.generate_wave_composition(wave_num)
                available_money = self.calculate_available_money(wave_num)

                success_count = 0
                total_efficiency = 0
                total_overkill = 0

                # Run multiple simulations for this skill/wave combo
                for _ in range(simulations_per_test):
                    strategy = self.generate_strategy_by_skill(
                        skill_level, available_money, wave_num)
                    result = self.simulate_wave(strategy, wave_composition,
                                                skill_level)
                    result.wave_number = wave_num

                    if result.success:
                        success_count += 1
                    total_efficiency += result.strategy_efficiency
                    total_overkill += result.overkill_ratio

                success_rate = success_count / simulations_per_test
                avg_efficiency = total_efficiency / simulations_per_test
                avg_overkill = total_overkill / simulations_per_test

                wave_results[wave_num] = {
                    'success_rate': success_rate,
                    'avg_efficiency': avg_efficiency,
                    'avg_overkill': avg_overkill,
                    'enemy_health': wave_composition.total_health
                }

            # Calculate overall performance for this skill level
            overall_success = sum(wr['success_rate']
                                  for wr in wave_results.values()) / max_waves

            all_results[skill_level] = {
                'skill_name': skill_name,
                'skill_value': skill_value,
                'overall_success': overall_success,
                'wave_results': wave_results
            }

            # Print progress
            status = self.get_balance_status(overall_success)
            print(f"  {skill_name:20} | {overall_success:5.1%} | {status}")

        print()
        return all_results

    def get_balance_status(self, success_rate: float) -> str:
        """Get balance status indicator"""
        if success_rate >= 0.9:
            return "🟢 Too Easy"
        elif success_rate >= 0.7:
            return "🟡 Balanced"
        elif success_rate >= 0.5:
            return "🟠 Hard"
        else:
            return "🔴 Too Hard"

    def analyze_results(self, results: Dict) -> Dict:
        """Analyze test results and provide balance verdict"""
        print("📊 DETAILED ANALYSIS:")
        print("-" * 40)

        # Extract key metrics
        optimal_success = results[SkillLevel.OPTIMAL]['overall_success']
        expert_success = results[SkillLevel.EXPERT]['overall_success']
        average_success = results[SkillLevel.AVERAGE]['overall_success']
        poor_success = results[SkillLevel.POOR]['overall_success']

        print(f"  Optimal Players: {optimal_success:.1%}")
        print(f"  Expert Players: {expert_success:.1%}")
        print(f"  Average Players: {average_success:.1%}")
        print(f"  Poor Players: {poor_success:.1%}")
        print()

        # Skill distribution analysis
        easy_count = sum(1 for r in results.values()
                         if r['overall_success'] >= 0.9)
        balanced_count = sum(1 for r in results.values()
                             if 0.7 <= r['overall_success'] < 0.9)
        hard_count = sum(1 for r in results.values()
                         if 0.5 <= r['overall_success'] < 0.7)
        too_hard_count = sum(1 for r in results.values()
                             if r['overall_success'] < 0.5)

        print("📈 SKILL DISTRIBUTION:")
        total_skills = len(SkillLevel)
        print(f"  Too Easy for: {easy_count}/{total_skills} skill levels")
        print(f"  Balanced for: {balanced_count}/{total_skills} skill levels")
        print(f"  Hard for: {hard_count}/{total_skills} skill levels")
        print(f"  Too Hard for: {too_hard_count}/{total_skills} skill levels")
        print()

        # Determine final verdict
        verdict = self.determine_final_verdict(
            optimal_success, expert_success, average_success, poor_success)

        analysis = {
            'optimal_success': optimal_success,
            'expert_success': expert_success,
            'average_success': average_success,
            'poor_success': poor_success,
            'distribution': {
                'too_easy': easy_count,
                'balanced': balanced_count,
                'hard': hard_count,
                'too_hard': too_hard_count
            },
            'verdict': verdict
        }

        return analysis

    def determine_final_verdict(self, optimal: float, expert: float,
                                average: float, poor: float) -> str:
        """Determine final balance verdict"""
        print("🎯 FINAL BALANCE VERDICT:")

        if optimal >= 0.98 or expert >= 0.95:
            print("❌ GAME TOO EASY")
            print("   Even expert players trivialize the content")
            print("   Recommendation: Increase enemy health or reduce power")
            return "TOO_EASY"

        elif expert < 0.6 or average < 0.3:
            print("❌ GAME TOO HARD")
            print("   Even expert players struggle significantly")
            print("   Recommendation: Reduce enemy health or increase power")
            return "TOO_HARD"

        elif (0.75 <= expert <= 0.92 and 0.4 <= average <= 0.7 and
              poor >= 0.15):
            print("🏆 OPTIMAL BALANCE")
            print("   Challenging progression across all skill levels")
            print("   Expert players succeed consistently")
            print("   Average players have reasonable success")
            print("   Poor players can still occasionally win")
            return "OPTIMAL"

        else:
            print("✅ ACCEPTABLE BALANCE")
            print("   Within reasonable difficulty parameters")
            print("   Minor adjustments may improve experience")
            return "ACCEPTABLE"


def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(
        description='Master Balance Test for Tower Defense Game')
    parser.add_argument('--waves', type=int, default=5,
                        help='Number of waves to test (default: 5)')
    parser.add_argument('--simulations', type=int, default=20,
                        help='Simulations per test (default: 20)')
    parser.add_argument('--detailed', action='store_true',
                        help='Show detailed wave-by-wave results')
    parser.add_argument('--json-output', type=str,
                        help='Save results to JSON file')

    args = parser.parse_args()

    tester = MasterBalanceTester()

    # Run comprehensive test
    results = tester.run_comprehensive_test(args.waves, args.simulations)

    # Analyze results
    analysis = tester.analyze_results(results)

    # Show detailed results if requested
    if args.detailed:
        print("\n📋 DETAILED WAVE ANALYSIS:")
        print("-" * 30)
        for skill_level, data in results.items():
            print(f"\n{data['skill_name']}:")
            for wave, wave_data in data['wave_results'].items():
                print(f"  Wave {wave}: {wave_data['success_rate']:.1%} "
                      f"(efficiency: {wave_data['avg_efficiency']:.3f})")

    # Save JSON output if requested
    if args.json_output:
        output_data = {
            'settings': asdict(tester.settings),
            'results': {str(k): v for k, v in results.items()},
            'analysis': analysis,
            'test_parameters': {
                'max_waves': args.waves,
                'simulations_per_test': args.simulations
            }
        }

        with open(args.json_output, 'w') as f:
            json.dump(output_data, f, indent=2, default=str)
        print(f"\n💾 Results saved to {args.json_output}")

    # Exit with appropriate code
    verdict = analysis['verdict']
    exit_code = 0 if verdict in ['OPTIMAL', 'ACCEPTABLE'] else 1
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
