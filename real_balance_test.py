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
            self.wait_for_game_server()

        except subprocess.TimeoutExpired:
            raise Exception("Docker containers took too long to start")
        except Exception as e:
            raise Exception(f"Failed to start Docker containers: {e}")

        # Setup Chrome browser with logging options based on quiet mode
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1200,800")

        # Enable comprehensive logging capabilities
        chrome_options.add_argument("--enable-logging")
        chrome_options.add_argument("--log-level=0")  # All log levels
        chrome_options.add_argument("--v=1")  # Verbose logging
        chrome_options.add_argument("--enable-logging=stderr")

        # Enable developer tools features for better console capture
        chrome_options.add_argument("--remote-debugging-port=9222")
        chrome_options.add_argument("--enable-automation")

        # DON'T use headless mode - we want full browser features
        # chrome_options.add_argument("--headless")

        # Set up logging preferences to capture console types
        chrome_options.set_capability('goog:loggingPrefs', {
            'browser': 'ALL',
            'driver': 'ALL',
            'performance': 'ALL'
        })

        try:
            self.driver = webdriver.Chrome(options=chrome_options)

            # Enable comprehensive console log capture through CDP
            self.driver.execute_cdp_cmd('Runtime.enable', {})
            self.driver.execute_cdp_cmd('Log.enable', {})
            self.driver.execute_cdp_cmd('Console.enable', {})
            self.driver.execute_cdp_cmd('Debugger.enable', {})

            # Enable page domain for better navigation tracking
            self.driver.execute_cdp_cmd('Page.enable', {})

            # Enable network domain for resource loading tracking
            self.driver.execute_cdp_cmd('Network.enable', {})

            # Enable verbose console logging and performance monitoring
            self.driver.execute_cdp_cmd('Log.startViolationsReport', {
                'config': [
                    {'name': 'longTask', 'threshold': 50},  # Lower threshold
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

            # Inject console logging capture script
            print("Setting up comprehensive console logging...")

            # Inject console interceptor to capture console output
            console_capture_script = """
            window.capturedConsoleLogs = [];

            // Store original console methods
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            const originalInfo = console.info;
            const originalDebug = console.debug;

            // Intercept all console methods
            ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
                const original = console[method];
                console[method] = function(...args) {
                    window.capturedConsoleLogs.push({
                        type: method,
                        timestamp: Date.now(),
                        message: args.map(arg => {
                            if (typeof arg === 'object') {
                                try {
                                    return JSON.stringify(arg);
                                } catch (e) {
                                    return String(arg);
                                }
                            }
                            return String(arg);
                        }).join(' ')
                    });

                    // Keep only last 2000 logs to prevent memory issues
                    if (window.capturedConsoleLogs.length > 2000) {
                        window.capturedConsoleLogs =
                            window.capturedConsoleLogs.slice(-2000);
                    }

                    original.apply(console, args);
                };
            });

            console.log('🎮 Comprehensive console logging active!');
            """

            self.driver.execute_script(console_capture_script)

            # Add some initial console output to verify logging is working
            self.driver.execute_script(
                "console.log('🚀 Balance Test: Game loaded, console active');")
            self.driver.execute_script(
                "console.info('⚡ Balance Test: Starting testing...');")

            print("Game loaded successfully with comprehensive logging!")

        except Exception as e:
            print(f"Failed to setup browser: {e}")
            raise

    def wait_for_game_server(self, timeout=90):
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
            time.sleep(3)

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
                    fps: Math.round(1 / (game.deltaTime || 0.0167))
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
        """Check and print browser console logs including injected capture"""
        try:
            if not self.driver:
                return

            # First get our injected console logs
            injected_logs = []
            try:
                injected_data = self.driver.execute_script("""
                    const logs = window.capturedConsoleLogs || [];
                    const errors = window.capturedErrors || [];
                    // Get and clear recent logs (last 10)
                    const recent_logs = logs.slice(-10);
                    const recent_errors = errors.slice(-5);
                    return {
                        logs: recent_logs,
                        errors: recent_errors
                    };
                """)

                if injected_data:
                    injected_logs = injected_data.get('logs', [])
                    injected_errors = injected_data.get('errors', [])

                    if injected_logs or injected_errors:
                        print("=== CAPTURED CONSOLE ACTIVITY ===")

                        # Show recent console logs
                        for log_entry in injected_logs:
                            log_type = log_entry.get('type', 'log')
                            message = log_entry.get('message', '')
                            timestamp = log_entry.get('timestamp', 0)

                            # Format timestamp
                            try:
                                import datetime
                                dt = datetime.datetime.fromtimestamp(
                                    timestamp / 1000)
                                time_str = dt.strftime('%H:%M:%S.%f')[:-3]
                            except Exception:
                                time_str = str(timestamp)

                            type_emoji = {
                                'log': '📝',
                                'info': 'ℹ️',
                                'warn': '⚠️',
                                'error': '❌',
                                'debug': '🔍'
                            }.get(log_type, '📝')

                            print(f"    [{time_str}] {type_emoji} {message}")

                        # Show recent errors
                        for error_entry in injected_errors:
                            message = error_entry.get('message', '')
                            error_type = error_entry.get('type', 'error')
                            filename = error_entry.get('filename', '')

                            error_detail = message
                            if filename:
                                lineno = error_entry.get('lineno', '')
                                error_detail += f" (at {filename}:{lineno})"

                            print(f"    🚨 [{error_type.upper()}] "
                                  f"{error_detail}")

            except Exception as e:
                print(f"    ⚠ Could not access injected console logs: {e}")

            # Also get standard browser logs as fallback
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
        print(f"place_tower_with_skill called with skill={skill_value}, "
              f"money={game_state.money}, towers={len(game_state.towers)}")

        if not self.driver:
            print("ERROR: No driver available")
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
            # For optimal play, no delay - humans can click instantly!
            if skill_value >= 1.0:
                reaction_time = 0.0  # Optimal players = instant reaction
            else:
                reaction_time = 0.1 + (1 - skill_value) * 0.3
            if reaction_time > 0:
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
            placement_result = self.driver.execute_script("""
                try {
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;
                    const towerCount = game && game.towerManager ?
                        game.towerManager.towers.length : 0;
                    const inPlacement = game && game.towerManager ?
                        game.towerManager.isInPlacementMode() : true;

                    // Get last tower placed for verification
                    let lastTower = null;
                    if (game && game.towerManager &&
                        game.towerManager.towers.length > 0) {
                        const towers = game.towerManager.towers;
                        lastTower = towers[towers.length - 1];
                    }

                    return {
                        towerCount: towerCount,
                        inPlacementMode: inPlacement,
                        lastTower: lastTower ? {
                            type: lastTower.type,
                            x: lastTower.x,
                            y: lastTower.y,
                            cost: lastTower.cost
                        } : null
                    };
                } catch (error) {
                    console.error('Tower verification error:', error);
                    return {
                        towerCount: 0,
                        inPlacementMode: true,
                        lastTower: null,
                        error: error.message
                    };
                }
            """)

            tower_count = placement_result.get('towerCount', 0)
            in_placement = placement_result.get('inPlacementMode', True)
            last_tower = placement_result.get('lastTower')

            print(f"Tower count after placement: {tower_count}")
            print(f"Still in placement mode: {in_placement}")

            if last_tower:
                print(f"Last tower placed: {last_tower['type']} at "
                      f"({last_tower['x']}, {last_tower['y']}) "
                      f"cost: {last_tower['cost']}")
            else:
                print("No towers found or placement failed")

            success = not in_placement and tower_count > 0
            print(f"Placement success: {success}")

            return success

        except Exception as e:
            print(f"Failed to place tower: {e}")
            import traceback
            traceback.print_exc()
            return False

    def choose_tower_type(self, skill_value: float, money: int,
                          wave: int) -> str:
        """Intelligent tower type selection based on situation"""

        # Get dynamic tower costs
        basic_cost = self.get_tower_cost('basic')
        splash_cost = self.get_tower_cost('splash')
        poison_cost = self.get_tower_cost('poison')

        # INTELLIGENT DECISION MAKING: Consider current game state
        try:
            # Get real-time game data for smarter choices
            current_state = self.extract_real_game_state()
            tower_count = len(current_state.towers) if current_state else 0
            enemy_count = len(current_state.enemies) if current_state else 0
            # Dynamic strategy based on actual game situation
            print(f"Smart tower choice: Wave {wave}, Money {money}, "
                  f"Towers {tower_count}, Enemies {enemy_count}")

            # Early game foundation: Always build 2-3 basic towers first
            if tower_count < 2 or wave == 1:
                if money >= basic_cost:
                    print("  -> Basic tower for early foundation")
                    return "basic"

            # Intelligent adaptation based on money efficiency
            if money >= splash_cost + basic_cost:  # Can afford both
                if skill_value >= 0.7 and wave >= 2:
                    # Mix splash for crowd control after basic foundation
                    if tower_count >= 2 and enemy_count > 3:
                        print("  -> Splash tower for crowd control")
                        return "splash"

            # High-skill adaptive choices
            if skill_value >= 0.8 and money >= poison_cost + 50:
                if wave >= 3 and tower_count >= 3:
                    print("  -> Poison tower for late game strength")
                    return "poison"

            # Conservative but effective choice for most situations
            if money >= basic_cost:
                print("  -> Basic tower (reliable choice)")
                return "basic"

        except Exception as e:
            print(f"  Smart choice failed, using fallback: {e}")

        # Fallback logic: Safe and reliable
        if money >= basic_cost:
            return "basic"
        else:
            # Not enough money for any tower
            return "basic"  # Will fail cost check later

    def find_optimal_tower_position(self, game_state: RealGameState
                                    ) -> Optional[Tuple[int, int]]:
        """Find strategic tower position using cached comprehensive analysis"""
        try:
            if not self.driver:
                return None

            # Check if we have cached analysis for this session
            if not hasattr(self, '_optimal_positions_cache'):
                print("🔍 Performing comprehensive map analysis for "
                      "optimal positioning...")
                self._optimal_positions_cache = []
                self._used_optimal_positions = set()

                # Get path data from the game
                path_analysis = self.driver.execute_script("""
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas.game || window.game;

                    if (!game || !game.grid || !game.grid.path) {
                        return {error: 'No game or path data'};
                    }

                    const path = game.grid.path;
                    const towerStats = game.towerManager.getTowerStats(
                        'basic');
                    const range = towerStats ? towerStats.range : 110;

                    // Convert path to world coordinates
                    const pathPoints = path.map(p =>
                        game.grid.gridToWorld(p.x, p.y));

                    return {
                        pathPoints: pathPoints,
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height,
                        range: range,
                        pathLength: path.length
                    };
                """)

                if 'error' in path_analysis:
                    print(f"Error getting path data: {path_analysis['error']}")
                    return None

                # Analyze all positions with 50px step for good coverage
                # vs speed balance
                search_step = 50
                margin = 60

                total_positions = (
                    (path_analysis['canvasWidth'] - 2*margin) // search_step
                ) * (
                    (path_analysis['canvasHeight'] - 2*margin) // search_step
                )
                print(f"📊 Analyzing {total_positions} positions for "
                      f"optimal tower placement...")

                canvas_width = path_analysis['canvasWidth']
                canvas_height = path_analysis['canvasHeight']
                for test_x in range(margin, canvas_width - margin,
                                    search_step):
                    for test_y in range(margin, canvas_height - margin,
                                        search_step):

                        # Calculate path coverage and strategic value
                        coverage_score = 0
                        positions_in_range = 0
                        min_distance = float('inf')
                        critical_coverage = 0

                        # Analyze coverage of this position
                        for i, point in enumerate(path_analysis['pathPoints']):
                            distance = ((test_x - point['x']) ** 2 +
                                        (test_y - point['y']) ** 2) ** 0.5
                            if distance <= path_analysis['range']:
                                # Closer is better
                                range_val = path_analysis['range']
                                coverage_score += max(0, range_val - distance)
                                positions_in_range += 1

                                # Bonus for critical path sections
                                # (middle 60% of path)
                                path_points_len = len(
                                    path_analysis['pathPoints'])
                                if 0.2 <= i/path_points_len <= 0.8:
                                    critical_coverage += 1

                            min_distance = min(min_distance, distance)

                        # Skip positions with no path coverage
                        if positions_in_range == 0:
                            continue

                        # Penalty for being too close to path (blocks enemies)
                        if min_distance < 40:
                            coverage_score *= 0.4

                        # Calculate strategic bonuses
                        path_points = path_analysis['pathPoints']
                        coverage_percent = ((positions_in_range /
                                            len(path_points)) * 100)

                        # Strategic scoring
                        strategic_score = coverage_score
                        # Bonus for critical path coverage
                        strategic_score += critical_coverage * 10
                        # Diminishing returns on high coverage
                        strategic_score += min(coverage_percent, 30) * 2

                        # Position quality bonuses
                        path_center_x = (sum(p['x'] for p in path_points) /
                                         len(path_points))
                        path_center_y = (sum(p['y'] for p in path_points) /
                                         len(path_points))
                        center_distance = ((test_x - path_center_x) ** 2 +
                                           (test_y - path_center_y) ** 2
                                           ) ** 0.5

                        # Prefer positions near path center but not too close
                        if 80 < center_distance < 300:
                            strategic_score += 50

                        self._optimal_positions_cache.append({
                            'x': test_x,
                            'y': test_y,
                            'score': strategic_score,
                            'coverage_percent': coverage_percent,
                            'critical_coverage': critical_coverage,
                            'min_distance': min_distance
                        })

                # Sort by score (best positions first)
                cache = self._optimal_positions_cache
                cache.sort(key=lambda p: p['score'], reverse=True)
                cache_len = len(self._optimal_positions_cache)
                print(f"✅ Analysis complete! Found {cache_len} "
                      f"viable positions")

                # Show top 5 positions for debugging
                for i, pos in enumerate(cache[:5]):
                    score = pos['score']
                    coverage = pos['coverage_percent']
                    print(f"  #{i+1}: ({pos['x']}, {pos['y']}) "
                          f"score={score:.1f} coverage={coverage:.1f}%")

            # Find the best available position
            existing_towers = game_state.towers

            for position in self._optimal_positions_cache:
                pos_key = (position['x'], position['y'])

                # Skip if already used
                if pos_key in self._used_optimal_positions:
                    continue

                # Check for conflicts with existing towers
                conflict = False
                for tower in existing_towers:
                    pos_dict = tower.get('position', {})
                    tower_x = tower.get('x', pos_dict.get('x', 0))
                    tower_y = tower.get('y', pos_dict.get('y', 0))

                    pos_x_diff = abs(position['x'] - tower_x)
                    pos_y_diff = abs(position['y'] - tower_y)
                    if pos_x_diff < 80 or pos_y_diff < 80:
                        conflict = True
                        break

                # Verify position is still buildable
                if not conflict:
                    is_buildable = self.driver.execute_script(f"""
                        const canvas = document.getElementById('game-canvas');
                        const game = canvas.game || window.game;
                        if (!game || !game.grid) return false;

                        const gridPos = game.grid.worldToGrid(
                            {position['x']}, {position['y']});
                        return game.grid.canPlaceTower(gridPos.x, gridPos.y);
                    """)

                    if is_buildable:
                        # Mark as used and return
                        self._used_optimal_positions.add(pos_key)
                        pos_x = position['x']
                        pos_y = position['y']
                        score = position['score']
                        coverage = position['coverage_percent']
                        critical = position['critical_coverage']
                        print(f"🎯 Optimal position selected: ({pos_x}, "
                              f"{pos_y}) score={score:.1f} "
                              f"coverage={coverage:.1f}% "
                              f"critical={critical}")
                        return (position['x'], position['y'])

            print("⚠️ No available optimal positions found")
            return None

        except Exception as e:
            print(f"Optimal positioning error: {e}")
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

                        // Only accept positions with at least 10% coverage
                        // (lowered for Wave 1 - any coverage is better)
                        if (coveragePercent >= 10.0) {
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

        # For OPTIMAL skill level (1.0), always use comprehensive analysis
        if skill_value >= 0.9:  # Optimal skill level
            print("🎯 Using OPTIMAL comprehensive positioning for "
                  "perfect placement!")
            try:
                strategic_pos = self.find_optimal_tower_position_with_skill(
                    game_state, skill_value
                )
                if strategic_pos:
                    print(f"✅ Found optimal strategic position at "
                          f"{strategic_pos}")
                    return strategic_pos
                else:
                    print("⚠️ Optimal positioning returned None, "
                          "using fallback")
            except Exception as e:
                print(f"Optimal positioning failed: {e}")
                import traceback
                traceback.print_exc()

        # For other skill levels, use immediate simple positioning for speed
        print("🚀 Using IMMEDIATE simple positioning for speed!")
        try:
            simple_pos = self.find_simple_valid_position()
            if simple_pos:
                print(f"✅ Found IMMEDIATE position at {simple_pos}")
                return simple_pos
        except Exception as e:
            print(f"Simple positioning failed: {e}")

        # Final fallback to strategic positioning
        print("⚠️ Final fallback to strategic positioning")
        try:
            strategic_pos = self.find_optimal_tower_position_with_skill(
                game_state, skill_value
            )
            if strategic_pos:
                print(f"Found strategic position at {strategic_pos}")
                return strategic_pos
            else:
                print("Strategic positioning returned None")
        except Exception as e:
            print(f"Strategic positioning failed: {e}")
            import traceback
            traceback.print_exc()

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

        # Check game canvas and dimensions
        print("  Checking game canvas and map information...")
        game_info = self.driver.execute_script("""
            const canvas = document.getElementById('game-canvas');
            const game = canvas ? canvas.game : null;
            const mapInfo = game && game.currentMap ? {
                id: game.currentMap.id,
                name: game.currentMap.name,
                pathLength: game.currentMap.path ?
                    game.currentMap.path.length : 0,
                firstPoint: game.currentMap.path ?
                    game.currentMap.path[0] : null,
                lastPoint: game.currentMap.path ?
                    game.currentMap.path[game.currentMap.path.length - 1] :
                    null
            } : null;

            return {
                canvasExists: !!canvas,
                canvasWidth: canvas ? canvas.width : 0,
                canvasHeight: canvas ? canvas.height : 0,
                gameExists: !!game,
                gridWidth: game && game.grid ? game.grid.width : 0,
                gridHeight: game && game.grid ? game.grid.height : 0,
                cellSize: game && game.grid ? game.grid.cellSize : 0,
                mapInfo: mapInfo
            };
        """)

        print(f"    Canvas: {game_info['canvasWidth']}x"
              f"{game_info['canvasHeight']}")
        print(f"    Grid: {game_info['gridWidth']}x"
              f"{game_info['gridHeight']} cells")
        print(f"    Cell size: {game_info['cellSize']}px")

        if game_info['mapInfo']:
            map_data = game_info['mapInfo']
            print(f"    Map: {map_data['name']} (ID: {map_data['id']})")
            print(f"    Path: {map_data['pathLength']} points")
            if map_data['firstPoint'] and map_data['lastPoint']:
                first = map_data['firstPoint']
                last = map_data['lastPoint']
                print(f"    Start: ({first['x']}, {first['y']}) -> "
                      f"End: ({last['x']}, {last['y']})")

                # Check if path goes beyond grid boundaries
                grid_width = game_info['gridWidth']
                grid_height = game_info['gridHeight']
                if (last['x'] >= grid_width or last['y'] >= grid_height or
                        first['x'] < 0 or first['y'] < 0):
                    print(f"    WARNING: Map path extends beyond grid! "
                          f"Grid is {grid_width}x{grid_height}, "
                          f"but path goes to ({last['x']}, {last['y']})")
        else:
            print("    No map loaded yet")

        # Handle map selection modal if present
        try:
            print("  Looking for map selection modal...")
            # Wait briefly for map gallery modal to appear
            try:
                WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located(
                        (By.ID, "map-gallery-modal"))
                )
                modal_found = True
            except Exception:
                modal_found = False

            if modal_found:
                # Check if modal is visible (not hidden)
                modal_visible = self.driver.execute_script("""
                    const modal = document.getElementById('map-gallery-modal');
                    return modal && !modal.classList.contains('hidden');
                """)

                if modal_visible:
                    print(f"  ✅ Map selection modal found! "
                          f"Selecting map {map_id}...")
                    # Click the select button for the specified map
                    map_cards = self.driver.find_elements(
                        By.CLASS_NAME, "map-card"
                    )
                    print(f"    Found {len(map_cards)} map cards")
                    if map_id < len(map_cards):
                        select_btn = map_cards[map_id].find_element(
                            By.TAG_NAME, "button"
                        )
                        select_btn.click()
                        await asyncio.sleep(2)
                        print(f"  ✅ Map {map_id} selected successfully!")
                    else:
                        print(f"  ⚠️ Warning: Map {map_id} not found, "
                              f"using first map")
                        # Click first available map
                        if map_cards:
                            select_btn = map_cards[0].find_element(
                                By.TAG_NAME, "button"
                            )
                            select_btn.click()
                            await asyncio.sleep(2)
                            print("  ✅ First map selected as fallback")
                else:
                    print("  ❌ Map selection modal exists but is hidden")
            else:
                print("  ❌ No map selection modal found!")
                # Force map selection programmatically
                print("  🔧 Attempting to force map selection via JS...")
                force_result = self.driver.execute_script(f"""
                    try {{
                        const canvas = document.getElementById('game-canvas');
                        const game = canvas.game;
                        if (game && game.selectMap) {{
                            game.selectMap({map_id});
                            console.log('Map {map_id} selected via game');
                            return 'success';
                        }} else if (window.selectMap) {{
                            window.selectMap({map_id});
                            console.log('Map {map_id} selected via window');
                            return 'success';
                        }} else {{
                            console.log('No map selection function available');
                            return 'no_function';
                        }}
                    }} catch (error) {{
                        console.error('Force map selection error:', error);
                        return 'error';
                    }}
                """)

                if force_result == 'success':
                    print(f"  ✅ Map {map_id} forced successfully!")
                    await asyncio.sleep(1)
                else:
                    print(f"  ⚠️ Could not force map: {force_result}")
                    print("  🎲 Game may auto-select default map")

        except Exception as e:
            print(f"  ❌ Map selection check failed: {e}")

        # Wait for game to be minimally functional - much faster check
        print("  Waiting for game to initialize...")
        for i in range(5):  # Reduced from 15 to 5 - faster timeout
            try:
                # Simplified check - just need basic game object
                # and state extraction to work
                game_ready = self.driver.execute_script("""
                    const canvas = document.getElementById('game-canvas');
                    const game = canvas ? canvas.game : null;
                    // Just check if game exists and we can extract basic state
                    return game && typeof game.getMoney === 'function';
                """)

                # Additional check - can we actually extract game state?
                if game_ready:
                    try:
                        test_state = self.extract_real_game_state()
                        if test_state and hasattr(test_state, 'money'):
                            print("  ✅ Game ready for AI control!")
                            break
                    except Exception:
                        game_ready = False

                if not game_ready:
                    print(f"  ⏳ Game initializing... ({i + 1}/5)")
                    # Shorter wait - 0.5s instead of 1s
                    await asyncio.sleep(0.5)
            except Exception as e:
                print(f"  ⚠️ Game ready check error: {e}")
                await asyncio.sleep(0.5)
        else:
            print("  ⚠️ Game loading timeout - proceeding anyway")

        # Extract game constants once
        try:
            self.get_game_constants()
            print("  ✅ Game constants extracted")
        except Exception as e:
            print(f"  ⚠️ Failed to extract constants: {e}")

        print("  🚀 Starting AI control - no pre-building, "
              "immediate response mode")

        start_time = time.time()
        decision_times = []
        fps_samples = []

        last_wave = 0
        towers_built = 0

        # Throttling for repeated AI messages
        last_ai_message_time = 0
        ai_message_throttle = 1.0  # Only print AI messages once per second

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
            # Stop as soon as we reach the wave AFTER our target
            if game_state.wave_number > target_waves:
                success = True
                print(f"  Victory! Completed {target_waves} waves with "
                      f"{game_state.health} health remaining")
                print(f"  Stopped at wave {game_state.wave_number} "
                      f"(target was {target_waves})")
                break

            # Timeout check - more generous for Wave 1, realistic for later
            if game_state.wave_number == 1:
                timeout_duration = 120  # 2 minutes for Wave 1 (harder)
            else:
                timeout_duration = target_waves * 60  # 60 seconds per wave

            if time.time() - start_time > timeout_duration:
                success = False
                timeout_min = timeout_duration / 60
                print(f"  Timeout! Game took too long ({timeout_min:.1f} "
                      f"min limit for wave {game_state.wave_number}). "
                      f"Final health: {game_state.health}")
                break

            # Track wave progression
            if game_state.wave_number > last_wave:
                last_wave = game_state.wave_number
                print(f"  Wave {game_state.wave_number} reached")

            # Make decisions based on skill level
            decision_start = time.time()

            # HYPER-AGGRESSIVE: Place towers immediately when wave active
            # No waiting, no complex conditions - just BUILD TOWERS NOW!
            can_build_towers = (
                game_state.money >= 30 and  # Basic tower cost
                len(game_state.towers) < 6  # Build up to 6 towers
            )

            # IMMEDIATE ACTION: If we can build, BUILD NOW!
            current_time = time.time()
            if len(game_state.towers) < 6:
                # Throttle AI status messages to prevent flooding
                if current_time - last_ai_message_time >= ai_message_throttle:
                    print(f"IMMEDIATE AI: Wave {game_state.wave_number}, "
                          f"Towers {len(game_state.towers)}, "
                          f"Money {game_state.money}, "
                          f"Can build: {can_build_towers}")
                    last_ai_message_time = current_time

            # FORCE TOWER BUILDING - No hesitation allowed
            # Build towers IMMEDIATELY when wave is active
            if can_build_towers:
                print("🚀 FORCING IMMEDIATE TOWER BUILDING!")
                # IMMEDIATE TOWER BUILDING - No complex logic needed
                # Path is static, just place towers along optimal positions
                min_towers_needed = 6  # Always aim for 6 towers

                print(f"IMMEDIATE: Current {len(game_state.towers)}, "
                      f"Target {min_towers_needed}, Money {game_state.money}")

                # Phase 1: BUILD TOWERS IMMEDIATELY
                while (len(game_state.towers) < min_towers_needed and
                       game_state.money >= 30):
                    # Place tower immediately - no hesitation
                    print("🏗️ IMMEDIATE tower placement attempt...")
                    placed = self.simulate_player_action(
                        skill, game_state, "place_tower")
                    if placed:
                        towers_built += 1
                        print("✅ IMMEDIATE tower placement SUCCESS!")
                        # Refresh game state after placing tower
                        new_state = self.extract_real_game_state()
                        if new_state:
                            game_state = new_state
                        else:
                            print("Failed to refresh game state, breaking "
                                  "tower building loop")
                            break
                    else:
                        print(f"❌ Tower placement failed. Current towers: "
                              f"{len(game_state.towers)}, "
                              f"Target: {min_towers_needed}, "
                              f"Money: {game_state.money}")
                        # Can't place more towers, break loop
                        break

            # Only do other actions if we can't build towers
            elif game_state.money >= 50 and len(game_state.towers) > 0:
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

            # NO DELAY - AI should act immediately like a real player
            # await asyncio.sleep(0.1)  # REMOVED: This was making AI slow

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

        # Close browser
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
