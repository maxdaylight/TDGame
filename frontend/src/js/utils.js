// Utils.js - Utility functions and helpers
export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }

    distance(other) {
        return this.subtract(other).magnitude();
    }

    static lerp(a, b, t) {
        return new Vector2(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t
        );
    }
}

export class GameMath {
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    static easeInOut(t) {
        return t * t * (3.0 - 2.0 * t);
    }

    static randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    static radToDeg(radians) {
        return radians * (180 / Math.PI);
    }
}

export class Timer {
    constructor(duration, callback, autoStart = false) {
        this.duration = duration;
        this.callback = callback;
        this.elapsed = 0;
        this.isRunning = autoStart;
        this.isCompleted = false;
    }

    start() {
        this.isRunning = true;
        this.isCompleted = false;
        this.elapsed = 0;
    }

    stop() {
        this.isRunning = false;
    }

    reset() {
        this.elapsed = 0;
        this.isCompleted = false;
    }

    update(deltaTime) {
        if (!this.isRunning || this.isCompleted) return;

        this.elapsed += deltaTime;
        if (this.elapsed >= this.duration) {
            this.isCompleted = true;
            this.isRunning = false;
            if (this.callback) {
                this.callback();
            }
        }
    }

    getProgress() {
        return GameMath.clamp(this.elapsed / this.duration, 0, 1);
    }
}

export class Pathfinding {
    static findPath(grid, start, end) {
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        gScore.set(this.positionKey(start), 0);
        fScore.set(this.positionKey(start), this.heuristic(start, end));

        while (openSet.length > 0) {
            // Find node with lowest f score
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(this.positionKey(openSet[i])) < fScore.get(this.positionKey(current))) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            // Remove current from open set
            openSet.splice(currentIndex, 1);

            // Check if we reached the goal
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }

