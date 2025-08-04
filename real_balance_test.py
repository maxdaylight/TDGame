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
import sys
import os
from datetime import datetime
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


class TeeOutput:
    """Class to write output to both console and log file simultaneously"""
    def __init__(self, *files):
        self.files = files

    def write(self, text):
        for file in self.files:
            file.write(text)
            file.flush()

    def flush(self):
        for file in self.files:
            file.flush()


def setup_logging():
    """Setup logging to capture all output to a timestamped log file"""
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)

    # Create timestamped log filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"logs/balance_test_{timestamp}.log"

    # Open log file
    log_file = open(log_filename, 'w', encoding='utf-8')

    # Create tee output that writes to both console and log file
    tee = TeeOutput(sys.stdout, log_file)

    # Replace stdout and stderr with our tee output
    sys.stdout = tee
    sys.stderr = tee

    # Print initial log info
    print(f"Balance Test Log Started: {datetime.now()}")
    print(f"Log file: {log_filename}")
    print("=" * 50)
    print()

    return log_file, log_filename


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
        print("Setting up real game test environment...")

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

            # Enable comprehensive console log capture
            self.driver.execute_cdp_cmd('Runtime.enable', {})
            self.driver.execute_cdp_cmd('Log.enable', {})

            # Enable verbose console logging
            self.driver.execute_cdp_cmd('Log.startViolationsReport', {
                'config': [
                    {'name': 'longTask', 'threshold': 200},
                    {'name': 'longLayout', 'threshold': 30},
                    {'name': 'blockedEvent', 'threshold': 100},
                    {'name': 'blockedParser', 'threshold': -1},
                    {'name': 'handler', 'threshold': 150},
                    {'name': 'recurringHandler', 'threshold': 50},
                    {'name': 'discouragedAPIUse', 'threshold': -1}
                ]
            })

            self.driver.get(self.game_url)

            # Wait for game to load
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.ID, "game-canvas"))
            )

            print("Game loaded successfully!")

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
                            print("Game server is ready!")
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
            # Execute JavaScript to get game state with better error handling
            game_state_js = """
            try {
                const canvas = document.getElementById('game-canvas');
                if (!canvas) {
                    console.log('Canvas not found');
                    return null;
                }

                const game = canvas.game || window.game;
                if (!game) {
                    console.log('Game object not found on canvas or window');
                    return null;
                }

                // Check if game is properly initialized
                if (!game.waveManager || !game.towerManager || !game.grid) {
                    console.log('Game not fully initialized', {
                        waveManager: !!game.waveManager,
                        towerManager: !!game.towerManager,
                        grid: !!game.grid
                    });
                    return null;
                }

                const towers = game.towerManager.towers || [];
                const enemies = game.waveManager.getAllEnemies ?
                    game.waveManager.getAllEnemies() :
                    (game.waveManager.enemies || []);

                return {
                    wave_number: game.waveManager.currentWave || 0,
                    health: game.health || 20,
                    money: game.money || 170,
                    score: game.score || 0,
                    towers: towers.map(t => ({
                        type: t.type,
                        level: t.level || 1,
                        x: t.position ? t.position.x : t.x,
                        y: t.position ? t.position.y : t.y,
                        damage: t.damage,
                        range: t.range,
                        fireRate: t.fireRate,
                        gems: t.gems || []
                    })),
                    enemies: enemies.map(e => ({
                        type: e.type,
                        health: e.health,
                        maxHealth: e.maxHealth,
                        x: e.position ? e.position.x : e.x,
                        y: e.position ? e.position.y : e.y,
                        speed: e.speed
                    })),
                    projectiles: (game.towerManager.projectiles || []).map(
                        p => ({
                            damage: p.damage,
                            type: p.type,
                            x: p.position ? p.position.x : p.x,
                            y: p.position ? p.position.y : p.y
                        })
                    ),
                    game_time: game.gameTime || 0,
                    is_wave_active: game.waveManager.isWaveActive || false,
                    fps: game.fps || 60
                };
            } catch (error) {
                console.error('Error extracting game state:', error);
                return null;
            }
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
            result = False
            if action_type == "place_tower":
                result = self.place_tower_with_skill(skill_value, game_state)
                # Check console immediately after placement for strategic debug
                self.check_console_logs()
            elif action_type == "upgrade_tower":
                result = self.upgrade_tower_with_skill(skill_value, game_state)
            elif action_type == "socket_gem":
                result = self.socket_gem_with_skill(skill_value, game_state)
            elif action_type == "start_wave":
                result = self.start_wave_with_skill(skill_value, game_state)

            return result

        except Exception as e:
            print(f"Action failed: {e}")
            # Check console for any error details
            self.check_console_logs()
            return False

        return False

    def check_console_logs(self):
        """Check and print ALL browser console logs"""
        try:
            if not self.driver:
                return

            logs = self.driver.get_log('browser')
            if logs:
                print("=== BROWSER CONSOLE LOGS ===")
                for log in logs:
                    level = log['level']
                    message = log['message']

                    # Show ALL logs - don't filter anything important
                    # Only filter out very specific noise
                    noise_patterns = [
                        'google_apis\\gcm\\engine',
                        'PHONE_REGISTRATION_ERROR',
                        'DEPRECATED_ENDPOINT',
                        'Authentication Failed: wrong_secret',
                        'DevTools listening',
                        'voice_transcription.cc',
                        'TensorFlow Lite XNNPACK'
                    ]

                    is_noise = any(pattern in message
                                   for pattern in noise_patterns)

                    if not is_noise:
                        level_icon = {
                            'SEVERE': '[ERROR]',
                            'WARNING': '[WARN]',
                            'INFO': '[INFO]',
                            'DEBUG': '[DEBUG]'
                        }.get(level, '[LOG]')

                        print(f"    {level_icon} {message}")

                print("=== END CONSOLE LOGS ===")
        except Exception as e:
            print(f"Failed to get console logs: {e}")

    def get_game_constants(self):
        """Extract dynamic game constants from the running game"""
        try:
            if not self.driver:
                return {}

            # Extract tower costs and stats from the game
            constants = self.driver.execute_script("""
                try {
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    if (!game) return {};

                    // Extract tower costs and stats
                    const constants = {};

                    // Get tower costs from UI buttons or game data
                    const towerButtons = {
                        'basic': document.querySelector(
                            '[data-tower="basic"]'),
                        'splash': document.querySelector(
                            '[data-tower="splash"]'),
                        'poison': document.querySelector(
                            '[data-tower="poison"]'),
                        'sniper': document.querySelector(
                            '[data-tower="sniper"]')
                    };

                    constants.towerCosts = {};
                    constants.towerStats = {};

                    // Extract costs from data attributes or game functions
                    for (const [type, button] of
                         Object.entries(towerButtons)) {
                        if (button && button.dataset.cost) {
                            constants.towerCosts[type] =
                                parseInt(button.dataset.cost);
                        }

                        // Try to get stats from game functions
                        if (game.towerManager &&
                            game.towerManager.getTowerStats) {
                            const stats =
                                game.towerManager.getTowerStats(type);
                            if (stats) {
                                constants.towerStats[type] = stats;
                                constants.towerCosts[type] = stats.cost;
                                // Also extract upgrade costs
                                if (!constants.upgradeCosts) {
                                    constants.upgradeCosts = {};
                                }
                                constants.upgradeCosts[type] =
                                    stats.upgradeCost;
                            }
                        }
                    }

                    // Error if extraction fails - no fallbacks
                    if (Object.keys(constants.towerCosts).length === 0) {
                        throw new Error('Failed to extract tower costs from ' +
                                      'game - no data found');
                    }

                    if (Object.keys(constants.towerStats).length === 0) {
                        throw new Error('Failed to extract tower stats from ' +
                                      'game - no data found');
                    }

                    return constants;
                } catch (error) {
                    console.error('Failed to extract game constants:', error);
                    return {};
                }
            """)

            # Cache the constants for this test session
            self._game_constants = constants
            return constants

        except Exception as e:
            error_msg = f"Failed to extract game constants: {e}"
            print(error_msg)
            # Log more details about the game state
            try:
                if self.driver:
                    game_status = self.driver.execute_script("""
                        const canvas = document.getElementById('game-canvas');
                        const game = canvas.game || window.game;
                        return {
                            hasGame: !!game,
                            hasCanvas: !!canvas,
                            gameLoaded: !!(game && game.grid),
                            hasTowerManager: !!(game && game.towerManager),
                            getTowerStatsExists: !!(game &&
                                               game.towerManager &&
                                               game.towerManager.getTowerStats)
                        };
                    """)
                    print(f"Game state debug info: {game_status}")
            except Exception as debug_e:
                print(f"Could not get debug info: {debug_e}")

            raise Exception(error_msg)

    def get_tower_cost(self, tower_type):
        """Get the cost of a specific tower type"""
        if not hasattr(self, '_game_constants'):
            constants = self.get_game_constants()
            if not constants:
                raise Exception("Failed to extract game constants")

        tower_costs = self._game_constants.get('towerCosts', {})
        if tower_type not in tower_costs:
            raise Exception(f"Tower cost for '{tower_type}' not found in "
                            f"extracted data. Available types: "
                            f"{list(tower_costs.keys())}")

        return tower_costs[tower_type]

    def get_upgrade_cost(self, tower_type):
        """Get the upgrade cost of a specific tower type"""
        if not hasattr(self, '_game_constants'):
            constants = self.get_game_constants()
            if not constants:
                raise Exception("Failed to extract game constants")

        upgrade_costs = self._game_constants.get('upgradeCosts', {})
        if tower_type not in upgrade_costs:
            raise Exception(f"Upgrade cost for '{tower_type}' not found in "
                            f"extracted data. Available types: "
                            f"{list(upgrade_costs.keys())}")

        return upgrade_costs[tower_type]

    def place_tower_with_skill(self, skill_value: float,
                               game_state: RealGameState) -> bool:
        """Place a tower based on player skill level"""
        if not self.driver:
            return False

        # Get dynamic tower costs
        basic_cost = self.get_tower_cost('basic')
        if game_state.money < basic_cost:
            print(f"Not enough money: {game_state.money} < {basic_cost}")
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
            tower_selector = f'[data-tower="{tower_type}"]'

            print(f"Looking for tower selector: {tower_selector}")

            # Wait for element to be clickable
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC

            tower_element = WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, tower_selector))
            )

            # Check if tower is affordable using game logic
            is_affordable = self.driver.execute_script(
                f"""
                try {{
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    if (!game || !game.towerManager) return false;

                    const stats = game.towerManager.getTowerStats(
                        '{tower_type}'
                    );
                    return game.getMoney() >= stats.cost;
                }} catch (error) {{
                    console.error('Affordability check error:', error);
                    return false;
                }}
                """
            )

            if not is_affordable:
                print(f"Tower {tower_type} is not affordable")
                return False

            # Click the tower button to select it
            tower_element.click()
            print(f"Selected {tower_type} tower")

            # Verify selection worked and we're in placement mode
            time.sleep(0.2)
            placement_check = self.driver.execute_script("""
                try {
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    if (!game || !game.towerManager) return null;

                    return {
                        placementMode: game.towerManager.isInPlacementMode(),
                        selectedType: game.towerManager.selectedTowerType
                    };
                } catch (error) {
                    console.error('Placement mode check error:', error);
                    return null;
                }
            """)

            print(f"Placement mode check: {placement_check}")

            if not placement_check or not placement_check.get('placementMode'):
                print("Failed to enter placement mode")
                return False

            # Add skill-based delay (better players are faster)
            reaction_time = 0.1 + (1 - skill_value) * 0.3
            time.sleep(reaction_time)

            print(f"Placing {tower_type} tower at "
                  f"({position[0]}, {position[1]})")

            # Verify position is valid before clicking
            position_valid = self.driver.execute_script(f"""
                try {{
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    if (!game || !game.towerManager) return false;

                    can_place = game.towerManager.canPlaceTower(
                        {position[0]}, {position[1]}
                    );
                    return can_place;
                }} catch (error) {{
                    console.error('Position validation error:', error);
                    return false;
                }}
            """)

            print(f"Position valid: {position_valid}")

            if not position_valid:
                print("Position is not valid for tower placement")
                # Exit placement mode since we can't place
                self.driver.execute_script("""
                    try {
                        const canvas = document.getElementById('game-canvas');
                        const game = canvas.game || window.game;
                        if (game && game.towerManager) {
                            game.towerManager.exitPlacementMode();
                        }
                    } catch (error) {
                        console.error('Error exiting placement mode:', error);
                    }
                """)
                return False

            # Use direct JavaScript to place the tower (more reliable)
            placement_result = self.driver.execute_script(f"""
                try {{
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    if (!game || !game.towerManager) return false;

                    // Directly call the placeTower method
                    const tower = game.towerManager.placeTower(
                        {position[0]}, {position[1]}
                    );

                    if (tower) {{
                        console.log('Tower placed via direct method');
                        return true;
                    }} else {{
                        console.log('Direct tower placement failed');
                        return false;
                    }}
                }} catch (error) {{
                    console.error('Direct placement error:', error);
                    return false;
                }}
            """)

            if placement_result:
                print(f"Successfully placed {tower_type} tower")
                return True
            else:
                print("Direct tower placement failed, trying mouse simulation")

            # Fallback: Use mouse events
            # Update mouse position first
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const game = canvas.game || window.game;
                if (game) {{
                    game.mouse.x = {position[0]};
                    game.mouse.y = {position[1]};
                }}
            """)

            # Simulate left click
            self.driver.execute_script("""
                try {
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    if (!game) return false;

                    // Simulate left click handling
                    game.handleLeftClick();
                    return true;
                } catch (error) {
                    console.error('Click simulation error:', error);
                    return false;
                }
            """)

            # Wait a moment and verify tower was placed
            time.sleep(0.3)
            tower_count = self.driver.execute_script("""
                try {
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    return game && game.towerManager ?
                        game.towerManager.towers.length : 0;
                } catch (error) {
                    return 0;
                }
            """)

            print(f"Tower count after placement attempt: {tower_count}")

            # Check if placement mode was exited (success indicator)
            final_placement_check = self.driver.execute_script("""
                try {
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    return game && game.towerManager ?
                        game.towerManager.isInPlacementMode() : true;
                } catch (error) {
                    return true;
                }
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

        # Get dynamic tower costs
        basic_cost = self.get_tower_cost('basic')
        splash_cost = self.get_tower_cost('splash')
        poison_cost = self.get_tower_cost('poison')

        # Early game: Always prioritize basic towers for foundation
        if wave <= 2 or money < basic_cost * 2:  # Basic cost + safety buffer
            return "basic"

        if skill_value >= 0.8:
            # Expert: Strategic choices but still foundation-first
            if wave >= 4 and money >= poison_cost + 25:  # Poison cost + buffer
                return "poison"  # Good for tough enemies in late waves
            elif wave >= 3 and money >= splash_cost + 25:  # Splash + upgrade
                return "splash"  # Good for crowds after basic foundation
            else:
                return "basic"
        else:
            # Lower skill: More conservative choices
            if money >= 100 and skill_value >= 0.5 and wave >= 3:
                return "splash"
            else:
                return "basic"  # Always safe choice

    def find_optimal_tower_position(self, game_state: RealGameState
                                    ) -> Optional[Tuple[int, int]]:
        """Find strategic tower position using built-in positioning"""
        try:
            if not self.driver:
                return None

            # First, try to use the game's strategic positioning system
            strategic_position = self.driver.execute_script("""
                // Create a debug log array to return
                window.strategicDebugLogs = [];
                function debugLog(message) {
                    console.log(message);
                    window.strategicDebugLogs.push(message);
                }

                try {
                    debugLog('=== STRATEGIC POSITIONING START ===');
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    debugLog('Game object found: ' + !!game);
                    if (!game) {
                        debugLog('No game object found, returning null');
                        return {
                            position: null,
                            debugLogs: window.strategicDebugLogs
                        };
                    }

                    // Get existing towers for filtering
                    const existingTowers = game.towerManager ?
                        game.towerManager.towers.map(t => ({
                            x: t.position ? t.position.x : t.x,
                            y: t.position ? t.position.y : t.y
                        })) : [];

                    // Use the game's strategic positioning system
                    const strategicPos = game.getNextStrategicPosition ?
                        game.getNextStrategicPosition(existingTowers) : null;

                    if (strategicPos && strategicPos.position) {
                        debugLog('Using strategic position: ' +
                                JSON.stringify(strategicPos));
                        return {
                            position: {
                                x: strategicPos.position.x,
                                y: strategicPos.position.y,
                                coverage: strategicPos.pathCoverage,
                                strategicValue: strategicPos.strategicValue
                            },
                            debugLogs: window.strategicDebugLogs
                        };
                    }

                    // Fallback: Global search for strategic positions
                    debugLog('Strategic positioning fallback starting...');
                    debugLog('game.grid: ' +
                            (game.grid ? 'Found' : 'Missing'));
                    debugLog('game.grid.path: ' +
                               (game.grid && game.grid.path ?
                               `Found with ${game.grid.path.length} points` :
                               'Missing'));

                    if (!game.grid || !game.grid.path) {
                        debugLog('EARLY EXIT: No grid or path');
                        return {
                            position: null,
                            debugLogs: window.strategicDebugLogs
                        };
                    }

                    const path = game.grid.path;
                    debugLog('Path extracted, length check: ' + path.length);
                    if (!path || path.length === 0) {
                        debugLog('EARLY EXIT: Empty path');
                        return {
                            position: null,
                            debugLogs: window.strategicDebugLogs
                        };
                    }

                    debugLog(`Strategic positioning: path has ` +
                              `${path.length} points`);

                    // Get actual tower stats from game
                    const towerStats =
                        game.towerManager.getTowerStats('basic');
                    if (!towerStats || !towerStats.range) {
                        throw new Error('Failed to get basic ' +
                                      'tower stats from game');
                    }
                    const range = towerStats.range;
                    debugLog(`Tower range: ${range}`);

                    let bestPosition = null;
                    let bestScore = 0;
                    let totalPositionsChecked = 0;
                    let buildablePositions = 0;

                    // Global grid search to find optimal positions
                    // Finds center island & corner positions
                    const searchStep = 25; // Reduced for finer positioning
                    const margin = 60; // Margin from edges

                    debugLog(`Search parameters: step=${searchStep}, ` +
                            `margin=${margin}`);
                    debugLog(`Canvas size: ${canvas.width}x${canvas.height}`);
                    debugLog(`Search area: ${margin} to ` +
                            `${canvas.width - margin} x ${margin} to ` +
                            `${canvas.height - margin}`);

                    for (let testX = margin; testX < canvas.width - margin;
                         testX += searchStep) {
                        for (let testY = margin;
                             testY < canvas.height - margin;
                             testY += searchStep) {
                            totalPositionsChecked++;

                            // Check if buildable
                            const gridPos = game.grid.worldToGrid(testX,
                                testY);
                            if (!game.grid.canPlaceTower(gridPos.x,
                                gridPos.y)) {
                                continue;
                            }
                            buildablePositions++;

                            // Check distance from existing towers
                            let tooClose = false;
                            for (const tower of existingTowers) {
                                const dist = Math.sqrt(
                                    (testX - tower.x) ** 2 +
                                    (testY - tower.y) ** 2
                                );
                                if (dist < 80) {
                                    tooClose = true;
                                    break;
                                }
                            }
                            if (tooClose) continue;

                            // Calculate path coverage for this position
                            let pathCoverage = 0;
                            let debugDistances = [];
                            let weightedScore = 0;

                            for (let i = 0; i < path.length; i++) {
                                const pathPoint = path[i];
                                const pathWorld = game.grid.gridToWorld(
                                    pathPoint.x, pathPoint.y);
                                const dist = Math.sqrt(
                                    (testX - pathWorld.x) ** 2 +
                                    (testY - pathWorld.y) ** 2
                                );

                                // Log first few for debugging
                                if (buildablePositions <= 3 &&
                                    debugDistances.length < 3) {
                                    debugDistances.push(
                                        `dist=${dist.toFixed(1)} to ` +
                                        `path(${pathWorld.x},${pathWorld.y})`);
                                }

                                if (dist <= range) {
                                    pathCoverage++;
                                    // Weight early path points higher
                                    const pathWeight = Math.max(0.5,
                                        1.0 - (i / path.length) * 0.5);
                                    weightedScore += pathWeight;
                                }
                            }

                            const coveragePercent = (pathCoverage /
                                path.length) * 100;
                            // Scale up weighted score for strategic value
                            let strategicScore = weightedScore * 10;

                            // Debug first few positions in detail
                            if (buildablePositions <= 5) {
                                debugLog(`Position ${buildablePositions}: ` +
                                        `(${testX}, ${testY}) ` +
                                        `coverage=` +
                                        `${coveragePercent.toFixed(1)}% ` +
                                        `(${pathCoverage}/${path.length})`
                                        );
                                if (debugDistances.length > 0) {
                                    debugLog(`  Sample distances: ` +
                                            `${debugDistances.join(', ')}`);
                                }
                            }

                            // Debug: Log positions with decent coverage
                            if (coveragePercent >= 15.0) {
                                debugLog(`GOOD COVERAGE: Position ` +
                                        `(${testX}, ${testY}): ` +
                                        `${coveragePercent.toFixed(1)}%`);
                            }

                            // Bonus for critical path coverage
                            // (middle section)
                            const criticalStart = Math.floor(
                                path.length * 0.2);
                            const criticalEnd = Math.floor(
                                path.length * 0.8);
                            let criticalCoverage = 0;

                            for (let j = criticalStart; j < criticalEnd; j++) {
                                const pathPoint = path[j];
                                const pathWorld = game.grid.gridToWorld(
                                    pathPoint.x, pathPoint.y);
                                const dist = Math.sqrt(
                                    (testX - pathWorld.x) ** 2 +
                                    (testY - pathWorld.y) ** 2
                                );
                                if (dist <= range) {
                                    criticalCoverage++;
                                }
                            }

                            const criticalPercent = (criticalCoverage /
                                (criticalEnd - criticalStart)) * 100;
                            strategicScore += criticalPercent * 0.3;

                            // Bonus for center positioning (better coverage)
                            const centerX = canvas.width / 2;
                            const centerY = canvas.height / 2;
                            const distToCenter = Math.sqrt(
                                (testX - centerX) ** 2 + (testY - centerY) ** 2
                            );
                            const maxCenterDist = Math.sqrt(
                                centerX ** 2 + centerY ** 2
                            );
                            const centerBonus = (1 - distToCenter /
                                maxCenterDist) * 5;
                            strategicScore += centerBonus;

                            // Only consider positions with 25%+ coverage
                            if (coveragePercent >= 25.0 &&
                                strategicScore > bestScore) {
                                bestScore = strategicScore;
                                bestPosition = {
                                    x: testX,
                                    y: testY,
                                    coverage: coveragePercent,
                                    strategicValue: strategicScore
                                };
                            }
                        }
                    }

                    // Comprehensive debug summary
                    debugLog(`=== SEARCH SUMMARY ===`);
                    debugLog(`Total positions checked: ` +
                            `${totalPositionsChecked}`);
                    debugLog(`Buildable positions: ${buildablePositions}`);
                    debugLog(`Tower range used: ${range}`);
                    debugLog(`Path length: ${path.length} points`);
                    debugLog(`Best score found: ${bestScore}`);
                    debugLog(`Minimum required: 25.0%`);

                    console.log(`Grid search complete. Best position:`,
                               bestPosition);
                    debugLog(`Best score: ${bestScore}`);
                    if (!bestPosition) {
                        debugLog('No position found with 25%+ coverage');
                    }

                    return {
                        position: bestPosition,
                        debugLogs: window.strategicDebugLogs
                    };
                } catch (error) {
                    debugLog('Strategic positioning error: ' + error.message);
                    debugLog('Error stack: ' + error.stack);
                    // Return error information
                    return {
                        position: null,
                        error: error.message,
                        debugLogs: window.strategicDebugLogs
                    };
                }
            """)

            # Check console logs immediately after strategic positioning
            print("Checking console logs after strategic positioning...")
            self.check_console_logs()

            # Print debug logs from strategic positioning
            if strategic_position and 'debugLogs' in strategic_position:
                print("=== STRATEGIC POSITIONING DEBUG LOGS ===")
                for log in strategic_position['debugLogs']:
                    print(f"    {log}")
                print("=== END DEBUG LOGS ===")

            # Check for errors
            if strategic_position and 'error' in strategic_position:
                error_msg = strategic_position['error']
                print(f"Strategic positioning error: {error_msg}")
                return None

            # Extract position from new format
            actual_position = (strategic_position.get('position')
                               if strategic_position else None)

            if actual_position:
                coverage = actual_position.get('coverage', 0)
                value = actual_position.get('strategicValue', 0)
                print(f"Strategic position found: coverage={coverage:.1f}%, "
                      f"value={value:.1f}")

                # Require minimum 30% coverage for strategic positioning
                if coverage >= 30.0:
                    return (actual_position['x'], actual_position['y'])
                else:
                    print(f"Coverage too low ({coverage:.1f}%), "
                          f"using grid fallback")
                    return self.find_grid_based_position({})
            else:
                print("No strategic position available, using grid fallback")
                return self.find_grid_based_position({})

        except Exception as e:
            print(f"Strategic positioning error: {e}")
            import traceback
            traceback.print_exc()
            return None

    def find_grid_based_position(self, game_data):
        """Find a valid position using grid-based search with path coverage"""
        try:
            if not self.driver:
                return None

            # Use JavaScript to find valid grid positions that can reach path
            position_js = """
            try {
                const canvas = document.getElementById('game-canvas');
                const game = canvas.game || window.game;
                if (!game || !game.grid || !game.grid.path) return null;

                const path = game.grid.path;
                const towerStats = game.towerManager.getTowerStats('basic');
                const range = towerStats.range || 110;

                // Get existing towers to avoid placing too close
                const existingTowers = game.towerManager.towers.map(t => ({
                    x: t.position ? t.position.x : t.x,
                    y: t.position ? t.position.y : t.y
                }));

                const validPositions = [];

                // Search more strategically focused positions
                const searchStep = 30; // Reasonable step size
                const margin = 80; // Ensure we're not too close to edges

                for (let testX = margin; testX < canvas.width - margin;
                     testX += searchStep) {
                    for (let testY = margin; testY < canvas.height - margin;
                         testY += searchStep) {

                        // Check if buildable
                        const gridPos = game.grid.worldToGrid(testX, testY);
                        if (!game.grid.canPlaceTower(gridPos.x, gridPos.y)) {
                            continue;
                        }

                        // Check distance from existing towers (min 100px)
                        let tooClose = false;
                        for (const tower of existingTowers) {
                            const dist = Math.sqrt(
                                (testX - tower.x) ** 2 + (testY - tower.y) ** 2
                            );
                            if (dist < 100) {
                                tooClose = true;
                                break;
                            }
                        }
                        if (tooClose) continue;

                        // Calculate path coverage
                        let pathCoverage = 0;
                        for (const pathPoint of path) {
                            const pathWorld = game.grid.gridToWorld(
                                pathPoint.x, pathPoint.y);
                            const dist = Math.sqrt(
                                (testX - pathWorld.x) ** 2 +
                                (testY - pathWorld.y) ** 2
                            );
                            if (dist <= range) {
                                pathCoverage++;
                            }
                        }

                        const coveragePercent = (pathCoverage /
                            path.length) * 100;

                        // Only accept positions with at least 20% coverage
                        if (coveragePercent >= 20.0) {
                            validPositions.push({
                                x: testX,
                                y: testY,
                                coverage: coveragePercent
                            });
                        }
                    }
                }

                if (validPositions.length === 0) {
                    console.log('No valid grid positions with path coverage ' +
                               'found');
                    return null;
                }

                // Sort by coverage and return the best position
                validPositions.sort((a, b) => b.coverage - a.coverage);
                console.log(`Found ${validPositions.length} valid ` +
                           `positions, best coverage: ` +
                           `${validPositions[0].coverage.toFixed(1)}%`);

                return validPositions[0];

            } catch (error) {
                console.error('Grid search error:', error);
                return null;
            }
            """

            position_data = self.driver.execute_script(position_js)
            if position_data:
                print(f"Found grid-based position: "
                      f"({position_data['x']}, {position_data['y']})")
                return (position_data['x'], position_data['y'])

        except Exception as e:
            print(f"Grid-based positioning failed: {e}")

        return None

    def calculate_segment_center(self, segment):
        """Calculate the center point of a path segment"""
        avg_x = sum(p['x'] for p in segment) / len(segment)
        avg_y = sum(p['y'] for p in segment) / len(segment)
        return (avg_x, avg_y)

    def generate_position_candidates(self, center, game_data, existing_towers):
        """Generate candidate positions around a path segment center"""
        candidates = []
        center_x, center_y = center

        # Generate positions at optimal distances from path
        distances = [80, 100, 120]  # Different ranges for variety
        angles = [0, 45, 90, 135, 180, 225, 270, 315]  # 8 directions

        for distance in distances:
            for angle in angles:
                import math
                angle_rad = math.radians(angle)
                test_x = center_x + distance * math.cos(angle_rad)
                test_y = center_y + distance * math.sin(angle_rad)

                # Check bounds
                if (test_x < 50 or test_x > game_data['canvasWidth'] - 50 or
                        test_y < 50 or
                        test_y > game_data['canvasHeight'] - 50):
                    continue

                # Check if too close to existing towers
                too_close = False
                for tower in existing_towers:
                    dist = ((test_x - tower['x'])**2 +
                            (test_y - tower['y'])**2)**0.5
                    if dist < 70:  # Minimum separation
                        too_close = True
                        break

                if not too_close:
                    # Verify position is buildable
                    if self.driver is None:
                        print("Error: WebDriver is not initialized.")
                        return candidates
                    is_valid = self.driver.execute_script(f"""
                        const game = document.getElementById(
                            'game-canvas').game;
                        if (!game || !game.grid) return false;

                        const gridX = Math.floor(
                            {test_x} / {game_data['gridSize']});
                        const gridY = Math.floor(
                            {test_y} / {game_data['gridSize']});

                        return game.grid.canPlaceTower(gridX, gridY);
                    """)

                    if is_valid:
                        candidates.append((test_x, test_y))

        return candidates

    def calculate_path_coverage(self, position, path):
        """Calculate how much of the path this position can cover"""
        tower_range = 100  # Standard tower range
        coverage_count = 0

        for path_point in path:
            dist = ((position[0] - path_point['x'])**2 +
                    (position[1] - path_point['y'])**2)**0.5
            if dist <= tower_range:
                coverage_count += 1

        return coverage_count / len(path) * 100  # Percentage coverage

    def calculate_strategic_value(self, position, path, existing_towers,
                                  game_data):
        """Calculate overall strategic value of a position"""
        # Base value from path coverage
        coverage = self.calculate_path_coverage(position, path)
        strategic_value = coverage * 0.4  # 40% weight on coverage

        # Bonus for covering critical path sections (middle of path)
        critical_start = len(path) // 3
        critical_end = 2 * len(path) // 3
        critical_coverage = 0

        for i in range(critical_start, critical_end):
            path_point = path[i]
            dist = ((position[0] - path_point['x'])**2 +
                    (position[1] - path_point['y'])**2)**0.5
            if dist <= 100:
                critical_coverage += 1

        critical_score = (critical_coverage /
                          (critical_end - critical_start) * 100)
        # 30% weight on critical coverage
        strategic_value += critical_score * 0.3

        # Penalty for overlap with existing tower coverage
        overlap_penalty = 0
        for tower in existing_towers:
            dist = ((position[0] - tower['x'])**2 +
                    (position[1] - tower['y'])**2)**0.5
            tower_range = tower.get('range', 100)

            if dist < (tower_range + 100):  # Overlapping coverage
                overlap_ratio = max(0, (tower_range + 100 - dist) /
                                    (tower_range + 100))
                overlap_penalty += overlap_ratio * 20  # Penalty for overlap

        # 20% weight on avoiding overlap
        strategic_value -= overlap_penalty * 0.2

        # Bonus for spread distribution
        if existing_towers:
            min_dist_to_tower = min(
                ((position[0] - t['x'])**2 + (position[1] - t['y'])**2)**0.5
                for t in existing_towers
            )

            # Bonus for being well-separated (not too close, not too far)
            ideal_separation = 150
            separation_score = (100 -
                                abs(min_dist_to_tower - ideal_separation) / 2)
            # 10% weight on separation
            strategic_value += max(0, separation_score) * 0.1

        return max(0, strategic_value)

    def find_tower_position(self, skill_value: float,
                            game_state: RealGameState
                            ) -> Optional[Tuple[int, int]]:
        """Find optimal tower position based on skill"""
        if not self.driver:
            return None

        # First, try strategic positioning based on paths and towers
        try:
            strategic_pos = self.find_optimal_tower_position_with_skill(
                game_state, skill_value
            )
            if strategic_pos:
                print(f"Found strategic position at {strategic_pos}")
                return strategic_pos
            else:
                print("Strategic positioning returned None, using fallback")
        except Exception as e:
            print(f"Strategic positioning failed: {e}")
            import traceback
            traceback.print_exc()

        # Fallback: Use simple valid position finding
        try:
            return self.find_simple_valid_position()
        except Exception as e:
            print(f"Simple positioning failed: {e}")
            return None

    def find_simple_valid_position(self) -> Optional[Tuple[int, int]]:
        """Find any valid position using direct game grid queries"""
        if not self.driver:
            return None

        try:
            # Simple grid-based position search
            position_js = """
            try {
                const canvas = document.getElementById('game-canvas');
                const game = canvas.game || window.game;

                if (!game || !game.grid || !game.towerManager) {
                    console.log('Game components not available');
                    return null;
                }

                // Test predefined good positions first
                const testPositions = [
                    {x: 200, y: 200}, {x: 400, y: 200}, {x: 600, y: 200},
                    {x: 200, y: 350}, {x: 400, y: 350}, {x: 600, y: 350},
                    {x: 200, y: 500}, {x: 400, y: 500}, {x: 600, y: 500}
                ];

                for (const pos of testPositions) {
                    // Check bounds
                    if (pos.x < 50 || pos.x > canvas.width - 50 ||
                        pos.y < 50 || pos.y > canvas.height - 50) {
                        continue;
                    }

                    // Convert to grid coordinates
                    const gridPos = game.grid.worldToGrid(pos.x, pos.y);

                    // Check if position is valid
                    if (game.grid.canPlaceTower(gridPos.x, gridPos.y)) {
                        console.log('Found valid position:', pos);
                        return pos;
                    }
                }

                console.log('No predefined positions available');
                return null;
            } catch (error) {
                console.error('Simple position search error:', error);
                return null;
            }
            """

            position = self.driver.execute_script(position_js)
            if position:
                print(f"Found simple valid position: ({position['x']}, "
                      f"{position['y']})")
                return (position['x'], position['y'])

        except Exception as e:
            print(f"Simple position search failed: {e}")

        return None

    def find_optimal_tower_position_with_skill(
            self, game_state: RealGameState,
            skill_value: float) -> Optional[Tuple[int, int]]:
        """Find position with skill-based quality degradation"""
        try:
            strategic_pos = self.find_optimal_tower_position(game_state)
            if not strategic_pos:
                return None

            # Apply skill-based positioning degradation
            if skill_value >= 0.9:  # Optimal - perfect positioning
                return strategic_pos
            elif skill_value >= 0.7:  # Expert - slight degradation
                return self.apply_skill_degradation(strategic_pos, 15)
            elif skill_value >= 0.5:  # Above Average - moderate degradation
                return self.apply_skill_degradation(strategic_pos, 30)
            elif skill_value >= 0.3:  # Average - significant degradation
                return self.apply_skill_degradation(strategic_pos, 50)
            else:  # Below Average - poor positioning
                return self.apply_skill_degradation(strategic_pos, 80)

        except Exception as e:
            print(f"Skill-based positioning error: {e}")
            return None

    def apply_skill_degradation(
            self, optimal_pos: Tuple[int, int],
            degradation_radius: int) -> Tuple[int, int]:
        """Apply random degradation to optimal position based on skill"""
        import random

        # Add random offset based on skill level
        offset_x = random.randint(-degradation_radius, degradation_radius)
        offset_y = random.randint(-degradation_radius, degradation_radius)

        new_x = optimal_pos[0] + offset_x
        new_y = optimal_pos[1] + offset_y

        # Ensure position stays within bounds
        if self.driver is None:
            print("Error: WebDriver is not initialized.")
            return optimal_pos

        canvas_data = self.driver.execute_script("""
            const canvas = document.getElementById('game-canvas');
            return {width: canvas.width, height: canvas.height};
        """)

        new_x = max(50, min(canvas_data['width'] - 50, new_x))
        new_y = max(50, min(canvas_data['height'] - 50, new_y))

        # Check if degraded position is still valid
        is_valid = self.driver.execute_script(f"""
            const game = document.getElementById('game-canvas').game;
            if (!game || !game.grid) return false;

            const gridX = Math.floor({new_x} / game.grid.gridSize);
            const gridY = Math.floor({new_y} / game.grid.gridSize);

            return game.grid.canPlaceTower(gridX, gridY);
        """)

        if is_valid:
            print(f"Applied {degradation_radius}px skill degradation")
            return (new_x, new_y)
        else:
            print("Degraded position invalid, using original")
            return optimal_pos

        # Fallback to randomized grid-based positions
        try:
            # Get canvas dimensions
            canvas = self.driver.find_element(By.ID, "game-canvas")
            canvas_width = canvas.size['width']
            canvas_height = canvas.size['height']

            # Generate randomized positions for variety
            import random

            # Base good positions but add randomization
            base_positions = [
                (0.25, 0.35), (0.75, 0.35),  # Upper areas
                (0.25, 0.65), (0.75, 0.65),  # Lower areas
                (0.4, 0.5), (0.6, 0.5),      # Center areas
                (0.5, 0.3), (0.5, 0.7),      # Top/bottom center
            ]

            # Add randomization to positions (±10% variance)
            fallback_positions = []
            for base_x, base_y in base_positions:
                # Add random offset for variety
                offset_x = random.uniform(-0.1, 0.1)
                offset_y = random.uniform(-0.1, 0.1)

                final_x = max(0.1, min(0.9, base_x + offset_x))
                final_y = max(0.1, min(0.9, base_y + offset_y))

                pos = (int(canvas_width * final_x),
                       int(canvas_height * final_y))
                fallback_positions.append(pos)

            # Shuffle for more randomization
            random.shuffle(fallback_positions)

            print(f"Trying {len(fallback_positions)} randomized fallback "
                  f"positions")

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

        # Get dynamic upgrade cost
        basic_upgrade_cost = self.get_upgrade_cost('basic')
        if not game_state.towers or game_state.money < basic_upgrade_cost:
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
            # Tower data: {type, level, x, y, damage, range, fireRate, gems}
            pos_x = best_tower.get('x', 0)
            pos_y = best_tower.get('y', 0)

            # Simulate mousemove to set coordinates
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                const mouseMoveEvent = new MouseEvent('mousemove', {{
                    clientX: rect.left + {pos_x},
                    clientY: rect.top + {pos_y},
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
                    clientX: rect.left + {pos_x},
                    clientY: rect.top + {pos_y},
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
                    clientX: rect.left + {pos_x},
                    clientY: rect.top + {pos_y},
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
        try:
            if not self.driver or not game_state.towers:
                return False

            # Check in-game if any towers have available gem slots
            tower_with_empty_slot = self.driver.execute_script("""
                const canvas = document.getElementById('game-canvas');
                const game = canvas.game || window.game;
                if (!game || !game.towerManager) return null;

                // Find tower with empty gem slots
                for (const tower of game.towerManager.towers) {
                    const maxSlots = tower.maxGemSlots || 2;
                    const currentGems = tower.gems ? tower.gems.length : 0;
                    const towerX = tower.position ? tower.position.x : tower.x;
                    const towerY = tower.position ? tower.position.y : tower.y;
                    console.log(`Tower at (${towerX}, ${towerY}): ` +
                               `${currentGems}/${maxSlots} gems`);
                    if (currentGems < maxSlots) {
                        return {
                            x: tower.position ? tower.position.x : tower.x,
                            y: tower.position ? tower.position.y : tower.y,
                            type: tower.type,
                            currentGems: currentGems,
                            maxSlots: maxSlots
                        };
                    }
                }
                console.log('All towers have maximum gems');
                return null;
            """)

            if not tower_with_empty_slot:
                return False  # No towers need gems

            # Select the tower first
            tower_x = tower_with_empty_slot['x']
            tower_y = tower_with_empty_slot['y']

            # Click on the tower to select it
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

            click_x = canvas_rect['x'] + tower_x
            click_y = canvas_rect['y'] + tower_y

            # Simulate clicking on the tower
            self.driver.execute_script(f"""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();

                const clickEvent = new MouseEvent('mousedown', {{
                    clientX: {click_x},
                    clientY: {click_y},
                    button: 0,
                    bubbles: true,
                    cancelable: true
                }});
                canvas.dispatchEvent(clickEvent);
            """)

            # Wait for tower selection UI
            time.sleep(0.3)

            # Try to find and click a gem slot
            try:
                gem_slot = self.driver.find_element(
                    By.CSS_SELECTOR, ".gem-slot:not(.filled)"
                )
                gem_slot.click()
                tower_type = tower_with_empty_slot['type']
                print(f"Opened gem slot for {tower_type} tower")

                # Wait for gem modal
                time.sleep(0.5)

                # Try to buy an affordable gem
                affordable_gems = self.driver.find_elements(
                    By.CSS_SELECTOR, ".gem-item:not(.disabled)"
                )

                if affordable_gems:
                    # Pick first affordable gem (basic strategy)
                    affordable_gems[0].click()
                    print("Socketed gem successfully")
                    return True
                else:
                    print("No affordable gems available")
                    return False

            except Exception as e:
                print(f"Could not access gem interface: {e}")
                return False

        except Exception as e:
            print(f"Failed to socket gem: {e}")
            return False

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
                            target_waves: int = 5,
                            map_id: int = 0) -> TestResult:
        """Run a complete game test with specified skill level and map"""
        print(f"Testing {skill.value[1]} on Map {map_id}...")

        if not self.driver:
            raise Exception("Driver not initialized")

        # Reset game state
        self.driver.refresh()
        await asyncio.sleep(3)

        # Handle map selection modal if present
        try:
            # Wait for map gallery modal to appear
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "map-gallery-modal"))
            )

            # Check if modal is visible (not hidden)
            modal_visible = self.driver.execute_script("""
                const modal = document.getElementById('map-gallery-modal');
                return modal && !modal.classList.contains('hidden');
            """)

            if modal_visible:
                print(f"  Selecting map {map_id}...")
                # Click the select button for the specified map
                map_cards = self.driver.find_elements(
                    By.CLASS_NAME, "map-card"
                )
                if map_id < len(map_cards):
                    select_btn = map_cards[map_id].find_element(
                        By.TAG_NAME, "button"
                    )
                    select_btn.click()
                    await asyncio.sleep(2)
                    print(f"  Map {map_id} selected!")
                else:
                    print(f"  Warning: Map {map_id} not found, using default")
                    # Click first available map
                    if map_cards:
                        select_btn = map_cards[0].find_element(
                            By.TAG_NAME, "button"
                        )
                        select_btn.click()
                        await asyncio.sleep(2)
            else:
                print("  No map selection modal found, game may auto-start")

        except Exception as e:
            print(f"  Map selection failed: {e}, continuing with default map")

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

            # Check win/loss conditions using game state
            game_status = self.driver.execute_script(
                "return window.game ? window.game.gameState : 'loading';"
            )
            if game_status == 'gameOver' or game_state.health <= 0:
                success = False
                print(f"  Game Over! Final health: {game_state.health}")
                break
            if game_status == 'victory':
                success = True
                print(f"  Victory! Completed all waves with "
                      f"{game_state.health} health remaining")
                break

            # Check if we completed our target waves (custom victory condition)
            if (game_state.wave_number > target_waves and
                    not game_state.is_wave_active and
                    len(game_state.enemies) == 0):
                success = True
                print(f"  Victory! Completed {target_waves} waves with "
                      f"{game_state.health} health remaining")
                break

            # Timeout check - if stuck too long, it's probably a loss
            timeout_duration = target_waves * 60  # 1 minute per wave
            if time.time() - start_time > timeout_duration:
                success = False
                timeout_min = timeout_duration / 60
                print(f"  Timeout! Game took too long ({timeout_min:.0f} "
                      f"min limit for {target_waves} waves). "
                      f"Final health: {game_state.health}")
                break

            # Track wave progression
            if game_state.wave_number > last_wave:
                last_wave = game_state.wave_number
                print(f"  Wave {game_state.wave_number} reached")

            # Make decisions based on skill level
            decision_start = time.time()

            # Allow tower building during prep time or between waves
            can_build_towers = (not game_state.is_wave_active or
                                game_state.wave_number == 1)

            if (can_build_towers and game_state.wave_number <= target_waves):

                # Strategy: Build minimum towers first, then upgrade/gem
                # Early game: Be more aggressive about tower building
                if game_state.wave_number == 1:
                    min_towers_needed = 2  # Build 2 towers immediately wave 1
                else:
                    min_towers_needed = min(4, 1 + game_state.wave_number)

                # Phase 1: Build essential towers
                if len(game_state.towers) < min_towers_needed:
                    if self.simulate_player_action(skill, game_state,
                                                   "place_tower"):
                        towers_built += 1

                # Phase 2: Upgrade existing towers if we have money
                elif game_state.money > 50 and len(game_state.towers) > 0:
                    upgradeable = [t for t in game_state.towers
                                   if t.get('level', 1) < 3]
                    if upgradeable:
                        self.simulate_player_action(skill, game_state,
                                                    "upgrade_tower")
                    else:
                        # All towers max level, socket gems
                        self.simulate_player_action(skill, game_state,
                                                    "socket_gem")

                # Phase 3: Socket gems if we have good towers and money
                elif game_state.money > 30 and len(game_state.towers) >= 2:
                    self.simulate_player_action(skill, game_state,
                                                "socket_gem")

                # Phase 4: Start next wave when ready
                else:
                    self.simulate_player_action(skill, game_state,
                                                "start_wave")

            decision_time = time.time() - decision_start
            decision_times.append(decision_time)

            # Check browser console for any errors or important messages
            if game_state.wave_number != last_wave:  # Only when waves change
                self.check_console_logs()

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

    async def run_comprehensive_test(
        self,
        target_waves: int = 5,
        runs_per_skill: int = 3,
        selected_skills: Optional[List[str]] = None,
        map_id: int = 0
    ) -> Dict:
        """Run comprehensive balance testing with real gameplay"""
        print("REAL GAME BALANCE TEST")
        print("=" * 50)

        # Filter skills based on user selection
        if selected_skills:
            skill_list = []
            for skill in PlayerSkill:
                if skill.name.lower() in selected_skills:
                    skill_list.append(skill)
            if not skill_list:
                raise ValueError(f"No valid skills found in {selected_skills}")
        else:
            skill_list = list(PlayerSkill)

        print(f"Testing {len(skill_list)} skill levels with "
              f"{runs_per_skill} runs each")
        print(f"Target: {target_waves} waves on Map {map_id}")
        print(f"Skills: {[s.name for s in skill_list]}")
        print()

        await self.setup_test_environment()

        all_results = {}

        try:
            for skill in skill_list:
                skill_results = []

                for run in range(runs_per_skill):
                    print(f"  Run {run + 1}/{runs_per_skill}...")
                    result = await self.run_game_test(skill, target_waves,
                                                      map_id)
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

                status = ("Too Easy" if success_rate >= 0.9 else
                          "Balanced" if success_rate >= 0.7 else
                          "Hard" if success_rate >= 0.5 else
                          "Too Hard")

                print(f"  {skill.value[1]:30} | {success_rate:5.1%} | "
                      f"{status}")

        finally:
            await self.cleanup()

        return all_results

    async def cleanup(self):
        """Clean up test environment"""
        print("Cleaning up test environment...")

        if self.driver:
            self.driver.quit()

        try:
            # Stop docker containers gracefully
            subprocess.run(["docker-compose", "down"],
                           capture_output=True, text=True, timeout=30)
        except Exception:
            pass


async def main():
    # Setup logging to capture all output
    log_file, log_filename = setup_logging()

    try:
        parser = argparse.ArgumentParser(
            description='Real Game Balance Tester'
        )
        parser.add_argument('--waves', type=int, default=5,
                            help='Target waves to complete (default: 5)')
        parser.add_argument('--runs', type=int, default=3,
                            help='Test runs per skill level (default: 3)')
        parser.add_argument('--skills', nargs='+',
                            choices=[s.name.lower() for s in PlayerSkill],
                            help='Specific skill levels to test')
        parser.add_argument('--map', type=int, default=0,
                            help='Map ID to test (0=Classic, 1=Wide Approach, '
                                 '2=Narrow Pass, default: 0)')

        args = parser.parse_args()

        tester = RealGameBalanceTester()

        # Convert skill names to the format expected by the function
        selected_skills = args.skills if args.skills else None
        results = await tester.run_comprehensive_test(
            args.waves, args.runs, selected_skills, args.map)

        print("\nREAL GAME BALANCE ANALYSIS:")
        print("=" * 40)

        # Show results for all tested skill levels
        for skill, result_data in results.items():
            print(f"{skill.value[1]}: "
                  f"{result_data['success_rate']:.1%} success rate")
            print(f"  Average waves completed: "
                  f"{result_data['avg_waves_completed']:.1f}")
            print(f"  Average final health: "
                  f"{result_data['avg_final_health']:.1f}/20")
            print(f"  Average FPS: {result_data['avg_fps']:.1f}")
            print()

        # Determine verdict based on what was actually tested
        print("VERDICT:")

        # Use most representative skill level available for balance assessment
        # Priority: ABOVE_AVERAGE (balance target) > AVERAGE (casual baseline)
        # > EXPERT (skilled baseline) > others
        verdict_skill = None
        verdict_data = None

        if PlayerSkill.ABOVE_AVERAGE in results:
            verdict_skill = PlayerSkill.ABOVE_AVERAGE
            verdict_data = results[PlayerSkill.ABOVE_AVERAGE]
            print("Based on Above Average player performance "
                  "(balance target):")
        elif PlayerSkill.AVERAGE in results:
            verdict_skill = PlayerSkill.AVERAGE
            verdict_data = results[PlayerSkill.AVERAGE]
            print("Based on Average player performance (casual baseline):")
        elif PlayerSkill.EXPERT in results:
            verdict_skill = PlayerSkill.EXPERT
            verdict_data = results[PlayerSkill.EXPERT]
            print("Based on Expert player performance (skilled baseline):")
        elif PlayerSkill.OPTIMAL in results:
            verdict_skill = PlayerSkill.OPTIMAL
            verdict_data = results[PlayerSkill.OPTIMAL]
            print("Based on Optimal player performance (maximum potential):")
        elif PlayerSkill.BELOW_AVERAGE in results:
            verdict_skill = PlayerSkill.BELOW_AVERAGE
            verdict_data = results[PlayerSkill.BELOW_AVERAGE]
            print("Based on Below Average player performance:")
        else:
            # Use first available result
            verdict_skill, verdict_data = next(iter(results.items()))
            print(f"Based on {verdict_skill.value[1]} performance:")

        if verdict_data:
            success_rate = verdict_data['success_rate']

            # Adjust thresholds based on skill level
            if verdict_skill == PlayerSkill.OPTIMAL:
                # Optimal players should have some challenge
                if success_rate >= 0.95:
                    print("GAME TOO EASY - Even optimal play dominates "
                          "completely")
                elif success_rate >= 0.85:
                    print("ACCEPTABLE - Optimal play succeeds but not "
                          "trivially")
                else:
                    print("GAME TOO HARD - Even optimal play struggles")
            elif verdict_skill == PlayerSkill.EXPERT:
                # Expert players should succeed most of the time
                if success_rate >= 0.9:
                    print("GAME TOO EASY - Expert players dominate")
                elif 0.7 <= success_rate <= 0.85:
                    print("BALANCED - Expert players have appropriate "
                          "challenge")
                else:
                    print("GAME TOO HARD - Expert players struggle "
                          "excessively")
            elif verdict_skill == PlayerSkill.ABOVE_AVERAGE:
                # Above average players - ideal balance target
                if success_rate >= 0.85:
                    print("GAME TOO EASY - Above average players dominate")
                elif 0.65 <= success_rate <= 0.8:
                    print("BALANCED - Above average players have "
                          "appropriate challenge")
                else:
                    print("GAME TOO HARD - Above average players struggle "
                          "excessively")
            else:
                # Average or below average players
                if success_rate >= 0.8:
                    print("GAME TOO EASY - Lower skill players dominate")
                elif 0.4 <= success_rate <= 0.7:
                    print("BALANCED - Appropriate challenge for skill level")
                else:
                    print("GAME TOO HARD - Lower skill players struggle "
                          "excessively")

            print(f"Success rate: {success_rate:.1%}")

        # Log completion
        print()
        print("=" * 50)
        print(f"Balance Test Log Completed: {datetime.now()}")
        print(f"Full log saved to: {log_filename}")

        return 0

    except Exception as e:
        print(f"Test failed: {e}")
        return 1

    finally:
        # Close log file and restore stdout/stderr
        if 'log_file' in locals():
            log_file.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
