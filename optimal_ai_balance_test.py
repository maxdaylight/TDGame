#!/usr/bin/env python3
"""
Optimal AI Balance Test

This script creates an AI player that mimics the strategic decisions of an
optimal human player based on analysis of balance_test_20250805_134249.log.

The AI follows the exact strategic patterns observed in the human gameplay:
- Early Basic tower focus (Waves 1-2)
- Wave 3 Poison tower introduction for economy
- Wave 5 Splash tower introduction for crowd control
- Strategic upgrade timing and gem socketing
- Optimal positioning patterns

Requires Docker containers to be built and browser automation via Selenium.
Captures full browser console logs.
"""

import asyncio
import argparse
import subprocess
import time
import sys
import statistics
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


class TeeOutput:
    """Capture output to both console and log file"""
    def __init__(self, file_obj, stream):
        self.file = file_obj
        self.stream = stream

    def write(self, data):
        self.file.write(data)
        self.file.flush()
        self.stream.write(data)
        self.stream.flush()

    def flush(self):
        self.file.flush()
        self.stream.flush()


def setup_logging():
    """Setup logging to capture all output"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"logs/optimal_ai_balance_test_{timestamp}.log"

    # Ensure logs directory exists
    import os
    os.makedirs("logs", exist_ok=True)

    log_file = open(log_filename, 'w', encoding='utf-8')

    # Redirect stdout and stderr to log file AND console
    sys.stdout = TeeOutput(log_file, sys.__stdout__)
    sys.stderr = TeeOutput(log_file, sys.__stderr__)

    print(f"Optimal AI Balance Test - {datetime.now()}")
    print(f"Log file: {log_filename}")
    print("=" * 60)

    return log_file, log_filename


@dataclass
class RealGameState:
    """Real game state extracted from browser"""
    wave_number: int
    money: int
    health: int
    score: int
    towers: List[Dict]
    enemies: List[Dict]
    gems_available: List[Dict]
    fps: float
    game_paused: bool
    wave_active: bool
    wave_completed: bool


@dataclass
class TestResult:
    """Results from a single test run"""
    player_skill: str
    waves_completed: int
    final_health: int
    final_money: int
    final_score: int
    total_time: float
    success: bool
    towers_built: int
    average_fps: float
    decision_timings: List[float]
    efficiency_score: float


class OptimalStrategy:
    """
    Strategic patterns extracted from optimal human player log analysis:

    Wave 1-2: Focus on Basic towers, strategic positioning
    Wave 3: Introduce Poison towers for economy boost
    Wave 5: Add Splash towers for crowd control
    Progressive upgrades and gem socketing
    """

    # Tower type preferences by wave (from human log analysis)
    WAVE_TOWER_STRATEGY = {
        1: {"basic": 2, "poison": 0, "splash": 0, "sniper": 0},  # 2 Basic
        2: {"basic": 3, "poison": 0, "splash": 0, "sniper": 0},  # +1 Basic
        3: {"basic": 3, "poison": 1, "splash": 0, "sniper": 0},  # +Poison
        4: {"basic": 3, "poison": 2, "splash": 0, "sniper": 0},  # 2nd Poison
        5: {"basic": 3, "poison": 2, "splash": 1, "sniper": 0},  # +Splash
        6: {"basic": 3, "poison": 2, "splash": 2, "sniper": 0},  # 2nd Splash
        7: {"basic": 4, "poison": 2, "splash": 2, "sniper": 0},  # More Basic
        8: {"basic": 4, "poison": 3, "splash": 2, "sniper": 1},  # Add Sniper
        9: {"basic": 4, "poison": 3, "splash": 3, "sniper": 1},  # 3rd Splash
        10: {"basic": 5, "poison": 3, "splash": 3, "sniper": 1},  # More Basic
    }

    # Money thresholds for different actions (from human behavior)
    MONEY_THRESHOLDS = {
        "emergency_tower": 45,       # Always build if can afford basic
        "comfortable_upgrade": 120,  # Upgrade when comfortable
        "gem_socketing": 80,         # Socket gems when stable
        "max_savings": 200           # Never save beyond this amount
    }

    # Upgrade priorities (from human timing patterns)
    UPGRADE_PRIORITIES = {
        "basic": 3,     # High priority - main damage dealers
        "poison": 2,    # Medium priority - economy boost
        "splash": 2,    # Medium priority - crowd control
        "sniper": 1     # Low priority - situational
    }

    # Gem socketing preferences (from human choices)
    GEM_PREFERENCES = {
        "basic": ["damage", "fire", "thunder"],      # Pure damage focus
        "poison": ["poison", "earth", "damage"],     # DoT and damage
        "splash": ["fire", "earth", "damage"],       # Area damage
        "sniper": ["damage", "thunder", "fire"]      # High damage focus
    }


class OptimalAITester:
    """AI player that mimics optimal human strategic decisions"""

    def __init__(self, log_file=None):
        self.driver: Optional[webdriver.Chrome] = None
        self.game_constants = {}
        self.strategy = OptimalStrategy()
        self.log_file = log_file  # For console log capture

        # Strategic state tracking
        self.towers_by_wave = {}  # Track what towers we built each wave
        self.last_action_time = 0
        self.action_cooldown = 0.5  # Minimum time between actions (human-like)

        # Decision history (for learning and analysis)
        self.decision_history = []

    def can_take_action(self) -> bool:
        """Check if enough time has passed for next action"""
        return time.time() - self.last_action_time >= self.action_cooldown

    def record_action(self, action_type: str, details: Optional[Dict] = None):
        """Record an action for analysis"""
        self.last_action_time = time.time()
        self.decision_history.append({
            "timestamp": time.time(),
            "action": action_type,
            "details": details or {}
        })

    async def setup_test_environment(self):
        """Setup Docker containers and browser environment"""
        print("Setting up optimal AI test environment...")

        # Stop any existing containers
        print("  Stopping existing containers...")
        try:
            subprocess.run(["docker-compose", "down"],
                           capture_output=True, text=True, timeout=30)
        except Exception:
            pass

        # Build and start containers
        print("  Building and starting Docker containers...")
        try:
            # First build the containers
            print("    Building containers...")
            build_result = subprocess.run(
                ["docker-compose", "build", "--no-cache"],
                capture_output=True, text=True, timeout=180
            )
            if build_result.returncode != 0:
                raise Exception(f"Docker build failed: {build_result.stderr}")

            # Then start the containers
            print("    Starting containers...")
            up_result = subprocess.run(
                ["docker-compose", "up", "-d"],
                capture_output=True, text=True, timeout=60
            )
            if up_result.returncode != 0:
                raise Exception(f"Docker up failed: {up_result.stderr}")

            print("  ✅ Docker containers built and started successfully")
        except subprocess.TimeoutExpired:
            raise Exception("Docker operations timed out")
        except Exception as e:
            raise Exception(f"Failed to start containers: {e}")

        # Wait for services to be ready
        print("  Waiting for services to be ready...")
        await asyncio.sleep(10)

        # Setup Chrome browser
        print("  Setting up Chrome browser...")
        chrome_options = Options()
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1400,900')
        chrome_options.add_argument('--enable-logging')
        chrome_options.add_argument('--log-level=0')
        chrome_options.add_argument('--v=1')

        # Enable console logging
        chrome_options.set_capability('goog:loggingPrefs', {
            'browser': 'ALL',
            'driver': 'ALL',
            'performance': 'ALL'
        })

        try:
            self.driver = webdriver.Chrome(options=chrome_options)

            # Enable comprehensive console log capture through CDP
            print("  Setting up comprehensive console logging...")
            self.driver.execute_cdp_cmd('Runtime.enable', {})
            self.driver.execute_cdp_cmd('Log.enable', {})
            self.driver.execute_cdp_cmd('Console.enable', {})
            self.driver.execute_cdp_cmd('Debugger.enable', {})

            # Enable page domain for better navigation tracking
            self.driver.execute_cdp_cmd('Page.enable', {})

            # Enable network domain for resource loading tracking
            self.driver.execute_cdp_cmd('Network.enable', {})

            # CRITICAL FIX: Real-time console monitoring setup
            print("  Setting up real-time console monitoring...")
            self.console_monitoring = True
            self.console_buffer = []

            # Override console methods to capture everything in real-time
            self.driver.execute_script("""
                // Create a global console buffer for real-time capture
                window.aiConsoleBuffer = [];

                // Store original console methods
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                const originalInfo = console.info;
                const originalDebug = console.debug;

                // Override all console methods to capture messages
                console.log = function(...args) {
                    const message = args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ');
                    window.aiConsoleBuffer.push({
                        level: 'LOG',
                        message: message,
                        timestamp: Date.now()
                    });
                    return originalLog.apply(console, args);
                };

                console.error = function(...args) {
                    const message = args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ');
                    window.aiConsoleBuffer.push({
                        level: 'ERROR',
                        message: message,
                        timestamp: Date.now()
                    });
                    return originalError.apply(console, args);
                };

                console.warn = function(...args) {
                    const message = args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                    ).join(' ');
                    window.aiConsoleBuffer.push({
                        level: 'WARN',
                        message: message,
                        timestamp: Date.now()
                    });
                    return originalWarn.apply(console, args);
                };

                console.info = console.debug = console.log;

                console.log('🔧 AI-DEBUG: Real-time console capture enabled');
            """)

            # Enable verbose console logging and performance monitoring
            self.driver.execute_cdp_cmd('Log.startViolationsReport', {
                'config': [
                    {'name': 'longTask', 'threshold': 50},
                    {'name': 'longLayout', 'threshold': 30},
                    {'name': 'blockedEvent', 'threshold': 100},
                    {'name': 'blockedParser', 'threshold': -1},
                    {'name': 'handler', 'threshold': 150},
                    {'name': 'recurringHandler', 'threshold': 50},
                    {'name': 'discouragedAPIUse', 'threshold': -1}
                ]
            })

            print("  ✅ Chrome browser and console logging started")
        except Exception as e:
            raise Exception(f"Failed to start Chrome: {e}")

    def get_game_constants(self):
        """Extract game constants from the loaded game"""
        if not self.driver:
            print("  Warning: No driver available for game constants")
            return

        try:
            constants = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                if (!game) return null;

                return {
                    towerTypes: game.TOWER_TYPES || {},
                    gemTypes: game.GEM_TYPES || {},
                    gameWidth: game.GAME_WIDTH || 1200,
                    gameHeight: game.GAME_HEIGHT || 800,
                    gridCellSize: game.GRID_CELL_SIZE || 40
                };
            """)

            if constants:
                self.game_constants = constants
                print(f"  Game constants loaded: {len(constants)} properties")
            else:
                print("  Warning: Could not load game constants")

        except Exception as e:
            print(f"  Warning: Failed to extract game constants: {e}")

    def capture_console_logs(self):
        """Capture all console messages, errors, and log entries."""
        captured_logs = []

        try:
            # CRITICAL FIX: Real-time console buffer capture
            if self.driver:
                # Method 1: Get real-time console buffer
                try:
                    console_buffer = self.driver.execute_script("""
                        // Return and clear the AI console buffer
                        if (window.aiConsoleBuffer) {
                            const buffer = window.aiConsoleBuffer.slice();
                            window.aiConsoleBuffer = []; // Clear buffer
                            return buffer;
                        }
                        return [];
                    """)

                    for msg in console_buffer:
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        level = msg.get('level', 'LOG')
                        message = msg.get('message', '')
                        log_entry = f"[{timestamp}] {level}: {message}"
                        captured_logs.append(log_entry)

                        # Print to terminal in real-time
                        print(f"🔧 CONSOLE: {log_entry}")

                        # Also log to file
                        if self.log_file:
                            self.log_file.write(f"{log_entry}\n")
                            self.log_file.flush()

                except Exception as e:
                    print(f"Console buffer capture error: {e}")

                # Method 2: Standard browser logs (fallback)
                try:
                    logs = self.driver.get_log('browser')
                    for log in logs:
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        level = log.get('level', 'INFO')
                        source = log.get('source', 'console')
                        message = log.get('message', '')

                        # Format log entry
                        log_entry = f"[{timestamp}] {level}: {source} - {message}"
                        captured_logs.append(log_entry)

                        # Also log to our file immediately for real-time monitoring
                        if self.log_file:
                            self.log_file.write(f"{log_entry}\n")
                            self.log_file.flush()
                except Exception as e:
                    print(f"Browser log capture error: {e}")

                # Method 2: Get console buffer (if exists)
                try:
                    console_buffer = self.driver.execute_script("""
                        return window.consoleBuffer || [];
                    """)
                    for msg in console_buffer:
                        if self.log_file:
                            self.log_file.write(f"CONSOLE: {msg}\n")
                            self.log_file.flush()
                except Exception:
                    pass  # Console buffer may not exist yet

                # Method 3: Get performance logs for additional insights
                perf_logs = self.driver.get_log('performance')
                for log in perf_logs:
                    if log.get('message'):
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        message = log.get('message', '')
                        console_check = 'Runtime.consoleAPICalled' in message
                        if console_check or 'Console' in message:
                            log_entry = f"[{timestamp}] PERFORMANCE: {message}"
                            captured_logs.append(log_entry)
                            if self.log_file:
                                self.log_file.write(f"{log_entry}\n")
                                self.log_file.flush()

                # Method 4: Get Chrome driver logs for system-level issues
                driver_logs = self.driver.get_log('driver')
                for log in driver_logs:
                    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                    level = log.get('level', 'INFO')
                    message = log.get('message', '')

                    if level in ['WARNING', 'ERROR', 'SEVERE']:
                        log_entry = f"[{timestamp}] DRIVER-{level}: {message}"
                        captured_logs.append(log_entry)
                        if self.log_file:
                            self.log_file.write(f"{log_entry}\n")
                            self.log_file.flush()

        except Exception as e:
            error_msg = f"Error capturing console logs: {e}"
            captured_logs.append(error_msg)
            if self.log_file:
                self.log_file.write(f"{error_msg}\n")
                self.log_file.flush()

        return captured_logs

    def extract_real_game_state(self) -> Optional[RealGameState]:
        """Extract current game state from browser"""
        if not self.driver:
            print("  Warning: No driver available for game state extraction")
            return None

        try:
            game_data = self.driver.execute_script("""
                const canvas = document.getElementById('game-canvas');
                if (!canvas || !canvas.game) return null;

                const game = canvas.game;

                // Extract tower information
                const towers = [];

                // Debug: Check all possible tower locations
                console.log('AI-DEBUG: Checking tower locations...');
                console.log('AI-DEBUG: game.towers exists?', !!game.towers);
                console.log('AI-DEBUG: game.towerManager exists?',
                           !!game.towerManager);
                console.log('AI-DEBUG: game.towerManager.towers exists?',
                           !!(game.towerManager && game.towerManager.towers));

                // Setup wave event tracking if not already done
                if (!window.aiWaveTracker) {
                    window.aiWaveTracker = {
                        waveStarted: false,
                        waveCompleted: false,
                        currentWave: 1,
                        waveCountdownActive: false
                    };

                    // Import gameEvents if available
                    if (typeof gameEvents !== 'undefined') {
                        // Listen for wave events
                        gameEvents.on('waveStarted', (wave) => {
                            console.log('AI-WAVE-EVENT: Wave', wave, 'started');
                            window.aiWaveTracker.waveStarted = true;
                            window.aiWaveTracker.waveCompleted = false;
                            window.aiWaveTracker.currentWave = wave;
                            window.aiWaveTracker.waveCountdownActive = false;
                        });

                        gameEvents.on('waveCompleted', (wave) => {
                            console.log('AI-WAVE-EVENT: Wave', wave, 'completed');
                            window.aiWaveTracker.waveCompleted = true;
                            window.aiWaveTracker.waveStarted = false;
                        });

                        gameEvents.on('waveCountdownStarted', (data) => {
                            console.log('AI-WAVE-EVENT: Countdown started for wave', data.nextWave);
                            window.aiWaveTracker.waveCountdownActive = true;
                        });

                        gameEvents.on('waveCountdownUpdate', (data) => {
                            console.log('AI-WAVE-EVENT: Countdown update - time left:', data.timeLeft);
                        });

                        console.log('AI-WAVE-EVENT: Wave event listeners registered');
                    }
                }


                // Debug: Check current wave tracker state
                console.log('AI-DEBUG: Wave tracker state:', window.aiWaveTracker);

                // Try multiple possible tower storage locations
                let towerSource = null;
                if (game.towers && game.towers.length > 0) {
                    towerSource = game.towers;
                    console.log('AI-DEBUG: Using game.towers, count:',
                               game.towers.length);
                } else if (game.towerManager && game.towerManager.towers &&
                          game.towerManager.towers.length > 0) {
                    towerSource = game.towerManager.towers;
                    console.log('AI-DEBUG: Using game.towerManager.towers, count:',
                               game.towerManager.towers.length);
                } else if (game.towerManager && game.towerManager.placedTowers &&
                          game.towerManager.placedTowers.length > 0) {
                    towerSource = game.towerManager.placedTowers;
                    console.log('AI-DEBUG: Using game.towerManager.placedTowers,',
                               'count:', game.towerManager.placedTowers.length);
                }

                if (towerSource) {
                    for (const tower of towerSource) {
                        towers.push({
                            id: tower.id || Math.random(),
                            type: tower.type,
                            x: tower.x,
                            y: tower.y,
                            level: tower.level || 1,
                            gems: tower.gems || [],
                            cost: tower.cost || 0
                        });
                    }
                }

                // Extract enemy information
                const enemies = [];
                if (game.enemies) {
                    for (const enemy of game.enemies) {
                        enemies.push({
                            id: enemy.id || Math.random(),
                            type: enemy.type,
                            x: enemy.x,
                            y: enemy.y,
                            health: enemy.health,
                            maxHealth: enemy.maxHealth
                        });
                    }
                }

                // Extract available gems
                const gems = [];
                if (game.availableGems) {
                    for (const gem of game.availableGems) {
                        gems.push({
                            type: gem.type,
                            cost: gem.cost,
                            rarity: gem.rarity
                        });
                    }
                }

                // Direct wave state detection (bypass event system)
                let waveCompleted = false;
                let waveActive = false;
                let currentWaveNumber = 1;

                console.log('AI-DEBUG: Starting wave state detection...');

                // Method 1: Check WaveManager directly
                if (game.waveManager) {
                    console.log('AI-DEBUG: WaveManager found, checking state...');

                    const wm = game.waveManager;
                    currentWaveNumber = wm.currentWave || 1;
                    waveActive = wm.isWaveActive || false;

                    console.log('AI-DEBUG: WaveManager state:', {
                        currentWave: wm.currentWave,
                        isWaveActive: wm.isWaveActive,
                        isPreparingWave: wm.isPreparingWave,
                        isCountdownActive: wm.isCountdownActive,
                        enemiesSpawned: wm.enemiesSpawned,
                        enemiesInCurrentWave: wm.enemiesInCurrentWave,
                        enemiesLength: wm.enemies ? wm.enemies.length : 0
                    });

                    // Wave is completed if:
                    // 1. All enemies in wave have been spawned AND
                    // 2. No enemies are left alive AND
                    // 3. Wave is not in countdown (which means it ended)
                    const allSpawned = wm.enemiesSpawned >= wm.enemiesInCurrentWave;
                    const noEnemiesLeft = (!wm.enemies || wm.enemies.length === 0);
                    const notInCountdown = !wm.isCountdownActive;

                    waveCompleted = allSpawned && noEnemiesLeft && waveActive && notInCountdown;

                    console.log('AI-DEBUG: Wave completion check:', {
                        allSpawned: allSpawned,
                        noEnemiesLeft: noEnemiesLeft,
                        waveActive: waveActive,
                        notInCountdown: notInCountdown,
                        result: waveCompleted
                    });
                } else {
                    console.log('AI-DEBUG: No WaveManager found, using fallback detection');
                    // Fallback to old method
                    waveActive = game.waveActive || false;
                    waveCompleted = game.waveCompleted || false;
                    currentWaveNumber = game.currentWave || game.wave || 1;
                }                return {
                    wave: currentWaveNumber,
                    money: game.money || 0,
                    health: game.health || 20,
                    score: game.score || 0,
                    towers: towers,
                    enemies: enemies,
                    gems: gems,
                    fps: game.fps || 60,
                    paused: game.isPaused || false,
                    waveActive: waveActive,
                    waveCompleted: waveCompleted
                };
            """)

            if not game_data:
                return None

            return RealGameState(
                wave_number=game_data['wave'],
                money=game_data['money'],
                health=game_data['health'],
                score=game_data['score'],
                towers=game_data['towers'],
                enemies=game_data['enemies'],
                gems_available=game_data['gems'],
                fps=game_data['fps'],
                game_paused=game_data['paused'],
                wave_active=game_data['waveActive'],
                wave_completed=game_data['waveCompleted']
            )

        except Exception as e:
            print(f"  Warning: Failed to extract game state: {e}")
            return None

    def get_tower_counts_by_type(self, towers: List[Dict]) -> Dict[str, int]:
        """Count towers by type"""
        counts = {"basic": 0, "poison": 0, "splash": 0, "sniper": 0}
        for tower in towers:
            tower_type = tower.get('type', 'basic').lower()
            if tower_type in counts:
                counts[tower_type] += 1
        return counts

    def get_strategic_tower_target(self, wave: int) -> Dict[str, int]:
        """Get target tower composition for current wave"""
        if wave <= 10:
            strategy = self.strategy.WAVE_TOWER_STRATEGY
            return strategy.get(wave, strategy[10])
        else:
            # Late game scaling
            base = self.strategy.WAVE_TOWER_STRATEGY[10]
            return {
                "basic": base["basic"] + (wave - 10),
                "poison": base["poison"] + (wave - 10) // 2,
                "splash": base["splash"] + (wave - 10) // 3,
                "sniper": base["sniper"] + (wave - 10) // 4
            }

    def find_optimal_tower_position(self, tower_type: str) -> (
            Optional[Tuple[int, int]]):
        """Find optimal position using advanced AI analysis"""
        try:
            print(f"  🧠 Analyzing map for {tower_type} tower placement...")

            # CRITICAL FIX: Special logic for Toxic Spore towers
            if tower_type == 'poison':
                return self.find_toxic_spore_position()

            # Use JavaScript to perform comprehensive map analysis
            js_code = """
                // Advanced AI Tower Positioning System
                let game = null;
                let grid = null;
                let path = null;
                let towers = [];
                let enemies = [];

                // Get game state
                const canvas = document.getElementById('game-canvas');
                if (canvas && canvas.game) {
                    game = canvas.game;
                    if (game.grid) grid = game.grid;
                    if (grid && grid.path) path = grid.path;
                    if (game.towers) towers = game.towers;
                    if (game.enemies) enemies = game.enemies;
                } else if (window.game) {
                    game = window.game;
                    if (game.grid) grid = game.grid;
                    if (grid && grid.path) path = grid.path;
                    if (game.towers) towers = game.towers;
                    if (game.enemies) enemies = game.enemies;
                }

                if (!grid || !path || path.length === 0) {
                    console.log("Missing game data for AI analysis");
                    return null;
                }

                const towerType = '{tower_type}';
                const towerStats = {
                    basic: {range: 120, damage: 24, specialization: 'balanced'},
                    poison: {range: 95, damage: 16, specialization: 'economy'},
                    splash: {range: 90, damage: 20, specialization: 'crowd'},
                    sniper: {range: 160, damage: 40, specialization: 'precision'}
                };

                const stats = towerStats[towerType] || towerStats.basic;

                console.log("🧠 AI Analysis starting for", towerType, "with stats:", stats);

                // === PHASE 1: MAP ANALYSIS ===
                function analyzePathCharacteristics() {
                    const analysis = {
                        straightSections: [],
                        turns: [],
                        chokepoints: [],
                        highDensityAreas: [],
                        totalLength: 0
                    };

                    // Analyze path segments
                    for (let i = 0; i < path.length - 1; i++) {
                        const current = path[i];
                        const next = path[i + 1];

                        // Convert to world coordinates if needed
                        let currentWorld = convertToWorld(current);
                        let nextWorld = convertToWorld(next);

                        const segmentLength = distance(currentWorld, nextWorld);
                        analysis.totalLength += segmentLength;

                        // Detect straight sections (long segments)
                        if (segmentLength > 120) {
                            analysis.straightSections.push({
                                start: currentWorld,
                                end: nextWorld,
                                length: segmentLength,
                                midpoint: {
                                    x: (currentWorld.x + nextWorld.x) / 2,
                                    y: (currentWorld.y + nextWorld.y) / 2
                                }
                            });
                        }

                        // Detect turns (direction changes)
                        if (i > 0) {
                            const prev = convertToWorld(path[i - 1]);
                            const angle1 = Math.atan2(currentWorld.y - prev.y, currentWorld.x - prev.x);
                            const angle2 = Math.atan2(nextWorld.y - currentWorld.y, nextWorld.x - currentWorld.x);
                            const angleDiff = Math.abs(angle2 - angle1);

                            if (angleDiff > Math.PI / 4) { // 45+ degree turn
                                analysis.turns.push({
                                    position: currentWorld,
                                    angle: angleDiff,
                                    severity: angleDiff > Math.PI / 2 ? 'sharp' : 'moderate'
                                });
                            }
                        }
                    }

                    return analysis;
                }

                function convertToWorld(pathPoint) {
                    if (pathPoint.x < 100 && pathPoint.y < 100) {
                        return {x: pathPoint.x * 40 + 20, y: pathPoint.y * 40 + 20};
                    }
                    return {x: pathPoint.x, y: pathPoint.y};
                }

                function distance(p1, p2) {
                    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                }

                // === PHASE 2: EXISTING TOWER ANALYSIS ===
                function analyzeExistingTowers() {
                    const towerAnalysis = {
                        coverage: new Set(),
                        gaps: [],
                        overlaps: [],
                        typeDistribution: {}
                    };

                    towers.forEach(tower => {
                        const towerPos = {x: tower.x, y: tower.y};
                        const towerRange = tower.range || 120;
                        const towerType = tower.type || 'basic';

                        towerAnalysis.typeDistribution[towerType] =
                            (towerAnalysis.typeDistribution[towerType] || 0) + 1;

                        // Mark covered path segments
                        path.forEach((pathPoint, index) => {
                            const pathWorld = convertToWorld(pathPoint);
                            if (distance(towerPos, pathWorld) <= towerRange) {
                                towerAnalysis.coverage.add(index);
                            }
                        });
                    });

                    return towerAnalysis;
                }

                // === PHASE 3: STRATEGIC SCORING ===
                function calculateStrategicScore(gridX, gridY, worldPos) {
                    let score = 0;
                    let factors = {};

                    // Factor 1: Path Coverage (Base scoring)
                    let pathCoverage = 0;
                    let criticalPointsCovered = 0;

                    path.forEach((pathPoint, index) => {
                        const pathWorld = convertToWorld(pathPoint);
                        const dist = distance(worldPos, pathWorld);

                        if (dist <= stats.range) {
                            pathCoverage++;

                            // Bonus for covering critical path segments
                            if (index === 0 || index === path.length - 1) {
                                criticalPointsCovered += 2; // Start/end points
                            } else {
                                criticalPointsCovered += 1;
                            }
                        }
                    });

                    factors.pathCoverage = pathCoverage * 10;
                    score += factors.pathCoverage;

                    // Factor 2: Specialization Bonuses
                    const pathAnalysis = analyzePathCharacteristics();

                    if (stats.specialization === 'precision' && pathAnalysis.straightSections.length > 0) {
                        // Sniper towers: Prefer long sight lines
                        pathAnalysis.straightSections.forEach(section => {
                            const distToMidpoint = distance(worldPos, section.midpoint);
                            if (distToMidpoint <= stats.range) {
                                factors.sniperBonus = (factors.sniperBonus || 0) + section.length / 10;
                            }
                        });
                    }

                    if (stats.specialization === 'crowd' && pathAnalysis.turns.length > 0) {
                        // Splash towers: Prefer turns and chokepoints
                        pathAnalysis.turns.forEach(turn => {
                            const distToTurn = distance(worldPos, turn.position);
                            if (distToTurn <= stats.range) {
                                const bonus = turn.severity === 'sharp' ? 25 : 15;
                                factors.crowdBonus = (factors.crowdBonus || 0) + bonus;
                            }
                        });
                    }

                    if (stats.specialization === 'economy') {
                        // Poison towers: Prefer early path positions for maximum effect time
                        const earlyPathBonus = Math.max(0, 30 - (gridX + gridY));
                        factors.economyBonus = earlyPathBonus;
                    }

                    // Factor 3: Coverage Optimization
                    const existingAnalysis = analyzeExistingTowers();
                    let coverageGapBonus = 0;
                    let overlapPenalty = 0;

                    path.forEach((pathPoint, index) => {
                        const pathWorld = convertToWorld(pathPoint);
                        const distToNewTower = distance(worldPos, pathWorld);

                        if (distToNewTower <= stats.range) {
                            // Bonus for covering uncovered areas
                            if (!existingAnalysis.coverage.has(index)) {
                                coverageGapBonus += 15;
                            } else {
                                // Penalty for redundant coverage
                                overlapPenalty += 5;
                            }
                        }
                    });

                    factors.gapBonus = coverageGapBonus;
                    factors.overlapPenalty = -overlapPenalty;

                    // Factor 4: Position Quality
                    const centerX = (grid.width || 20) / 2;
                    const centerY = (grid.height || 15) / 2;
                    const distFromCenter = Math.sqrt(Math.pow(gridX - centerX, 2) + Math.pow(gridY - centerY, 2));
                    const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
                    factors.centralityBonus = Math.max(0, 10 - (distFromCenter / maxDist) * 10);

                    // Factor 5: Enemy Prediction
                    if (enemies.length > 0) {
                        let enemyInterceptionBonus = 0;
                        enemies.forEach(enemy => {
                            const enemyPos = {x: enemy.x, y: enemy.y};
                            const distToEnemy = distance(worldPos, enemyPos);
                            if (distToEnemy <= stats.range) {
                                enemyInterceptionBonus += 20;
                            }
                        });
                        factors.interceptionBonus = enemyInterceptionBonus;
                    }

                    // Calculate final score
                    Object.keys(factors).forEach(factor => {
                        score += factors[factor] || 0;
                    });

                    return {score, factors, pathCoverage, criticalPointsCovered};
                }

                // === PHASE 4: POSITION SEARCH ===
                let bestScore = -1;
                let bestPos = null;
                let analysisResults = [];

                console.log("🔍 Scanning", (grid.width || 20) * (grid.height || 15), "potential positions...");

                for (let x = 0; x < (grid.width || 20); x++) {
                    for (let y = 0; y < (grid.height || 15); y++) {
                        // Check if position is valid
                        let canPlace = true;
                        if (grid.canPlaceTower) {
                            canPlace = grid.canPlaceTower(x, y);
                        }

                        if (!canPlace) continue;

                        // Get world coordinates
                        let worldPos;
                        if (grid.gridToWorld) {
                            const pos = grid.gridToWorld(x, y);
                            worldPos = {x: pos.x, y: pos.y};
                        } else {
                            worldPos = {x: x * 40 + 20, y: y * 40 + 20};
                        }

                        // Calculate strategic score
                        const analysis = calculateStrategicScore(x, y, worldPos);

                        if (analysis.score > bestScore) {
                            bestScore = analysis.score;
                            bestPos = {
                                x: x,
                                y: y,
                                worldX: worldPos.x,
                                worldY: worldPos.y,
                                score: analysis.score,
                                pathCoverage: analysis.pathCoverage,
                                factors: analysis.factors,
                                criticalPoints: analysis.criticalPointsCovered
                            };
                        }

                        // Keep top 5 positions for analysis
                        analysisResults.push({
                            x, y,
                            score: analysis.score,
                            factors: analysis.factors
                        });
                    }
                }

                // Sort and show top candidates
                analysisResults.sort((a, b) => b.score - a.score);
                const top5 = analysisResults.slice(0, 5);

                console.log("🎯 Top 5 strategic positions for", towerType + ":");
                top5.forEach((pos, i) => {
                    console.log(`${i + 1}. Grid(${pos.x},${pos.y}) Score:${pos.score.toFixed(1)} Factors:`, pos.factors);
                });

                if (bestPos) {
                    console.log("🏆 Selected position:", bestPos);
                }

                return bestPos;
            """

            # Replace the tower type placeholder
            js_code = js_code.replace('{tower_type}', tower_type)
            position = self.driver.execute_script(js_code)

            if position:
                print(f"🎯 Strategic position found: grid({position['x']}, "
                      f"{position['y']}) world({position['worldX']:.0f}, {position['worldY']:.0f})")
                print(f"   📊 Score: {position['score']:.1f}, "
                      f"Path coverage: {position['pathCoverage']}, "
                      f"Critical points: {position['criticalPoints']}")

                # Show key factors that influenced the decision
                factors = position.get('factors', {})
                key_factors = []
                for factor, value in factors.items():
                    if abs(value) > 5:  # Only show significant factors
                        key_factors.append(f"{factor}: {value:.1f}")

                if key_factors:
                    print(f"   🧠 Key factors: {', '.join(key_factors)}")

                return (position['x'], position['y'])
            else:
                print("  ❌ No strategic position found")
                return None

        except Exception as e:
            print(f"  ❌ Error in AI analysis: {e}")
            return None

    def find_toxic_spore_position(self) -> Optional[Tuple[int, int]]:
        """
        CRITICAL FIX: Strategic Toxic Spore placement
        Toxic Spore towers slow enemies for other towers to finish them.
        Place them where they can slow enemies approaching tower clusters.
        """
        try:
            print("  🦠 Finding strategic Toxic Spore position...")

            # Find clusters of existing towers
            tower_clusters = self.find_tower_clusters()
            if not tower_clusters:
                print("  No tower clusters found for Toxic Spore support")
                return None

            best_position = None
            best_score = -1

            # For each tower cluster, find positions that intercept enemies
            for cluster in tower_clusters:
                support_positions = self.find_cluster_support_positions(cluster)

                for pos in support_positions:
                    score = self.calculate_toxic_spore_score(pos, cluster)
                    if score > best_score:
                        best_score = score
                        best_position = pos

            if best_position:
                print(f"  🎯 Strategic Toxic Spore position: "
                      f"grid({best_position[0]}, {best_position[1]}) "
                      f"score: {best_score:.1f}")
                return best_position
            else:
                print("  ❌ No suitable Toxic Spore position found")
                return None

        except Exception as e:
            print(f"  ❌ Error finding Toxic Spore position: {e}")
            return None

    def find_tower_clusters(self) -> List[Dict]:
        """Find clusters of towers for Toxic Spore support"""
        try:
            clusters = []

            # Get tower positions from JavaScript
            tower_data = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.towerManager) return null;

                const towers = game.towerManager.towers.map(tower => ({
                    x: tower.position.x,
                    y: tower.position.y,
                    type: tower.type,
                    range: tower.range
                }));

                return towers;
            """)

            if not tower_data:
                return clusters

            # Group towers into clusters (towers within 100 pixels)
            cluster_distance = 100
            for tower in tower_data:
                # Find existing cluster this tower belongs to
                found_cluster = None
                for cluster in clusters:
                    cluster_center = cluster['center']
                    distance = ((tower['x'] - cluster_center['x'])**2 +
                               (tower['y'] - cluster_center['y'])**2)**0.5
                    if distance <= cluster_distance:
                        found_cluster = cluster
                        break

                if found_cluster:
                    found_cluster['towers'].append(tower)
                    # Recalculate cluster center
                    total_x = sum(t['x'] for t in found_cluster['towers'])
                    total_y = sum(t['y'] for t in found_cluster['towers'])
                    count = len(found_cluster['towers'])
                    found_cluster['center'] = {
                        'x': total_x / count,
                        'y': total_y / count
                    }
                else:
                    # Create new cluster
                    clusters.append({
                        'towers': [tower],
                        'center': {'x': tower['x'], 'y': tower['y']},
                        'size': 1
                    })

            # Only keep clusters with 2+ towers
            clusters = [c for c in clusters if len(c['towers']) >= 2]

            print(f"  Found {len(clusters)} tower clusters for support")
            return clusters

        except Exception as e:
            print(f"  Error finding tower clusters: {e}")
            return []

    def find_cluster_support_positions(self, cluster: Dict) -> List[Tuple[int, int]]:
        """Find positions to place Toxic Spore to support a tower cluster"""
        try:
            positions = []

            # Get path data to find interception points
            path_data = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.grid) return null;

                return game.grid.path.map(p => ({
                    x: p.x,
                    y: p.y,
                    worldX: p.x * 40 + 20,
                    worldY: p.y * 40 + 20
                }));
            """)

            if not path_data:
                return positions

            cluster_center = cluster['center']
            poison_range = 95  # Poison tower range

            # Find path points that are approaching the cluster
            for i, path_point in enumerate(path_data[:-3]):  # Skip last 3 points
                # Check if this path point leads toward the cluster
                next_points = path_data[i+1:i+4]  # Next 3 points

                approaches_cluster = False
                for next_point in next_points:
                    current_dist = ((path_point['worldX'] - cluster_center['x'])**2 +
                                   (path_point['worldY'] - cluster_center['y'])**2)**0.5
                    next_dist = ((next_point['worldX'] - cluster_center['x'])**2 +
                                (next_point['worldY'] - cluster_center['y'])**2)**0.5

                    if next_dist < current_dist:  # Getting closer to cluster
                        approaches_cluster = True
                        break

                if approaches_cluster:
                    # Find positions around this path point within poison range
                    for offset_x in [-2, -1, 0, 1, 2]:
                        for offset_y in [-2, -1, 0, 1, 2]:
                            candidate_x = path_point['x'] + offset_x
                            candidate_y = path_point['y'] + offset_y

                            # Check if position is valid
                            valid = self.driver.execute_script(f"""
                                const game = document.getElementById('game-canvas').game;
                                if (!game || !game.grid) return false;

                                return game.grid.canPlaceTower({candidate_x}, {candidate_y});
                            """)

                            if valid:
                                positions.append((candidate_x, candidate_y))

            return positions[:10]  # Limit to top 10 candidates

        except Exception as e:
            print(f"  Error finding support positions: {e}")
            return []

    def calculate_toxic_spore_score(self, position: Tuple[int, int],
                                   cluster: Dict) -> float:
        """Calculate strategic value of Toxic Spore position"""
        try:
            grid_x, grid_y = position
            world_x, world_y = grid_x * 40 + 20, grid_y * 40 + 20

            score = 0.0
            poison_range = 95

            # Score based on path coverage (enemies to slow)
            path_coverage = self.driver.execute_script(f"""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.grid) return 0;

                let coverage = 0;
                for (const pathPoint of game.grid.path) {{
                    const pathWorldX = pathPoint.x * 40 + 20;
                    const pathWorldY = pathPoint.y * 40 + 20;
                    const distance = Math.sqrt(
                        Math.pow({world_x} - pathWorldX, 2) +
                        Math.pow({world_y} - pathWorldY, 2)
                    );
                    if (distance <= {poison_range}) {{
                        coverage++;
                    }}
                }}
                return coverage;
            """)

            score += path_coverage * 10  # 10 points per path segment covered

            # Bonus for being near the cluster (but not too close)
            cluster_center = cluster['center']
            distance_to_cluster = ((world_x - cluster_center['x'])**2 +
                                  (world_y - cluster_center['y'])**2)**0.5

            # Optimal distance: 80-120 pixels (close enough to help,
            # far enough to not overlap)
            if 80 <= distance_to_cluster <= 120:
                score += 20  # Optimal positioning bonus
            elif distance_to_cluster < 80:
                score -= 10  # Too close penalty
            elif distance_to_cluster > 200:
                score -= 15  # Too far penalty

            # Bonus based on cluster size (bigger clusters need more support)
            cluster_size = len(cluster['towers'])
            score += cluster_size * 5

            return score

        except Exception as e:
            print(f"  Error calculating Toxic Spore score: {e}")
            return 0.0

    def place_tower_strategic(self, tower_type: str,
                              game_state: RealGameState) -> bool:
        """Place a tower using optimal strategic positioning"""
        if not self.driver:
            print("  Warning: No driver available for tower placement")
            return False

        try:
            if not self.can_take_action():
                return False

            position = self.find_optimal_tower_position(tower_type)
            if not position:
                return False

            grid_x, grid_y = position

            # Place the tower using the actual game's towerManager
            success = self.driver.execute_script(f"""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.towerManager) return false;

                try {{
                    // Convert grid position to world coordinates
                    const worldPos = game.grid.gridToWorld({grid_x}, {grid_y});

                    // Enter placement mode for the tower type
                    game.towerManager.enterPlacementMode('{tower_type}');

                    // Place the tower at the world coordinates
                    const result = game.towerManager.placeTower(worldPos.x,
                                                               worldPos.y);

                    if (result) {{
                        console.log('AI-LOG: Placed {tower_type} tower at ' +
                                   'grid ({grid_x}, {grid_y}) world (' +
                                   worldPos.x + ', ' + worldPos.y + ')');
                        return true;
                    }}
                    return false;
                }} catch (error) {{
                    console.error('AI-LOG: Tower placement error:', error);
                    return false;
                }}
            """)

            if success:
                # Give the game a moment to update state after tower placement
                time.sleep(0.1)

                # Capture console logs immediately after placement
                self.capture_console_logs()

                self.record_action("place_tower", {
                    "type": tower_type,
                    "position": position,
                    "wave": game_state.wave_number,
                    "money_before": game_state.money
                })
                print(f"  ✅ Placed {tower_type} tower at {position}")
                return True
            else:
                print(f"  ❌ Failed to place {tower_type} tower at {position}")
                return False

        except Exception as e:
            print(f"  Error placing tower: {e}")
            return False

    def upgrade_tower_strategic(self, game_state: RealGameState) -> bool:
        """Upgrade towers based on human priority patterns"""
        if not self.driver:
            print("  Warning: No driver available for tower upgrades")
            return False

        try:
            if not self.can_take_action():
                return False

            # Find best tower to upgrade based on human priorities
            best_tower = None
            best_priority = -1

            for tower in game_state.towers:
                tower_type = tower.get('type', 'basic').lower()
                tower_level = tower.get('level', 1)

                if tower_level >= 3:  # Max level
                    continue

                # Calculate priority based on human preferences
                base_priority = self.strategy.UPGRADE_PRIORITIES.get(
                    tower_type, 1)

                # Prefer lower level towers for efficiency
                level_priority = (4 - tower_level) * 0.5

                total_priority = base_priority + level_priority

                if total_priority > best_priority:
                    best_priority = total_priority
                    best_tower = tower

            if not best_tower:
                return False

            # CRITICAL FIX: Proper upgrade cost validation and execution
            tower_id = best_tower.get('id')
            tower_type = best_tower.get('type', 'basic')
            current_level = best_tower.get('level', 1)

            # Calculate expected upgrade cost
            base_upgrade_costs = {
                "basic": 90, "poison": 170,
                "splash": 120, "sniper": 250
            }
            base_cost = base_upgrade_costs.get(tower_type, 90)

            if current_level == 1:
                expected_cost = base_cost
            elif current_level == 2:
                expected_cost = base_cost * 2
            else:
                return False  # Already max level

            # Check if we have enough money BEFORE attempting upgrade
            if game_state.money < expected_cost:
                print(f"  💰 Insufficient funds for {tower_type} upgrade: "
                      f"need ${expected_cost}, have ${game_state.money}")
                return False

            success = self.driver.execute_script(f"""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.towerManager) return false;

                try {{
                    // Find the tower by ID
                    const tower = game.towerManager.towers.find(
                        t => t.id === {tower_id});
                    if (!tower) {{
                        console.log('AI-LOG: Tower ID {tower_id} not found');
                        return false;
                    }}

                    // Check if tower can be upgraded
                    if (!tower.canUpgrade()) {{
                        console.log('AI-LOG: Tower cannot be upgraded');
                        return false;
                    }}

                    // Get upgrade cost before upgrading
                    const upgradeCost = tower.getUpgradeCost();
                    console.log('AI-LOG: Attempting upgrade of {tower_type}' +
                               ' tower, cost: $' + upgradeCost);

                    // Attempt the upgrade
                    const result = tower.upgrade();
                    if (result) {{
                        console.log('AI-LOG: Successfully upgraded ' +
                                   '{tower_type} tower ID {tower_id} to ' +
                                   'level ' + tower.level);
                        return true;
                    }} else {{
                        console.log('AI-LOG: Failed to upgrade {tower_type}' +
                                   ' tower ID {tower_id}');
                        return false;
                    }}
                }} catch (error) {{
                    console.error('AI-LOG: Tower upgrade error:', error);
                    return false;
                }}
            """)

            if success:
                self.record_action("upgrade_tower", {
                    "tower_id": tower_id,
                    "tower_type": best_tower.get('type'),
                    "old_level": best_tower.get('level', 1),
                    "wave": game_state.wave_number,
                    "expected_cost": expected_cost
                })
                print(f"  ✅ Successfully upgraded {tower_type} tower")
                return True
            else:
                print(f"  ❌ Failed to upgrade {tower_type} tower")
                return False

        except Exception as e:
            print(f"  Error upgrading tower: {e}")
            return False

    def socket_gem_strategic(self, game_state: RealGameState) -> bool:
        """Socket gems based on human preferences"""
        if not self.driver:
            print("  Warning: No driver available for gem socketing")
            return False

        try:
            if not self.can_take_action():
                return False

            if not game_state.gems_available:
                print("  No gems available for socketing")
                return False

            # Find best tower and gem combination
            best_combo = None
            best_value = -1

            for tower in game_state.towers:
                tower_type = tower.get('type', 'basic').lower()
                tower_gems = tower.get('gems', [])

                if len(tower_gems) >= 3:  # Tower is full
                    continue

                preferred_gems = self.strategy.GEM_PREFERENCES.get(
                    tower_type, ["damage"])

                for gem in game_state.gems_available:
                    gem_type = gem.get('type', '').lower()
                    gem_cost = gem.get('cost', 999)

                    if gem_cost > game_state.money:
                        continue

                    # Calculate value based on human preferences
                    value = 0
                    if gem_type in preferred_gems:
                        index = preferred_gems.index(gem_type)
                        value = len(preferred_gems) - index + 1

                    # Consider gem rarity
                    rarity = gem.get('rarity', 'common')
                    if rarity == 'rare':
                        value += 1
                    elif rarity == 'epic':
                        value += 2
                    elif rarity == 'legendary':
                        value += 3

                    if value > best_value:
                        best_value = value
                        best_combo = (tower, gem)

            if not best_combo:
                print("  No suitable gem/tower combinations found")
                return False

            tower, gem = best_combo
            tower_id = tower.get('id')
            gem_type = gem.get('type')
            gem_cost = gem.get('cost', 50)

            # CRITICAL FIX: Proper gem socketing implementation
            success = self.driver.execute_script(f"""
                const game = document.getElementById('game-canvas').game;
                if (!game || !game.towerManager) return false;

                try {{
                    // Find the tower by ID
                    const tower = game.towerManager.towers.find(
                        t => t.id === {tower_id});
                    if (!tower) {{
                        console.log('AI-LOG: Tower ID {tower_id} not found');
                        return false;
                    }}

                    // Check if player has enough money
                    if (game.money < {gem_cost}) {{
                        console.log('AI-LOG: Insufficient money for gem: $' +
                                   {gem_cost});
                        return false;
                    }}

                    // Find available gem slot
                    let slotIndex = -1;
                    for (let i = 0; i < tower.gemSlots; i++) {{
                        if (!tower.gems[i]) {{
                            slotIndex = i;
                            break;
                        }}
                    }}

                    if (slotIndex === -1) {{
                        console.log('AI-LOG: No empty gem slots available');
                        return false;
                    }}

                    // Try to socket the gem using game's gem system
                    if (game.GEM_TYPES && game.GEM_TYPES['{gem_type}']) {{
                        const gemData = game.GEM_TYPES['{gem_type}'];

                        // Spend money first
                        if (!game.spendMoney({gem_cost})) {{
                            console.log('AI-LOG: Failed to spend money ' +
                                       'for gem');
                            return false;
                        }}

                        // Socket the gem
                        const result = tower.socketGem(slotIndex,
                                                      '{gem_type}',
                                                      gemData);
                        if (result) {{
                            console.log('AI-LOG: Successfully socketed ' +
                                       '{gem_type} gem into tower ID ' +
                                       '{tower_id}');
                            return true;
                        }} else {{
                            // Refund money if socketing failed
                            game.addMoney({gem_cost});
                            console.log('AI-LOG: Failed to socket gem, ' +
                                       'money refunded');
                            return false;
                        }}
                    }} else {{
                        console.log('AI-LOG: Gem type {gem_type} not found ' +
                                   'in GEM_TYPES');
                        return false;
                    }}
                }} catch (error) {{
                    console.error('AI-LOG: Gem socketing error:', error);
                    return false;
                }}
            """)

            if success:
                self.record_action("socket_gem", {
                    "tower_id": tower_id,
                    "gem_type": gem_type,
                    "gem_cost": gem_cost,
                    "wave": game_state.wave_number
                })
                print(f"  ✅ Successfully socketed {gem_type} gem "
                      f"for ${gem_cost}")
                return True
            else:
                print(f"  ❌ Failed to socket {gem_type} gem")
                return False

        except Exception as e:
            print(f"  Error socketing gem: {e}")
            return False

    def start_next_wave(self, game_state: RealGameState) -> bool:
        """Start next wave when strategically appropriate"""
        if not self.driver:
            print("  Warning: No driver available for wave start")
            return False

        try:
            if not self.can_take_action():
                return False

            success = self.driver.execute_script("""
                const game = document.getElementById('game-canvas').game;
                if (!game) return false;

                try {
                    if (game.startNextWave) {
                        const result = game.startNextWave();
                        if (result) {
                            console.log('AI-LOG: Started next wave');
                            return true;
                        }
                    }
                    return false;
                } catch (error) {
                    console.error('AI-LOG: Start wave error:', error);
                    return false;
                }
            """)

            if success:
                self.record_action("start_wave", {
                    "wave": game_state.wave_number + 1
                })
                print(f"  ✅ Started wave {game_state.wave_number + 1}")
                return True
            else:
                print("  ❌ Failed to start next wave")
                return False

        except Exception as e:
            print(f"  Error starting wave: {e}")
            return False

    def make_optimal_ai_decision(self, game_state: RealGameState) -> bool:
        """
        Make strategic decisions based on optimal human patterns

        Decision priority (based on human log analysis):
        1. Build towers according to strategic composition
        2. Upgrade key towers for efficiency
        3. Socket appropriate gems
        4. Start next wave when ready
        """
        try:
            wave = game_state.wave_number
            money = game_state.money

            # CRITICAL FIX: Aggressive anti-hoarding logic
            # Never save more than max_savings threshold
            if money > self.strategy.MONEY_THRESHOLDS["max_savings"]:
                print(f"  💸 Money hoarding detected: ${money} > "
                      f"${self.strategy.MONEY_THRESHOLDS['max_savings']}")
                # Force aggressive spending on upgrades or towers

            # Get current tower composition
            current_towers = self.get_tower_counts_by_type(game_state.towers)
            target_towers = self.get_strategic_tower_target(wave)

            print(f"  Wave {wave}: Current towers {current_towers}, "
                  f"Target {target_towers}, Money ${money}")

            # Priority 1: Build towers according to strategic plan
            for tower_type, target_count in target_towers.items():
                current_count = current_towers.get(tower_type, 0)

                if current_count < target_count:
                    # Use actual tower costs from the game
                    tower_costs = {"basic": 45, "poison": 85,
                                   "splash": 60, "sniper": 125}
                    cost = tower_costs.get(tower_type, 50)

                    if money >= cost:
                        print(f"  🏗️ Building {tower_type} tower "
                              f"({current_count}/{target_count})")
                        if self.place_tower_strategic(tower_type, game_state):
                            return True
                    else:
                        print(f"  💰 Need ${cost} for {tower_type} tower, "
                              f"have ${money}")

            # Priority 2: Aggressive upgrade logic to prevent hoarding
            # CRITICAL FIX: Only upgrade during safe periods (not during waves)
            upgrade_threshold = self.strategy.MONEY_THRESHOLDS["comfortable_upgrade"]
            if (money >= upgrade_threshold and not game_state.wave_active):
                upgradeable = [t for t in game_state.towers
                               if t.get('level', 1) < 3]
                if upgradeable:
                    print(f"  ⬆️ Upgrading tower during safe period "
                          f"(${money} available)")
                    if self.upgrade_tower_strategic(game_state):
                        return True
            # ADDITIONAL: Emergency upgrade spending if hoarding too much
            max_savings = self.strategy.MONEY_THRESHOLDS["max_savings"]
            if (money > max_savings and not game_state.wave_active):
                upgradeable = [t for t in game_state.towers
                               if t.get('level', 1) < 3]
                if upgradeable:
                    print(f"  🚨 Emergency upgrade to prevent hoarding "
                          f"(${money}) - SAFE PERIOD")
                    if self.upgrade_tower_strategic(game_state):
                        return True

            # Priority 3: Socket gems if we have stable economy
            gem_threshold = self.strategy.MONEY_THRESHOLDS["gem_socketing"]
            if money >= gem_threshold and len(game_state.towers) >= 2:
                socketable_towers = [t for t in game_state.towers
                                     if len(t.get('gems', [])) < 3]
                if socketable_towers and game_state.gems_available:
                    print(f"  💎 Socketing gem (${money} available)")
                    if self.socket_gem_strategic(game_state):
                        return True

            # Priority 4: EMERGENCY TOWER BUILDING if hoarding excessively
            if money > self.strategy.MONEY_THRESHOLDS["max_savings"] + 100:
                # Build any affordable tower to prevent excessive hoarding
                for tower_type in ["basic", "splash", "poison", "sniper"]:
                    tower_costs = {"basic": 45, "poison": 85,
                                   "splash": 60, "sniper": 125}
                    cost = tower_costs.get(tower_type, 50)
                    if money >= cost:
                        print(f"  🚨 EMERGENCY: Building {tower_type} tower "
                              f"to prevent hoarding (${money})")
                        if self.place_tower_strategic(tower_type, game_state):
                            return True

            # Calculate total towers for wave progression logic
            total_towers = sum(current_towers.values())

            # Special case: Start Wave 1 manually if not started
            if (game_state.wave_number == 1 and
                    not game_state.wave_active and
                    total_towers >= target_towers["basic"]):
                print("  🌊 Manually starting Wave 1")
                if self.start_next_wave(game_state):
                    return True
            if game_state.wave_completed and not game_state.wave_active:
                # Human-like wave start timing: don't rush, but don't delay
                # Start if we have enough towers or low money
                if total_towers >= wave or money < 30:
                    towers_msg = f"ready with {total_towers} towers"
                    print(f"  🌊 Starting next wave ({towers_msg})")
                    if self.start_next_wave(game_state):
                        return True
            else:
                # Debug: Show why we're not starting the next wave
                if not game_state.wave_completed:
                    enemies_count = len(game_state.enemies)
                    active_status = game_state.wave_active
                    print(f"  🔍 DEBUG: Wave not completed yet "
                          f"(enemies: {enemies_count}, "
                          f"active: {active_status})")
                elif game_state.wave_active:
                    enemies_count = len(game_state.enemies)
                    print(f"  🔍 DEBUG: Wave still active "
                          f"(enemies: {enemies_count})")

            return False

        except Exception as e:
            print(f"  Error in decision making: {e}")
            return False

    def check_console_logs(self):
        """Capture and analyze browser console logs"""
        if not self.driver:
            print("  Warning: No driver available for console log checking")
            return

        try:
            logs = self.driver.get_log('browser')
            for log in logs:
                if log['level'] in ['SEVERE', 'WARNING']:
                    print(f"  Console {log['level']}: {log['message']}")
        except Exception as e:
            print(f"  Warning: Could not check console logs: {e}")

    async def run_optimal_ai_test(self, target_waves: int = 15,
                                  map_id: int = 0) -> TestResult:
        """Run a single game test with optimal AI"""
        print(f"🧠 Starting Optimal AI Test "
              f"(Waves 1-{target_waves})")
        print("  Strategy: Mimicking optimal human player patterns")

        # Navigate to game
        print("  Loading game in browser...")
        if not self.driver:
            raise RuntimeError("No driver available for game navigation")
        self.driver.get("http://localhost:3000")

        # Wait for game to load
        await asyncio.sleep(5)

        # Setup game state
        print("  Initializing game state...")
        self.driver.execute_script("""
            // Enable console logging for AI decisions
            window.AI_LOG_ENABLED = true;

            // CRITICAL FIX: Create console buffer for 100% message capture
            window.consoleBuffer = [];

            // Override ALL console methods to ensure capture
            const originalConsole = {
                log: console.log,
                info: console.info,
                warn: console.warn,
                error: console.error,
                debug: console.debug
            };

            ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
                console[method] = function(...args) {
                    const message = args.map(arg =>
                        typeof arg === 'object' ? JSON.stringify(arg) :
                        String(arg)
                    ).join(' ');

                    // Add to buffer for AI capture
                    window.consoleBuffer.push(
                        `${method.toUpperCase()}: ${message}`);

                    // Keep buffer from growing too large
                    if (window.consoleBuffer.length > 1000) {
                        window.consoleBuffer =
                            window.consoleBuffer.slice(-500);
                    }

                    // Call original method
                    originalConsole[method].apply(console, args);
                };
            });

            // Clear any existing state
            if (window.game) {
                window.game.reset();
            }

            console.log('AI-LOG: Optimal AI initialized with console buffer');
        """)
        await asyncio.sleep(2)

        # CRITICAL FIX: Set game speed to 2.5x for time efficiency (Issue #9)
        print("  ⚡ Setting game speed to 2.5x for time efficiency...")
        self.driver.execute_script("""
            if (window.game) {
                window.game.gameSpeed = 2.5;
                console.log('⚡ AI Testing: Game speed set to 2.5x');
            }
        """)
        await asyncio.sleep(1)

        # Handle map selection
        try:
            print(f"  Selecting map {map_id}...")
            if self.driver:
                # First, try to find the "Select Map to Start" button
                try:
                    xpath = "//button[contains(text(), 'Select Map to Start')]"
                    select_map_btn = WebDriverWait(self.driver, 10).until(
                        EC.element_to_be_clickable((By.XPATH, xpath))
                    )
                    select_map_btn.click()
                    print("  📍 Clicked 'Select Map to Start' button")
                    await asyncio.sleep(2)
                except Exception:
                    print("  ⚠️ Could not find 'Select Map to Start' button")

                # Now try to find map selection elements
                try:
                    # Wait for map selection modal or gallery
                    WebDriverWait(self.driver, 10).until(
                        EC.any_of(
                            EC.presence_of_element_located((
                                By.ID, "map-gallery-modal")),
                            EC.presence_of_element_located((
                                By.CLASS_NAME, "map-gallery")),
                            EC.presence_of_element_located((
                                By.CLASS_NAME, "map-selection"))
                        )
                    )

                    # Try different map selection strategies
                    map_selected = False

                    # Strategy 1: Look for map-card elements
                    try:
                        map_cards = self.driver.find_elements(
                            By.CLASS_NAME, "map-card")
                        if map_id < len(map_cards):
                            select_btn = map_cards[map_id].find_element(
                                By.TAG_NAME, "button")
                            select_btn.click()
                            map_selected = True
                            print(f"  ✅ Selected map {map_id} using map-card")
                    except Exception:
                        pass

                    # Strategy 2: Look for any button with map in text
                    if not map_selected:
                        try:
                            xpath = ("//button[contains(text(), 'Map') or "
                                     "contains(text(), 'Select')]")
                            map_buttons = self.driver.find_elements(
                                By.XPATH, xpath)
                            if map_id < len(map_buttons):
                                map_buttons[map_id].click()
                                map_selected = True
                                msg = f"Selected map {map_id} using map button"
                                print(f"  ✅ {msg}")
                        except Exception:
                            pass

                    # Strategy 3: Click first available map/selection button
                    if not map_selected:
                        try:
                            xpath = ("//button[not(contains(@class, "
                                     "'disabled'))]")
                            first_map_btn = self.driver.find_element(
                                By.XPATH, xpath)
                            first_map_btn.click()
                            map_selected = True
                            print("  ✅ Selected first available map")
                        except Exception:
                            pass

                    if map_selected:
                        await asyncio.sleep(2)
                    else:
                        print(f"  ⚠️ Could not select map {map_id}")

                except Exception as e:
                    print(f"  ⚠️ Error in map selection: {e}")

            else:
                print("  ⚠️ No driver available for map selection")

        except Exception as e:
            print(f"  Warning: Map selection issue: {e}")

        # Wait for game to be ready
        print("  Waiting for game to be ready...")
        for i in range(10):
            try:
                game_state = self.extract_real_game_state()
                if game_state and hasattr(game_state, 'money'):
                    print("  ✅ Game ready for optimal AI!")
                    break
                else:
                    print(f"  ⏳ Game loading... ({i + 1}/10)")
                    await asyncio.sleep(1)
            except Exception:
                await asyncio.sleep(1)
        else:
            print("  ⚠️ Game loading timeout - proceeding anyway")

        # Extract game constants
        try:
            self.get_game_constants()
            print("  ✅ Game constants loaded")
        except Exception as e:
            print(f"  ⚠️ Failed to load constants: {e}")

        # Main game loop with optimal AI
        print("  🚀 Starting optimal AI gameplay")

        start_time = time.time()
        decision_times = []
        fps_samples = []
        last_wave = 0
        towers_built = 0
        actions_taken = 0

        while True:
            # Capture console logs every iteration
            self.capture_console_logs()

            # Extract current game state
            game_state = self.extract_real_game_state()
            if not game_state:
                print("  ⚠️ Could not extract game state")
                await asyncio.sleep(0.5)
                continue

            fps_samples.append(game_state.fps)

            # Check game status
            if self.driver:
                game_status = self.driver.execute_script(
                    "return window.game ? window.game.gameState : 'loading';"
                )
            else:
                game_status = 'loading'

            if game_status == 'gameOver' or game_state.health <= 0:
                success = False
                print(f"  💀 Game Over! Final health: {game_state.health}")
                break

            if game_status == 'victory':
                success = True
                health = game_state.health
                print(f"  🎉 Victory! All waves completed with {health} health")
                break

            # Check target waves completion
            if game_state.wave_number > target_waves:
                success = True
                health = game_state.health
                print(f"  🎉 Victory! {target_waves} waves, {health} health")
                break

            # Timeout check
            elapsed = time.time() - start_time
            timeout = target_waves * 90  # 1.5 minutes per wave
            if elapsed > timeout:
                success = False
                time_msg = f"Game took {elapsed/60:.1f}m " + \
                           f"(limit: {timeout/60:.1f}m)"
                print(f"  ⏰ Timeout! {time_msg}")
                break

            # Track wave progression
            if game_state.wave_number > last_wave:
                last_wave = game_state.wave_number
                wave_info = f"Wave {game_state.wave_number} reached! " + \
                            f"Health: {game_state.health}, " + \
                            f"Money: ${game_state.money}"
                print(f"  🌊 {wave_info}")

            # Make optimal decision
            decision_start = time.time()
            action_taken = self.make_optimal_ai_decision(game_state)
            decision_time = time.time() - decision_start
            decision_times.append(decision_time)

            # Capture logs after each decision
            if action_taken:
                self.capture_console_logs()

            if action_taken:
                actions_taken += 1
                if self.decision_history:
                    last_action = self.decision_history[-1]["action"]
                    if "place_tower" == last_action:
                        towers_built += 1

            # Human-like reaction time
            await asyncio.sleep(0.2)  # 200ms between decision cycles

            # Periodic console log check
            if actions_taken % 10 == 0:
                self.check_console_logs()

        total_time = time.time() - start_time
        final_state = self.extract_real_game_state()

        # Calculate efficiency score
        efficiency = 0.0
        if towers_built > 0 and total_time > 0 and final_state:
            efficiency = (final_state.score / towers_built) / total_time

        summary = f"{actions_taken} actions, {towers_built} towers, " + \
                  f"{total_time:.1f}s"
        print(f"  📊 Test complete: {summary}")

        return TestResult(
            player_skill="Optimal AI",
            waves_completed=final_state.wave_number if final_state else 0,
            final_health=final_state.health if final_state else 0,
            final_money=final_state.money if final_state else 0,
            final_score=final_state.score if final_state else 0,
            total_time=total_time,
            success=success,
            towers_built=towers_built,
            average_fps=statistics.mean(fps_samples) if fps_samples else 60.0,
            decision_timings=decision_times,
            efficiency_score=efficiency
        )

    async def run_comprehensive_test(self, target_waves: int = 15,
                                     runs: int = 3,
                                     map_id: int = 0) -> Dict:
        """Run comprehensive testing with optimal AI"""
        print("OPTIMAL AI BALANCE TEST")
        print("=" * 60)
        print(f"Target: {target_waves} waves, {runs} runs on Map {map_id}")
        print("Strategy: Replicating optimal human player decisions")
        print()

        await self.setup_test_environment()

        all_results = []

        try:
            for run in range(runs):
                print(f"🎮 Run {run + 1}/{runs}")
                print("-" * 40)

                result = await self.run_optimal_ai_test(
                    target_waves, map_id)
                all_results.append(result)

                # Print run summary
                status = "✅ SUCCESS" if result.success else "❌ FAILED"
                print(f"  {status}: Wave {result.waves_completed}, "
                      f"Health {result.final_health}, "
                      f"Score {result.final_score}")
                print()

        finally:
            await self.cleanup()

        # Calculate aggregate statistics
        success_rate = (sum(1 for r in all_results if r.success) /
                        len(all_results))
        avg_waves = statistics.mean(r.waves_completed for r in all_results)
        avg_health = statistics.mean(r.final_health for r in all_results)
        avg_score = statistics.mean(r.final_score for r in all_results)
        avg_time = statistics.mean(r.total_time for r in all_results)
        avg_efficiency = statistics.mean(r.efficiency_score
                                         for r in all_results)
        avg_fps = statistics.mean(r.average_fps for r in all_results)

        return {
            'strategy': 'Optimal AI',
            'success_rate': success_rate,
            'avg_waves_completed': avg_waves,
            'avg_final_health': avg_health,
            'avg_final_score': avg_score,
            'avg_total_time': avg_time,
            'avg_efficiency': avg_efficiency,
            'avg_fps': avg_fps,
            'individual_results': all_results,
            'decision_history': self.decision_history
        }

    async def cleanup(self):
        """Clean up test environment"""
        print("🧹 Cleaning up test environment...")

        # Close browser
        if self.driver:
            self.driver.quit()

        # Stop docker containers
        try:
            subprocess.run(["docker-compose", "down"],
                           capture_output=True, text=True, timeout=30)
        except Exception:
            pass