            // Check neighbors
            const neighbors = this.getNeighbors(grid, current);
            for (const neighbor of neighbors) {
                const tentativeGScore = gScore.get(this.positionKey(current)) + 1;
                const neighborKey = this.positionKey(neighbor);

                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));

                    if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return []; // No path found
    }

    static getNeighbors(grid, pos) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 1, y: 0 },  // Right
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }  // Left
        ];

        for (const dir of directions) {
            const newPos = { x: pos.x + dir.x, y: pos.y + dir.y };
            if (this.isValidPosition(grid, newPos)) {
                neighbors.push(newPos);
            }
        }

        return neighbors;
    }

    static isValidPosition(grid, pos) {
        return pos.x >= 0 && pos.x < grid.width &&
               pos.y >= 0 && pos.y < grid.height &&
               grid.isWalkable(pos.x, pos.y);
    }

    static heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    static reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(this.positionKey(current))) {
            current = cameFrom.get(this.positionKey(current));
            path.unshift(current);
        }
        return path;
    }

    static positionKey(pos) {
        return `${pos.x},${pos.y}`;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 200; // CRITICAL FIX: Limit particle count
        this.particlePool = []; // Object pooling for performance
        this.batchRenderThreshold = 50; // Batch render when > 50 particles
    }

    addParticle(config) {
        // PERFORMANCE FIX: Use object pooling
        let particle = this.particlePool.pop();
        
        if (!particle) {
            particle = {
                position: new Vector2(0, 0),
                velocity: new Vector2(0, 0),
                life: 0,
                maxLife: 0,
                size: 0,
                color: '',
                gravity: 0,
                fadeOut: true
            };
        }
        
        // Reset particle properties
        particle.position.x = config.x;
        particle.position.y = config.y;
        particle.velocity.x = GameMath.randomRange(-config.spread, config.spread);
        particle.velocity.y = GameMath.randomRange(-config.spread, config.spread);
        particle.life = config.life || 1.0;
        particle.maxLife = config.life || 1.0;
        particle.size = config.size || 4;
        particle.color = config.color || '#ffffff';
        particle.gravity = config.gravity || 0;
        particle.fadeOut = config.fadeOut !== false;
        
        // PERFORMANCE FIX: Remove oldest particles if at limit
        if (this.particles.length >= this.maxParticles) {
            const oldParticle = this.particles.shift();
            this.particlePool.push(oldParticle);
        }
        
        this.particles.push(particle);
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.position = particle.position.add(particle.velocity.multiply(deltaTime));
            particle.velocity.y += particle.gravity * deltaTime;
            particle.life -= deltaTime;

            if (particle.life <= 0) {
                // Return particle to pool
                const removedParticle = this.particles.splice(i, 1)[0];
                this.particlePool.push(removedParticle);
            }
        }
    }

    render(ctx) {
        if (this.particles.length === 0) return;
        
        // PERFORMANCE FIX: Batch rendering for many particles
        if (this.particles.length > this.batchRenderThreshold) {
            this.batchRender(ctx);
        } else {
            this.individualRender(ctx);
        }
    }
    
    batchRender(ctx) {
        // Group particles by color for batch rendering
        const colorGroups = new Map();
        
        for (const particle of this.particles) {
            const alpha = particle.fadeOut ? particle.life / particle.maxLife : 1;
            const colorKey = `${particle.color}-${Math.floor(alpha * 10)}`;
            
            if (!colorGroups.has(colorKey)) {
                colorGroups.set(colorKey, []);
            }
            colorGroups.get(colorKey).push(particle);
        }
        
        // Render each color group in batch
        ctx.save();
        for (const [colorKey, particles] of colorGroups) {
            const alpha = parseInt(colorKey.split('-')[1]) / 10;
            const color = colorKey.split('-')[0];
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            
            ctx.beginPath();
            for (const particle of particles) {
                ctx.moveTo(particle.position.x + particle.size, particle.position.y);
                ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        ctx.restore();
    }
    
    individualRender(ctx) {
        for (const particle of this.particles) {
            const alpha = particle.fadeOut ? particle.life / particle.maxLife : 1;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    clear() {
        // Return all particles to pool
        while (this.particles.length > 0) {
            this.particlePool.push(this.particles.pop());
        }
    }
    
    destroy() {
        this.clear();
        this.particlePool = [];
    }
}

export class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.isMuted = false;
    }

    loadSound(name, src) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        this.sounds.set(name, audio);
        return audio;
    }

    playSound(name, volume = 1.0) {
        if (this.isMuted) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = volume * this.sfxVolume;
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    }

    playMusic(name, loop = true) {
        if (this.isMuted) return;
        
        const music = this.sounds.get(name);
        if (music) {
            music.loop = loop;
            music.volume = this.musicVolume;
            music.play().catch(e => console.log('Music play failed:', e));
        }
    }

    stopSound(name) {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    setMasterVolume(volume) {
        this.musicVolume = volume;
        this.sfxVolume = volume;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

export class GameGrid {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cells = Array(width).fill().map(() => Array(height).fill(0));
        this.path = [];
    }

    worldToGrid(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.cellSize),
            y: Math.floor(worldY / this.cellSize)
        };
    }

    gridToWorld(gridX, gridY) {
        return new Vector2(
            gridX * this.cellSize + this.cellSize / 2,
            gridY * this.cellSize + this.cellSize / 2
        );
    }

    isValidGridPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    isWalkable(x, y) {
        if (!this.isValidGridPosition(x, y)) return false;
        return this.cells[x][y] === 0 || this.cells[x][y] === 2; // 0 = empty, 2 = path
    }

    canPlaceTower(x, y) {
        console.log(`🚨 UTILS.JS GameGrid.canPlaceTower() CALLED for grid(${x}, ${y})`);
        
        if (!this.isValidGridPosition(x, y)) return false;
        
        // Get the actual cell value
        const cellValue = this.cells[x][y];
        
        // CRITICAL DEBUG: Log detailed placement info
        console.log(`🔍 TOWER PLACEMENT CHECK at grid(${x}, ${y})`);
        console.log(`   Cell value: ${cellValue} (0=empty, 1=tower, 2=path, 3=blocked)`);
        console.log(`   Grid size: ${this.width}x${this.height}, path length: ${this.path.length}`);
        
        // Log first few path points for debugging
        if (this.path.length > 0) {
            console.log(`   Path sample:`, this.path.slice(0, 3));
        }
        
        // Can only place towers on completely empty cells (value 0)
        if (cellValue !== 0) {
            console.log(`❌ PLACEMENT BLOCKED: Cell value ${cellValue} at (${x}, ${y})`);
            return false;
        }
        
        console.log(`✅ PLACEMENT ALLOWED: Empty cell at (${x}, ${y})`);
        return true;
    }

    placeTower(x, y) {
        if (this.canPlaceTower(x, y)) {
            this.cells[x][y] = 1; // 1 = tower
            return true;
        }
        return false;
    }

    removeTower(x, y) {
        if (this.isValidGridPosition(x, y) && this.cells[x][y] === 1) {
            this.cells[x, y] = 0;
            return true;
        }
        return false;
    }

    setPath(path) {
        console.log(`🛤️ SETTING PATH: ${path.length} points`);
        
        // Clear old path
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.cells[x][y] === 2) {
                    this.cells[x][y] = 0;
                }
            }
        }

        // Set new path
        this.path = path;
        let pathCellsMarked = 0;
        
        for (const point of path) {
            console.log(`   Path point: (${point.x}, ${point.y})`);
            if (this.isValidGridPosition(point.x, point.y)) {
                this.cells[point.x][point.y] = 2;
                pathCellsMarked++;
                console.log(`   ✅ Marked cell (${point.x}, ${point.y}) as path (value 2)`);
            } else {
                console.log(`   ❌ Invalid grid position: (${point.x}, ${point.y})`);
            }
        }
        
        console.log(`🛤️ PATH SET COMPLETE: ${pathCellsMarked}/${path.length} cells marked`);
    }
}

export class AnimationController {
    constructor() {
        this.animations = new Map();
    }

    createAnimation(name, frames, duration, loop = true) {
        this.animations.set(name, {
            frames,
            duration,
            loop,
            currentFrame: 0,
            elapsed: 0,
            frameTime: duration / frames.length
        });
    }

    updateAnimation(name, deltaTime) {
        const anim = this.animations.get(name);
        if (!anim) return null;

        anim.elapsed += deltaTime;
        
        if (anim.elapsed >= anim.frameTime) {
            anim.elapsed = 0;
            anim.currentFrame++;
            
            if (anim.currentFrame >= anim.frames.length) {
                if (anim.loop) {
                    anim.currentFrame = 0;
                } else {
                    anim.currentFrame = anim.frames.length - 1;
                }
            }
        }

        return anim.frames[anim.currentFrame];
    }

    resetAnimation(name) {
        const anim = this.animations.get(name);
        if (anim) {
            anim.currentFrame = 0;
            anim.elapsed = 0;
        }
    }
}

// Event system for game-wide communication
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, ...args) {
        if (this.events.has(event)) {
            for (const callback of this.events.get(event)) {
                callback(...args);
            }
        }
    }
}

// Global event emitter instance
export const gameEvents = new EventEmitter();
