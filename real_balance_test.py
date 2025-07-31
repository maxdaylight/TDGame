#!/usr/bin/env python3
"""
Real Balance Test - Accurate Tower Defense Balance Analysis
This system actually runs the real game engine with automated players
to get precise balance measurements using actual game mechanics.

Usage: python real_balance_test.py [--waves N] [--skill-levels LIST] [--runs N]
"""

import asyncio
import time
import statistics
import argparse
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import subprocess
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class PlayerSkill(Enum):
    """Real player skill levels based on actual gameplay patterns"""
    OPTIMAL = (1.0, "Optimal - Perfect execution, frame-perfect timing")
    EXPERT = (0.85, "Expert - Excellent decisions, occasional micro errors")
    ABOVE_AVERAGE = (0.65, "Above Average - Good strategy, some "
                     "inefficiencies")
    AVERAGE = (0.5, "Average - Basic understanding, moderate execution")
    BELOW_AVERAGE = (0.35, "Below Average - Poor decisions, slow reactions")


@dataclass
class RealGameState:
    """Actual game state extracted from running game"""
    wave_number: int = 0
    health: int = 20
    money: int = 170
    score: int = 0
    towers: List[Dict] = field(default_factory=list)
    enemies: List[Dict] = field(default_factory=list)
    projectiles: List[Dict] = field(default_factory=list)
    game_time: float = 0.0
    is_wave_active: bool = False
    fps: float = 60.0


@dataclass
class TestResult:
    """Results from a real game test run"""
    player_skill: PlayerSkill
    waves_completed: int
    final_health: int
    final_money: int
    final_score: int
    total_time: float
    success: bool
    towers_built: int
    average_fps: float
    decision_timings: List[float] = field(default_factory=list)
    efficiency_score: float = 0.0