async def main():
    """Main entry point for optimal AI testing"""
    # Setup logging
    log_file, log_filename = setup_logging()

    try:
        parser = argparse.ArgumentParser(
            description='Optimal AI Balance Tester - ' +
                        'Mimics optimal human gameplay'
        )
        parser.add_argument('--waves', type=int, default=15,
                            help='Target waves to complete (default: 15)')
        parser.add_argument('--runs', type=int, default=3,
                            help='Number of test runs (default: 3)')
        parser.add_argument('--map', type=int, default=0,
                            help='Map ID to test (default: 0)')

        args = parser.parse_args()

        tester = OptimalAITester(log_file)

        results = await tester.run_comprehensive_test(
            args.waves, args.runs, args.map
        )

        print("\n" + "=" * 60)
        print("OPTIMAL AI ANALYSIS")
        print("=" * 60)

        print(f"Strategy: {results['strategy']}")
        print(f"Success Rate: {results['success_rate']:.1%}")
        print(f"Average Waves: {results['avg_waves_completed']:.1f}")
        print(f"Average Health: {results['avg_final_health']:.1f}/20")
        print(f"Average Score: {results['avg_final_score']:.0f}")
        print(f"Average Time: {results['avg_total_time']:.1f}s")
        print(f"Average FPS: {results['avg_fps']:.1f}")
        print()

        # Verdict based on optimal performance
        success_rate = results['success_rate']

        print("BALANCE VERDICT:")
        if success_rate >= 0.95:
            print("🟢 GAME TOO EASY - Optimal strategies " +
                  "dominate completely")
        elif success_rate >= 0.80:
            print("🟡 ACCEPTABLE - Optimal strategies succeed " +
                  "with some challenge")
        elif success_rate >= 0.60:
            print("🟠 CHALLENGING - Even optimal play faces " +
                  "significant difficulty")
        else:
            print("🔴 GAME TOO HARD - Optimal strategies " +
                  "fail frequently")

        print(f"Optimal AI Success Rate: {success_rate:.1%}")

        # Decision analysis
        if results['decision_history']:
            action_count = len(results['decision_history'])
            print(f"\nDecision Analysis: {action_count} total actions")
            action_counts = {}
            for decision in results['decision_history']:
                action = decision['action']
                action_counts[action] = action_counts.get(action, 0) + 1

            for action, count in action_counts.items():
                print(f"  {action}: {count} times")

        print()
        print("=" * 60)
        print(f"Optimal AI Test Completed: {datetime.now()}")
        print(f"Full log saved to: {log_filename}")

        return 0

    except Exception as e:
        print(f"Test failed: {e}")
        return 1

    finally:
        if 'log_file' in locals():
            log_file.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
