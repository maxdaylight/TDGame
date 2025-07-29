const express = require('express');
const router = express.Router();

// Mock game state for API routes
let gameStateInstance = null;

// Middleware to get game state instance
router.use((req, res, next) => {
  // This would be injected by the main server
  gameStateInstance = req.app.gameState;
  next();
});

// Get server statistics
router.get('/stats', (req, res) => {
  try {
    const stats = gameStateInstance ? gameStateInstance.getStatistics() : {
      totalHighScores: 0,
      activeSessions: 0,
      dailySubmissions: 0,
      weeklySubmissions: 0,
      topScore: 0,
      averageScore: 0,
      totalPlayers: 0
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = gameStateInstance ? 
      gameStateInstance.getHighScores(limit) : [];

    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Get active game sessions
router.get('/sessions', (req, res) => {
  try {
    const sessions = gameStateInstance ? 
      gameStateInstance.getActiveSessions() : [];

    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
});

// Submit score (alternative to socket.io)
router.post('/submit-score', (req, res) => {
  try {
    const { playerName, score, wave, gameTime } = req.body;

    // Validate required fields
    if (!playerName || typeof score !== 'number' || typeof wave !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: playerName, score, wave'
      });
    }

    // Validate score ranges
    if (score < 0 || score > 1000000 || wave < 1 || wave > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score or wave values'
      });
    }

    const scoreEntry = {
      playerName: playerName.trim().slice(0, 50), // Limit name length
      score,
      wave,
      gameTime: gameTime || 0,
      timestamp: new Date(),
      source: 'api'
    };

    if (gameStateInstance) {
      const saved = gameStateInstance.saveHighScore(scoreEntry);
      const ranking = gameStateInstance.getPlayerRanking(score);

      res.json({
        success: true,
        data: {
          saved,
          ranking,
          score: scoreEntry
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Game state not available'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to submit score'
    });
  }
});

// Get player ranking
router.get('/ranking/:score', (req, res) => {
  try {
    const score = parseInt(req.params.score);
    
    if (isNaN(score)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid score parameter'
      });
    }

    const ranking = gameStateInstance ? 
      gameStateInstance.getPlayerRanking(score) : null;

    if (ranking !== null) {
      res.json({
        success: true,
        data: {
          score,
          ranking
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Game state not available'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get player ranking'
    });
  }
});

// Game configuration endpoint
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxPlayers: 100,
      maxSessionTime: 7200, // 2 hours
      scoreValidation: {
        maxScore: 1000000,
        maxWave: 50,
        maxGameTime: 7200
      },
      features: {
        multiplayer: true,
        spectating: true,
        chat: true,
        leaderboard: true
      }
    }
  });
});

// Server info endpoint
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      serverName: 'Mushroom Revolution Tower Defense',
      version: '1.0.0',
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date()
    }
  });
});

// Export data (admin endpoint)
router.post('/export', async (req, res) => {
  try {
    // In a real application, you'd want authentication here
    const authToken = req.headers.authorization;
    if (authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (gameStateInstance) {
      const exportPath = await gameStateInstance.exportData();
      res.json({
        success: true,
        data: {
          exportPath,
          message: 'Data exported successfully'
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Game state not available'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// Health check for API specifically
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    api: 'operational',
    gameState: gameStateInstance ? 'available' : 'unavailable',
    timestamp: new Date()
  });
});

module.exports = router;
