const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
const path = require('path');

const GameState = require('./game-state');
const apiRoutes = require('./routes/api');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tower-defense-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class TowerDefenseServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3001;
    this.gameState = new GameState();
    this.connectedClients = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connectedClients: this.connectedClients.size
      });
    });

    // API routes
    this.app.use('/api', (req, res, next) => {
      req.app.gameState = this.gameState;
      next();
    }, apiRoutes);

    // Game state endpoint
    this.app.get('/api/game-state', (req, res) => {
      res.json({
        activeSessions: this.gameState.getActiveSessions(),
        highScores: this.gameState.getHighScores()
      });
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.originalUrl
      });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Store client information
      this.connectedClients.set(socket.id, {
        connectedAt: new Date(),
        lastActivity: new Date(),
        gameSession: null
      });

      // Game session events
      socket.on('join-game', (data) => this.handleJoinGame(socket, data));
      socket.on('leave-game', (data) => this.handleLeaveGame(socket, data));
      socket.on('game-action', (data) => this.handleGameAction(socket, data));
      socket.on('submit-score', (data) => this.handleSubmitScore(socket, data));
      socket.on('get-leaderboard', () => this.handleGetLeaderboard(socket));

      // Spectator events
      socket.on('spectate-game', (data) => this.handleSpectateGame(socket, data));
      socket.on('stop-spectating', () => this.handleStopSpectating(socket));

      // Chat events (for multiplayer features)
      socket.on('chat-message', (data) => this.handleChatMessage(socket, data));

      // Ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
        this.updateClientActivity(socket.id);
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnect(socket);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error(`Socket error for client ${socket.id}:`, error);
      });
    });

    // Periodic cleanup of inactive sessions
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Every minute
  }

  handleJoinGame(socket, data) {
    try {
      const { gameId, playerName } = data;
      const sessionId = gameId || this.generateSessionId();
      
      // Create or join game session
      const session = this.gameState.createOrJoinSession(sessionId, socket.id, playerName);
      
      // Update client info
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.gameSession = sessionId;
        client.lastActivity = new Date();
      }

      // Join socket room
      socket.join(sessionId);
      
      // Send session info back to client
      socket.emit('game-joined', {
        sessionId,
        playerCount: session.players.length,
        isHost: session.host === socket.id
      });

      // Notify other players
      socket.to(sessionId).emit('player-joined', {
        playerId: socket.id,
        playerName,
        playerCount: session.players.length
      });

      logger.info(`Player ${playerName} joined session ${sessionId}`);
    } catch (error) {
      logger.error('Error in handleJoinGame:', error);
      socket.emit('join-error', { message: 'Failed to join game' });
    }
  }

  handleLeaveGame(socket, data) {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || !client.gameSession) return;

      const sessionId = client.gameSession;
      const session = this.gameState.getSession(sessionId);
      
      if (session) {
        // Remove player from session
        this.gameState.removePlayerFromSession(sessionId, socket.id);
        
        // Leave socket room
        socket.leave(sessionId);
        
        // Notify other players
        socket.to(sessionId).emit('player-left', {
          playerId: socket.id,
          playerCount: session.players.length
        });

        // Clean up client info
        client.gameSession = null;
        
        logger.info(`Player left session ${sessionId}`);
      }
    } catch (error) {
      logger.error('Error in handleLeaveGame:', error);
    }
  }

  handleGameAction(socket, data) {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || !client.gameSession) return;

      const sessionId = client.gameSession;
      this.updateClientActivity(socket.id);

      // Process game action
      const result = this.gameState.processGameAction(sessionId, socket.id, data);
      
      if (result.success) {
        // Broadcast action to spectators
        socket.to(sessionId).emit('game-action-broadcast', {
          playerId: socket.id,
          action: data,
          timestamp: new Date()
        });
      }

      socket.emit('game-action-result', result);
    } catch (error) {
      logger.error('Error in handleGameAction:', error);
      socket.emit('game-action-result', { success: false, error: 'Action failed' });
    }
  }

  handleSubmitScore(socket, data) {
    try {
      const { score, wave, gameTime, playerName } = data;
      
      // Validate score data
      if (!this.isValidScore(score, wave, gameTime)) {
        socket.emit('score-rejected', { reason: 'Invalid score data' });
        return;
      }

      // Save high score
      const scoreEntry = {
        playerName: playerName || 'Anonymous',
        score,
        wave,
        gameTime,
        timestamp: new Date(),
        playerId: socket.id
      };

      const savedScore = this.gameState.saveHighScore(scoreEntry);
      
      socket.emit('score-submitted', { 
        saved: savedScore,
        ranking: this.gameState.getPlayerRanking(score)
      });

      // Broadcast new high score if it made the leaderboard
      if (savedScore) {
        this.io.emit('new-high-score', {
          playerName: scoreEntry.playerName,
          score,
          ranking: this.gameState.getPlayerRanking(score)
        });
      }

      logger.info(`Score submitted: ${playerName} - ${score} points`);
    } catch (error) {
      logger.error('Error in handleSubmitScore:', error);
      socket.emit('score-error', { message: 'Failed to submit score' });
    }
  }

  handleGetLeaderboard(socket) {
    try {
      const leaderboard = this.gameState.getHighScores();
      socket.emit('leaderboard', leaderboard);
    } catch (error) {
      logger.error('Error in handleGetLeaderboard:', error);
      socket.emit('leaderboard-error', { message: 'Failed to get leaderboard' });
    }
  }

  handleSpectateGame(socket, data) {
    try {
      const { sessionId } = data;
      const session = this.gameState.getSession(sessionId);
      
      if (!session) {
        socket.emit('spectate-error', { message: 'Game session not found' });
        return;
      }

      // Join as spectator
      socket.join(`${sessionId}-spectators`);
      
      // Update client info
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.gameSession = `${sessionId}-spectator`;
      }

      socket.emit('spectate-started', {
        sessionId,
        playerCount: session.players.length
      });

      logger.info(`Client ${socket.id} started spectating session ${sessionId}`);
    } catch (error) {
      logger.error('Error in handleSpectateGame:', error);
      socket.emit('spectate-error', { message: 'Failed to spectate game' });
    }
  }

  handleStopSpectating(socket) {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || !client.gameSession || !client.gameSession.includes('spectator')) return;

      const sessionId = client.gameSession.replace('-spectator', '');
      socket.leave(`${sessionId}-spectators`);
      
      client.gameSession = null;
      
      socket.emit('spectate-stopped');
      logger.info(`Client ${socket.id} stopped spectating`);
    } catch (error) {
      logger.error('Error in handleStopSpectating:', error);
    }
  }

  handleChatMessage(socket, data) {
    try {
      const client = this.connectedClients.get(socket.id);
      if (!client || !client.gameSession) return;

      const { message, playerName } = data;
      
      // Basic message validation
      if (!message || message.length > 200) return;
      
      this.updateClientActivity(socket.id);

      const chatData = {
        playerId: socket.id,
        playerName: playerName || 'Anonymous',
        message: message.trim(),
        timestamp: new Date()
      };

      // Broadcast to session
      this.io.to(client.gameSession).emit('chat-message', chatData);
      
      logger.info(`Chat message in ${client.gameSession}: ${playerName} - ${message}`);
    } catch (error) {
      logger.error('Error in handleChatMessage:', error);
    }
  }

  handleDisconnect(socket) {
    try {
      const client = this.connectedClients.get(socket.id);
      
      if (client && client.gameSession) {
        // Handle game session cleanup
        this.handleLeaveGame(socket, {});
      }

      // Remove client
      this.connectedClients.delete(socket.id);
    } catch (error) {
      logger.error('Error in handleDisconnect:', error);
    }
  }

  updateClientActivity(socketId) {
    const client = this.connectedClients.get(socketId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  cleanupInactiveSessions() {
    try {
      const now = new Date();
      const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

      // Clean up inactive clients
      for (const [socketId, client] of this.connectedClients.entries()) {
        if (now - client.lastActivity > maxInactiveTime) {
          logger.info(`Cleaning up inactive client: ${socketId}`);
          this.connectedClients.delete(socketId);
        }
      }

      // Clean up empty game sessions
      this.gameState.cleanupEmptySessions();
    } catch (error) {
      logger.error('Error in cleanupInactiveSessions:', error);
    }
  }

  generateSessionId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  isValidScore(score, wave, gameTime) {
    // Basic validation - you might want to add more sophisticated checks
    return (
      typeof score === 'number' && score >= 0 && score <= 1000000 &&
      typeof wave === 'number' && wave >= 1 && wave <= 50 &&
      typeof gameTime === 'number' && gameTime >= 0 && gameTime <= 7200 // Max 2 hours
    );
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`Tower Defense server running on port ${this.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  }
}

// Create and start server
const server = new TowerDefenseServer();
server.start();

module.exports = TowerDefenseServer;