class RealGameBalanceTester:
    """Balance tester that uses the actual game engine"""

    def __init__(self):
        self.driver: Optional[webdriver.Chrome] = None
        self.game_url = "http://localhost:3000"
        self.results = []

    async def setup_test_environment(self):
        """Start the real game server and browser"""
        print("🚀 Setting up real game test environment...")

        # Start Docker containers
        try:
            # First, ensure any existing containers are stopped
            subprocess.run(["docker-compose", "down"],
                           capture_output=True, text=True, timeout=30)

            print("  Starting Docker containers...")
            # Start containers and wait for completion
            result = subprocess.run(
                ["docker-compose", "up", "--build", "-d"],
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout for build
            )

            if result.returncode != 0:
                raise Exception(f"Docker startup failed: {result.stderr}")

            print("  Containers started, waiting for services...")

            # Wait for containers to be ready
            await self.wait_for_game_server()

        except subprocess.TimeoutExpired:
            raise Exception("Docker containers took too long to start")
        except Exception as e:
            raise Exception(f"Failed to start Docker containers: {e}")

        # Setup Chrome browser with automation
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1200,800")
        # Uncomment for headless mode (faster testing)
        # chrome_options.add_argument("--headless")

        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.get(self.game_url)

            # Wait for game to load
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.ID, "game-canvas"))
            )

            print("✅ Game loaded successfully!")

        except Exception as e:
            raise Exception(f"Failed to setup browser: {e}")

    async def wait_for_game_server(self, timeout=90):
        """Wait for the game server to be ready"""
        start_time = time.time()
        print("  Waiting for containers to be healthy...")

        while time.time() - start_time < timeout:
            try:
                # Check if containers are running and healthy
                result = subprocess.run(
                    ["docker-compose", "ps", "--format", "json"],
                    capture_output=True, text=True, timeout=10
                )

                if result.returncode == 0:
                    containers = []
                    for line in result.stdout.strip().split('\n'):
                        if line.strip():
                            try:
                                containers.append(json.loads(line))
                            except json.JSONDecodeError:
                                pass

                    # Check if we have running containers
                    running_containers = [
                        c for c in containers if
                        'State' in c and c['State'] == 'running'
                    ]

                    if len(running_containers) >= 2:  # frontend and backend
                        # Try to connect to game server
                        response = requests.get(self.game_url, timeout=5)
                        if response.status_code == 200:
                            print("✅ Game server is ready!")
                            return

            except (requests.exceptions.RequestException,
                    subprocess.TimeoutExpired, json.JSONDecodeError):
                pass

            print(f"  Still waiting... ({int(time.time() - start_time)}s)")
            await asyncio.sleep(3)

        raise Exception("Game server failed to start within timeout")

    def extract_real_game_state(self) -> RealGameState:
        """Extract actual game state from the running game"""
        if not self.driver:
            return RealGameState()

        try:
            # Execute JavaScript to get game state
            game_state_js = """
            const game = document.getElementById('game-canvas').game;
            if (!game) return null;

            return {
                wave_number: game.waveManager ?
                    game.waveManager.currentWave : 0,
                health: game.health,
                money: game.money,
                score: game.score,
                towers: game.towerManager ?
                    game.towerManager.towers.map(t => ({
                    type: t.type,
                    level: t.level,
                    position: {x: t.position.x, y: t.position.y},
                    damage: t.damage,
                    range: t.range,
                    fireRate: t.fireRate,
                    gems: t.gems || []
                })) : [],
                enemies: game.waveManager ?
                    game.waveManager.enemies.map(e => ({
                    type: e.type,
                    health: e.health,
                    maxHealth: e.maxHealth,
                    position: {x: e.position.x, y: e.position.y},
                    speed: e.speed
                })) : [],
                projectiles: game.towerManager ?
                    game.towerManager.projectiles.map(p => ({
                    damage: p.damage,
                    type: p.type,
                    position: {x: p.position.x, y: p.position.y}
                })) : [],
                game_time: game.gameTime || 0,
                is_wave_active: game.waveManager ?
                    game.waveManager.isWaveActive : false,
                fps: game.fps || 60
            };
            """

            state_data = self.driver.execute_script(game_state_js)

            if not state_data:
                return RealGameState()

            return RealGameState(
                wave_number=state_data.get('wave_number', 0),
                health=state_data.get('health', 20),
                money=state_data.get('money', 170),
                score=state_data.get('score', 0),
                towers=state_data.get('towers', []),
                enemies=state_data.get('enemies', []),
                projectiles=state_data.get('projectiles', []),
                game_time=state_data.get('game_time', 0.0),
                is_wave_active=state_data.get('is_wave_active', False),
                fps=state_data.get('fps', 60.0)
            )

        except Exception as e:
            print(f"Warning: Failed to extract game state: {e}")
            return RealGameState()

    def simulate_player_action(self, skill: PlayerSkill,
                               game_state: RealGameState,
                               action_type: str) -> bool:
        """Simulate a player action based on skill level"""
        skill_value = skill.value[0]

        try:
            if action_type == "place_tower":
                return self.place_tower_with_skill(skill_value, game_state)
            elif action_type == "upgrade_tower":
                return self.upgrade_tower_with_skill(skill_value, game_state)
            elif action_type == "socket_gem":
                return self.socket_gem_with_skill(skill_value, game_state)
            elif action_type == "start_wave":
                return self.start_wave_with_skill(skill_value, game_state)

        except Exception as e:
            print(f"Action failed: {e}")
            return False

        return False

    def place_tower_with_skill(self, skill_value: float,
                               game_state: RealGameState) -> bool:
        """Place a tower based on player skill level"""
        if not self.driver:
            return False

        if game_state.money < 50:  # Can't afford basic tower (updated cost)
            print(f"Not enough money: {game_state.money} < 50")
            return False

        # Determine tower type based on skill and money
        tower_type = self.choose_tower_type(skill_value, game_state.money,
                                            game_state.wave_number)

        # Find placement position based on skill
        position = self.find_tower_position(skill_value, game_state)

        if not position:
            print("No valid position found for tower placement")
            return False

        # Click to place tower
        try:
            # First select tower type using the correct selector
            tower_selector = f'.tower-item[data-tower="{tower_type}"]'

            print(f"Looking for tower selector: {tower_selector}")

            # Wait for element to be clickable
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC

            tower_element = WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, tower_selector))
            )

            # Check if tower is affordable first
            is_affordable = self.driver.execute_script(f"""
                const towerItem = document.querySelector('{tower_selector}');
                return towerItem && !towerItem.classList.contains('disabled');
            """)

            if not is_affordable:
                print(f"Tower {tower_type} is not affordable or disabled")
                return False

            tower_element.click()
            print(f"Selected {tower_type} tower")

            # Verify selection worked
            time.sleep(0.2)
            selection_check = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                return game && game.towerManager ? {
                    placementMode: game.towerManager.placementMode,
                    selectedType: game.towerManager.selectedTowerType
                } : null;
            """)

            print(f"Selection check: {selection_check}")

            if not selection_check or not selection_check.get('placementMode'):
                print("Failed to enter placement mode")
                return False

            # Add skill-based delay (better players are faster)
            reaction_time = 0.1 + (1 - skill_value) * 0.3
            time.sleep(reaction_time)

            # Get canvas position for accurate clicking
            canvas_rect = self.driver.execute_script("""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                return {
                    x: rect.left + window.pageXOffset,
                    y: rect.top + window.pageYOffset,
                    width: rect.width,
                    height: rect.height
                };
            """)

            print(f"Canvas rect: {canvas_rect}")
            print(f"Clicking at position: ({position[0]}, {position[1]})")

            # Verify position is valid before clicking
            position_valid = self.driver.execute_script(f"""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.towerManager) return false;
                return game.towerManager.canPlaceTower(
                    {position[0]}, {position[1]}
                );
            """)

            print(f"Position valid: {position_valid}")

            if not position_valid:
                print("Position is not valid for tower placement")
                return False

            # Use proper mouse events that the game expects
            # First, simulate mousemove to set coordinates
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseMoveEvent = new MouseEvent('mousemove', {{
                    clientX: rect.left + {position[0]},
                    clientY: rect.top + {position[1]},
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(mouseMoveEvent);
            """)

            # Small delay to process mousemove
            time.sleep(0.05)

            # Then simulate mousedown (what the game actually listens for)
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseDownEvent = new MouseEvent('mousedown', {{
                    clientX: rect.left + {position[0]},
                    clientY: rect.top + {position[1]},
                    button: 0,  // Left mouse button
                    buttons: 1,
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(mouseDownEvent);
            """)

            # Small delay
            time.sleep(0.05)

            # Finally simulate mouseup to complete the click
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseUpEvent = new MouseEvent('mouseup', {{
                    clientX: rect.left + {position[0]},
                    clientY: rect.top + {position[1]},
                    button: 0,  // Left mouse button
                    buttons: 0,
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(mouseUpEvent);
            """)

            print(f"Simulated mouse events to place {tower_type} tower at " +
                  f"({position[0]}, {position[1]})")

            # Wait a moment and verify tower was placed
            time.sleep(0.3)
            tower_count = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                return game && game.towerManager ?
                    game.towerManager.towers.length : 0;
            """)

            print(f"Tower count after placement: {tower_count}")

            # Check if placement mode was exited (success indicator)
            final_placement_check = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                return game && game.towerManager ?
                    game.towerManager.placementMode : true;
            """)

            success = not final_placement_check
            print(f"Placement successful: {success}")

            return success

        except Exception as e:
            print(f"Failed to place tower: {e}")
            import traceback
            traceback.print_exc()
            return False

    def choose_tower_type(self, skill_value: float, money: int,
                          wave: int) -> str:
        """Choose tower type based on skill and context"""
        if skill_value >= 0.8:
            # Expert: Strategic choices
            if money >= 100 and wave >= 3:
                return "poison"  # Good for tough enemies
            elif money >= 75:
                return "splash"  # Good for crowds
            else:
                return "basic"
        else:
            # Lower skill: More basic choices
            if money >= 75 and skill_value >= 0.5:
                return "splash"
            elif money >= 50:
                return "basic"
            else:
                return "basic"  # Always affordable

    def find_tower_position(self, skill_value: float,
                            game_state: RealGameState
                            ) -> Optional[Tuple[int, int]]:
        """Find optimal tower position based on skill"""
        if not self.driver:
            return None

        # First, try a simple fallback approach
        try:
            # Get canvas dimensions and try some basic positions
            canvas = self.driver.find_element(By.ID, "game-canvas")
            canvas_width = canvas.size['width']
            canvas_height = canvas.size['height']

            # Try some common good positions (center-left, center-right areas)
            fallback_positions = [
                (int(canvas_width * 0.3), int(canvas_height * 0.4)),
                (int(canvas_width * 0.7), int(canvas_height * 0.4)),
                (int(canvas_width * 0.3), int(canvas_height * 0.6)),
                (int(canvas_width * 0.7), int(canvas_height * 0.6)),
                (int(canvas_width * 0.5), int(canvas_height * 0.3)),
                (int(canvas_width * 0.5), int(canvas_height * 0.7)),
            ]

            # Test if we can place a tower at these positions
            for pos in fallback_positions:
                # Quick check by trying to click (this won't actually place)
                position_test_js = f"""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.grid) return false;

                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const x = {pos[0]};
                const y = {pos[1]};

                // Convert to grid coordinates
                const gridPos = game.grid.worldToGrid(x, y);
                return game.grid.canPlaceTower(gridPos.x, gridPos.y);
                """

                try:
                    can_place = self.driver.execute_script(position_test_js)
                    if can_place:
                        print(f"Found valid fallback position at {pos}")
                        return pos
                except Exception:
                    continue

            print("All fallback positions failed, trying advanced search...")

        except Exception as e:
            print(f"Fallback position search failed: {e}")

        # Advanced JavaScript-based search (original approach)
        position_js = """
        const game = document.getElementById('game-canvas').game;
        if (!game || !game.grid) {
            console.log('Game or grid not available');
            return null;
        }

        console.log('Grid available, searching for positions...');

        // Find valid positions by checking the grid directly
        const validPositions = [];
        for (let x = 3; x < 17; x++) {
            for (let y = 3; y < 12; y++) {
                if (game.grid.canPlaceTower(x, y)) {
                    const worldPos = game.grid.gridToWorld(x, y);
                    validPositions.push({
                        x: worldPos.x,
                        y: worldPos.y,
                        gridX: x,
                        gridY: y
                    });
                }
            }
        }

        console.log('Found', validPositions.length, 'valid positions');

        if (validPositions.length === 0) return null;

        // Return the first valid position for now
        return validPositions[0];
        """

        try:
            position_data = self.driver.execute_script(position_js)
            if position_data:
                print(f"Found position via grid search: "
                      f"({position_data['x']}, {position_data['y']})")
                return (position_data['x'], position_data['y'])
        except Exception as e:
            print(f"Advanced position search failed: {e}")

        print("No valid positions found with any method")
        return None

    def upgrade_tower_with_skill(self, skill_value: float,
                                 game_state: RealGameState) -> bool:
        """Upgrade towers based on skill level"""
        if not self.driver:
            return False

        if not game_state.towers or game_state.money < 22:
            return False

        # Find best tower to upgrade based on skill
        best_tower = None

        if skill_value >= 0.7:
            # Expert: Upgrade strategically (focus on fewer towers)
            basic_towers = [t for t in game_state.towers
                            if t['type'] == 'basic' and t['level'] < 3]
            if basic_towers:
                best_tower = basic_towers[0]  # Upgrade first basic tower
        else:
            # Lower skill: Spread upgrades
            upgradeable = [t for t in game_state.towers if t['level'] < 2]
            if upgradeable:
                best_tower = upgradeable[0]

        if not best_tower:
            return False

        try:
            # Select tower using proper mouse events
            position = best_tower['position']

            # Simulate mousemove to set coordinates
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseMoveEvent = new MouseEvent('mousemove', {{
                    clientX: rect.left + {position['x']},
                    clientY: rect.top + {position['y']},
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(mouseMoveEvent);
            """)

            time.sleep(0.05)

            # Simulate mousedown to select tower
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseDownEvent = new MouseEvent('mousedown', {{
                    clientX: rect.left + {position['x']},
                    clientY: rect.top + {position['y']},
                    button: 0,
                    buttons: 1,
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(mouseDownEvent);
            """)

            time.sleep(0.05)

            # Simulate mouseup
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseUpEvent = new MouseEvent('mouseup', {{
                    clientX: rect.left + {position['x']},
                    clientY: rect.top + {position['y']},
                    button: 0,
                    buttons: 0,
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(mouseUpEvent);
            """)

            time.sleep(0.2)  # Give time for tower selection

            # Click upgrade button
            upgrade_btn = self.driver.find_element(By.ID, "upgrade-tower-btn")
            upgrade_btn.click()

            print(f"Upgraded {best_tower['type']} tower")

            return True

        except Exception as e:
            print(f"Failed to upgrade tower: {e}")
            return False

    def socket_gem_with_skill(self, skill_value: float,
                              game_state: RealGameState) -> bool:
        """Socket gems based on skill level"""
        # Simplified gem socketing for now
        return False  # TODO: Implement when gem UI is ready

    def start_wave_with_skill(self, skill_value: float,
                              game_state: RealGameState) -> bool:
        """Start next wave based on skill timing"""
        if not self.driver:
            return False

        if game_state.is_wave_active:
            return False

        try:
            # Better players start waves faster
            if skill_value >= 0.7:
                time.sleep(0.5)  # Quick decision
            else:
                time.sleep(1.5)  # Slower decision

            start_btn = self.driver.find_element(By.ID, "next-wave-btn")
            start_btn.click()
            print("Started next wave")
            return True

        except Exception as e:
            print(f"Failed to start wave: {e}")
            return False

    async def run_game_test(self, skill: PlayerSkill,
                            target_waves: int = 5) -> TestResult:
        """Run a complete game test with specified skill level"""
        print(f"🎮 Testing {skill.value[1]}...")

        if not self.driver:
            raise Exception("Driver not initialized")

        # Reset game state
        self.driver.refresh()
        await asyncio.sleep(3)

        # Wait for game to be fully loaded
        print("  Waiting for game to initialize...")
        for i in range(10):
            try:
                game_ready = self.driver.execute_script("""
                    const game = document.getElementById('game-canvas').game;
                    return game && game.grid && game.waveManager &&
                           game.towerManager;
                """)
                if game_ready:
                    print("  Game fully loaded!")
                    break
                else:
                    await asyncio.sleep(1)
            except Exception:
                await asyncio.sleep(1)
        else:
            print("  Warning: Game may not be fully loaded")

        start_time = time.time()
        decision_times = []
        fps_samples = []

        last_wave = 0
        towers_built = 0

        while True:
            game_state = self.extract_real_game_state()
            fps_samples.append(game_state.fps)

            # Check win/loss conditions
            if game_state.health <= 0:
                success = False
                break

            if game_state.wave_number >= target_waves:
                success = True
                break

            # Track wave progression
            if game_state.wave_number > last_wave:
                last_wave = game_state.wave_number
                print(f"  Wave {game_state.wave_number} reached")

            # Make decisions based on skill level
            decision_start = time.time()

            if (not game_state.is_wave_active and
                    game_state.wave_number < target_waves):
                # Build towers if we have money and need more
                if len(game_state.towers) < 2 + game_state.wave_number * 1.5:
                    if self.simulate_player_action(skill, game_state,
                                                   "place_tower"):
                        towers_built += 1

                # Upgrade towers if we have excess money
                elif game_state.money > 100:
                    self.simulate_player_action(skill, game_state,
                                                "upgrade_tower")

                # Start next wave
                else:
                    self.simulate_player_action(skill, game_state,
                                                "start_wave")

            decision_time = time.time() - decision_start
            decision_times.append(decision_time)

            # Prevent infinite loops
            current_time = time.time()
            if current_time - start_time > 300:  # 5 minute timeout
                success = False
                break

            await asyncio.sleep(0.1)  # Small delay between decisions

        total_time = time.time() - start_time
        final_state = self.extract_real_game_state()

        # Calculate efficiency score
        efficiency = 0.0
        if towers_built > 0 and total_time > 0:
            efficiency = (final_state.score / towers_built) / total_time

        return TestResult(
            player_skill=skill,
            waves_completed=final_state.wave_number,
            final_health=final_state.health,
            final_money=final_state.money,
            final_score=final_state.score,
            total_time=total_time,
            success=success,
            towers_built=towers_built,
            average_fps=statistics.mean(fps_samples) if fps_samples else 60.0,
            decision_timings=decision_times,
            efficiency_score=efficiency
        )

    async def run_comprehensive_test(self, target_waves: int = 5,
                                     runs_per_skill: int = 3) -> Dict:
        """Run comprehensive balance testing with real gameplay"""
        print("🎯 REAL GAME BALANCE TEST")
        print("=" * 50)
        print(f"Testing {len(PlayerSkill)} skill levels with "
              f"{runs_per_skill} runs each")
        print(f"Target: {target_waves} waves")
        print()

        await self.setup_test_environment()

        all_results = {}

        try:
            for skill in PlayerSkill:
                skill_results = []

                for run in range(runs_per_skill):
                    print(f"  Run {run + 1}/{runs_per_skill}...")
                    result = await self.run_game_test(skill, target_waves)
                    skill_results.append(result)

                # Calculate aggregate statistics
                success_rate = (sum(1 for r in skill_results if r.success) /
                                len(skill_results))
                avg_waves = statistics.mean(r.waves_completed
                                            for r in skill_results)
                avg_health = statistics.mean(r.final_health
                                             for r in skill_results)
                avg_efficiency = statistics.mean(r.efficiency_score
                                                 for r in skill_results)
                avg_fps = statistics.mean(r.average_fps for r in skill_results)

                all_results[skill] = {
                    'skill_name': skill.value[1],
                    'success_rate': success_rate,
                    'avg_waves_completed': avg_waves,
                    'avg_final_health': avg_health,
                    'avg_efficiency': avg_efficiency,
                    'avg_fps': avg_fps,
                    'individual_results': skill_results
                }

                status = ("🟢 Too Easy" if success_rate >= 0.9 else
                          "🟡 Balanced" if success_rate >= 0.7 else
                          "🟠 Hard" if success_rate >= 0.5 else
                          "🔴 Too Hard")

                print(f"  {skill.value[1]:30} | {success_rate:5.1%} | "
                      f"{status}")

        finally:
            await self.cleanup()

        return all_results

    async def cleanup(self):
        """Clean up test environment"""
        print("🧹 Cleaning up test environment...")

        if self.driver:
            self.driver.quit()

        try:
            # Stop docker containers gracefully
            subprocess.run(["docker-compose", "down"],
                           capture_output=True, text=True, timeout=30)
        except Exception:
            pass


async def main():
    parser = argparse.ArgumentParser(description='Real Game Balance Tester')
    parser.add_argument('--waves', type=int, default=5,
                        help='Target waves to complete (default: 5)')
    parser.add_argument('--runs', type=int, default=3,
                        help='Test runs per skill level (default: 3)')
    parser.add_argument('--skills', nargs='+',
                        choices=[s.name.lower() for s in PlayerSkill],
                        help='Specific skill levels to test')

    args = parser.parse_args()

    tester = RealGameBalanceTester()

    try:
        results = await tester.run_comprehensive_test(args.waves, args.runs)

        print("\n📊 REAL GAME BALANCE ANALYSIS:")
        print("=" * 40)

        # Extract key metrics for comparison
        if PlayerSkill.ABOVE_AVERAGE in results:
            above_avg = results[PlayerSkill.ABOVE_AVERAGE]
            print(f"Above Average Players: "
                  f"{above_avg['success_rate']:.1%} success rate")
            print(f"Average waves completed: "
                  f"{above_avg['avg_waves_completed']:.1f}")
            print(f"Average final health: "
                  f"{above_avg['avg_final_health']:.1f}/20")
            print(f"Average FPS: {above_avg['avg_fps']:.1f}")

        # Determine if results match expectations
        print("\n🎯 VERDICT:")
        if PlayerSkill.ABOVE_AVERAGE in results:
            success_rate = results[PlayerSkill.ABOVE_AVERAGE]['success_rate']
            if success_rate >= 0.9:
                print("❌ GAME TOO EASY - Above average players dominate")
            elif 0.65 <= success_rate <= 0.85:
                print("✅ BALANCED - Above average players have "
                      "appropriate challenge")
            else:
                print("❌ GAME TOO HARD - Above average players "
                      "struggle excessively")

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return 1

    return 0


if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))
