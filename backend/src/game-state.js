const fs = require('fs').promises;
const path = require('path');

class GameState {
  constructor() {
    this.activeSessions = new Map();
    this.highScores = [];
    this.dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
    this.highScoresFile = path.join(this.dataDir, 'highscores.json');
    this.maxHighScores = 100;
    
    this.initializeStorage();
  }

  async initializeStorage() {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load existing high scores
      await this.loadHighScores();
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  async loadHighScores() {
    try {
      const data = await fs.readFile(this.highScoresFile, 'utf8');
      this.highScores = JSON.parse(data);
      console.log(`Loaded ${this.highScores.length} high scores`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading high scores:', error);
      }
      // File doesn't exist yet, start with empty array
      this.highScores = [];
    }
  }

  async saveHighScores() {
    try {
      await fs.writeFile(
        this.highScoresFile,
        JSON.stringify(this.highScores, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving high scores:', error);
    }
  }

  createOrJoinSession(sessionId, playerId, playerName) {
    if (!this.activeSessions.has(sessionId)) {
      // Create new session
      this.activeSessions.set(sessionId, {
        id: sessionId,
        host: playerId,
        players: [],
        createdAt: new Date(),
        lastActivity: new Date(),
        gameData: {}
      });
    }

    const session = this.activeSessions.get(sessionId);
    
    // Add player if not already in session
    const existingPlayer = session.players.find(p => p.id === playerId);
    if (!existingPlayer) {
      session.players.push({
        id: playerId,
        name: playerName,
        joinedAt: new Date()
      });
    }

    session.lastActivity = new Date();
    return session;
  }

  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  removePlayerFromSession(sessionId, playerId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Remove player
    session.players = session.players.filter(p => p.id !== playerId);
    
    // If host left, assign new host
    if (session.host === playerId && session.players.length > 0) {
      session.host = session.players[0].id;
    }

    // Remove session if empty
    if (session.players.length === 0) {
      this.activeSessions.delete(sessionId);
    } else {
      session.lastActivity = new Date();
    }

    return true;
  }

  processGameAction(sessionId, playerId, action) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const player = session.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not in session' };
    }

    // Update session activity
    session.lastActivity = new Date();

    // Store action in game data (for spectators/replay)
    if (!session.gameData.actions) {
      session.gameData.actions = [];
    }

    session.gameData.actions.push({
      playerId,
      action,
      timestamp: new Date()
    });

    // Keep only last 1000 actions to prevent memory issues
    if (session.gameData.actions.length > 1000) {
      session.gameData.actions = session.gameData.actions.slice(-1000);
    }

    return { success: true };
  }

  saveHighScore(scoreEntry) {
    // Check if this score qualifies for the leaderboard
    const wouldMakeLeaderboard = 
      this.highScores.length < this.maxHighScores ||
      scoreEntry.score > this.highScores[this.highScores.length - 1]?.score;

    if (!wouldMakeLeaderboard) {
      return false;
    }

    // Add score to list
    this.highScores.push({
      ...scoreEntry,
      id: this.generateScoreId(),
      submittedAt: new Date()
    });

    // Sort by score (descending)
    this.highScores.sort((a, b) => b.score - a.score);

    // Keep only top scores
    this.highScores = this.highScores.slice(0, this.maxHighScores);

    // Save to file
    this.saveHighScores();

    return true;
  }

  getHighScores(limit = 10) {
    return this.highScores.slice(0, limit).map((score, index) => ({
      rank: index + 1,
      playerName: score.playerName,
      score: score.score,
      wave: score.wave,
      gameTime: score.gameTime,
      submittedAt: score.submittedAt
    }));
  }

  getPlayerRanking(score) {
    const betterScores = this.highScores.filter(s => s.score > score);
    return betterScores.length + 1;
  }

  getActiveSessions() {
    return Array.from(this.activeSessions.values()).map(session => ({
      id: session.id,
      playerCount: session.players.length,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    }));
  }

  cleanupEmptySessions() {
    const now = new Date();
    const maxInactiveTime = 60 * 60 * 1000; // 1 hour

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.players.length === 0 || 
          (now - session.lastActivity) > maxInactiveTime) {
        this.activeSessions.delete(sessionId);
        console.log(`Cleaned up inactive session: ${sessionId}`);
      }
    }
  }

  generateScoreId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Statistics and analytics
  getStatistics() {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const recentScores = this.highScores.filter(
      score => new Date(score.submittedAt) > oneDayAgo
    );

    const weeklyScores = this.highScores.filter(
      score => new Date(score.submittedAt) > oneWeekAgo
    );

    return {
      totalHighScores: this.highScores.length,
      activeSessions: this.activeSessions.size,
      dailySubmissions: recentScores.length,
      weeklySubmissions: weeklyScores.length,
      topScore: this.highScores.length > 0 ? this.highScores[0].score : 0,
      averageScore: this.calculateAverageScore(),
      totalPlayers: this.getUniquePlayers().length
    };
  }

  calculateAverageScore() {
    if (this.highScores.length === 0) return 0;
    
    const sum = this.highScores.reduce((total, score) => total + score.score, 0);
    return Math.round(sum / this.highScores.length);
  }

  getUniquePlayers() {
    const uniquePlayers = new Set();
    this.highScores.forEach(score => uniquePlayers.add(score.playerName));
    return Array.from(uniquePlayers);
  }

  // Export/Import functionality for backups
  async exportData() {
    const data = {
      highScores: this.highScores,
      activeSessions: Array.from(this.activeSessions.entries()),
      exportedAt: new Date(),
      version: '1.0'
    };

    const filename = `backup_${Date.now()}.json`;
    const filepath = path.join(this.dataDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }

  async importData(filepath) {
    try {
      const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
      
      if (data.version === '1.0') {
        this.highScores = data.highScores || [];
        // Don't import active sessions as they would be stale
        
        await this.saveHighScores();
        return true;
      }
      
      throw new Error('Unsupported backup version');
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

module.exports = GameState;
