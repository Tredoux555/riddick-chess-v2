/**
 * Socket.io Handler
 * Manages real-time chess games, spectating, matchmaking, and chat
 */

const { Chess } = require('chess.js');
const pool = require('../utils/db');
const ratingService = require('../services/ratingService');
const achievementService = require('../services/achievementService');
const tournamentService = require('../services/tournamentService');

// Active games in memory
const activeGames = new Map();
// Matchmaking queues by time control
const matchmakingQueues = new Map();
// User socket mappings
const userSockets = new Map();
// Spectators per game
const gameSpectators = new Map();

class GameState {
  constructor(gameData) {
    this.id = gameData.id;
    this.whiteId = gameData.white_player_id;
    this.blackId = gameData.black_player_id;
    this.chess = new Chess(gameData.fen || undefined);
    this.timeControl = gameData.time_control * 1000;
    this.increment = (gameData.increment || 0) * 1000;
    this.whiteTime = gameData.white_time_remaining ? gameData.white_time_remaining * 1000 : this.timeControl;
    this.blackTime = gameData.black_time_remaining ? gameData.black_time_remaining * 1000 : this.timeControl;
    this.lastMoveTime = Date.now();
    this.timerInterval = null;
    this.status = gameData.status || 'active';
    this.tournamentId = gameData.tournament_id || gameData.tournamentId;
    this.rated = gameData.rated !== false;
    this.drawOffer = null; // 'w' or 'b' if draw offered
    this.disconnectedPlayer = null;
    this.disconnectTimeout = null;
  }

  startClock() {
    if (this.timerInterval) return;
    
    this.lastMoveTime = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastMoveTime;
      const turn = this.chess.turn();
      
      if (turn === 'w') {
        this.whiteTime -= elapsed;
        if (this.whiteTime <= 0) {
          this.whiteTime = 0;
          this.endGame('0-1', 'timeout');
        }
      } else {
        this.blackTime -= elapsed;
        if (this.blackTime <= 0) {
          this.blackTime = 0;
          this.endGame('1-0', 'timeout');
        }
      }
      
      this.lastMoveTime = Date.now();
    }, 100);
  }

  stopClock() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  makeMove(move) {
    const turn = this.chess.turn();
    
    try {
      const result = this.chess.move(move);
      if (!result) return { valid: false, error: 'Invalid move' };

      // Add increment to player who just moved
      if (turn === 'w') {
        this.whiteTime += this.increment;
      } else {
        this.blackTime += this.increment;
      }
      
      this.lastMoveTime = Date.now();
      this.drawOffer = null; // Cancel any draw offer on move

      // Check for game over conditions
      if (this.chess.isGameOver()) {
        let gameResult, reason;
        
        if (this.chess.isCheckmate()) {
          gameResult = turn === 'w' ? '1-0' : '0-1';
          reason = 'checkmate';
        } else if (this.chess.isStalemate()) {
          gameResult = '1/2-1/2';
          reason = 'stalemate';
        } else if (this.chess.isThreefoldRepetition()) {
          gameResult = '1/2-1/2';
          reason = 'repetition';
        } else if (this.chess.isInsufficientMaterial()) {
          gameResult = '1/2-1/2';
          reason = 'insufficient_material';
        } else if (this.chess.isDraw()) {
          gameResult = '1/2-1/2';
          reason = 'fifty_moves';
        }
        
        return {
          valid: true,
          move: result,
          gameOver: true,
          result: gameResult,
          reason
        };
      }

      return {
        valid: true,
        move: result,
        gameOver: false
      };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  async endGame(result, reason) {
    this.stopClock();
    this.status = 'completed';

    // Save to database
    await pool.query(`
      UPDATE games SET
        status = 'completed',
        result = $1,
        result_reason = $2,
        pgn = $3,
        fen = $4,
        white_time_remaining = $5,
        black_time_remaining = $6,
        completed_at = NOW()
      WHERE id = $7
    `, [result, reason, this.chess.pgn(), this.chess.fen(), 
        Math.floor(this.whiteTime / 1000), Math.floor(this.blackTime / 1000), this.id]);

    // Update tournament FIRST (before rating changes)
    if (this.tournamentId) {
      try {
        await tournamentService.recordResult(this.tournamentId, this.id, result);
        console.log(`Tournament ${this.tournamentId} result recorded: ${result}`);
      } catch (err) {
        console.error('Failed to record tournament result:', err);
      }
    }

    // Update ratings if rated game
    if (this.rated && result !== '*') {
      const ratingChanges = await ratingService.updateRatings(
        this.whiteId, 
        this.blackId, 
        result, 
        this.timeControl / 1000
      );

      // Update game with rating info
      await pool.query(`
        UPDATE games SET
          white_rating_before = $1,
          white_rating_after = $2,
          black_rating_before = $3,
          black_rating_after = $4
        WHERE id = $5
      `, [ratingChanges.white.before, ratingChanges.white.after,
          ratingChanges.black.before, ratingChanges.black.after, this.id]);

      // Check achievements
      const winnerId = result === '1-0' ? this.whiteId : result === '0-1' ? this.blackId : null;
      if (winnerId) {
        await achievementService.checkGameAchievements(winnerId, result, {
          checkmate: reason === 'checkmate',
          moveCount: this.chess.history().length,
          isBackRankMate: this.isBackRankMate()
        });
      }

      return ratingChanges;
    }

    return null;
  }

  isBackRankMate() {
    if (!this.chess.isCheckmate()) return false;
    const turn = this.chess.turn();
    const kingSquare = this.findKing(turn);
    if (!kingSquare) return false;
    
    // Check if king is on back rank
    const rank = turn === 'w' ? '1' : '8';
    return kingSquare[1] === rank;
  }

  findKing(color) {
    const board = this.chess.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === color) {
          const file = String.fromCharCode(97 + j);
          const rank = 8 - i;
          return file + rank;
        }
      }
    }
    return null;
  }

  getState() {
    return {
      id: this.id,
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      turn: this.chess.turn(),
      whiteTime: Math.max(0, Math.floor(this.whiteTime)),
      blackTime: Math.max(0, Math.floor(this.blackTime)),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      status: this.status,
      drawOffer: this.drawOffer,
      history: this.chess.history({ verbose: true }),
      whiteId: this.whiteId,
      blackId: this.blackId,
      tournamentId: this.tournamentId
    };
  }
}

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    let userId = null;

    // Authenticate socket connection
    socket.on('authenticate', async (token) => {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        userSockets.set(userId, socket.id);
        
        // Update user online status
        await pool.query('UPDATE users SET last_online = NOW() WHERE id = $1', [userId]);
        
        socket.emit('authenticated', { success: true });
        
        // Notify friends of online status
        broadcastOnlineStatus(io, userId, true);
        
        // Send list of currently online friends to this user
        const friends = await pool.query(`
          SELECT CASE 
            WHEN user_id = $1 THEN friend_id 
            ELSE user_id 
          END as friend_id
          FROM friendships
          WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'
        `, [userId]);
        
        const onlineFriendIds = friends.rows
          .map(r => r.friend_id)
          .filter(friendId => userSockets.has(friendId));
        
        socket.emit('friends:online', { friendIds: onlineFriendIds });
      } catch (error) {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    // ========================================
    // GAME EVENTS
    // ========================================

    socket.on('game:join', async ({ gameId }) => {
      if (!userId) return socket.emit('error', { message: 'Not authenticated' });

      gameId = Number(gameId);
      const roomName = `game:${gameId}`;
      socket.join(roomName);
      
      // Debug: show all sockets in room
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log(`User ${userId} joined room ${roomName} - total sockets in room: ${room ? room.size : 0}`);

      // Check if game is in memory, if not load it
      if (!activeGames.has(gameId)) {
        const result = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if (result.rows.length === 0) {
          return socket.emit('error', { message: 'Game not found' });
        }
        
        const gameData = result.rows[0];
        
        // Check if this is a tournament game
        const tournamentCheck = await pool.query(
          'SELECT tournament_id FROM tournament_pairings WHERE game_id = $1 LIMIT 1',
          [gameId]
        );
        if (tournamentCheck.rows.length > 0) {
          gameData.tournament_id = tournamentCheck.rows[0].tournament_id;
        }
        
        if (gameData.status === 'completed') {
          return socket.emit('game:state', { ...gameData, completed: true });
        }
        
        activeGames.set(gameId, new GameState(gameData));
      }

      const game = activeGames.get(gameId);
      
      // Start clock if both players connected
      const isPlayer = userId === game.whiteId || userId === game.blackId;
      if (isPlayer) {
        // Handle reconnection
        if (game.disconnectedPlayer === userId) {
          clearTimeout(game.disconnectTimeout);
          game.disconnectedPlayer = null;
          
          // Notify opponent that player reconnected
          io.to(roomName).emit('game:opponent_reconnected');
          console.log(`User ${userId} reconnected to game ${gameId}`);
        }
        
        // Check if opponent is connected
        const opponentId = userId === game.whiteId ? game.blackId : game.whiteId;
        const opponentSocketId = userSockets.get(opponentId);
        if (opponentSocketId && io.sockets.sockets.get(opponentSocketId)) {
          game.startClock();
        }
      }

      socket.emit('game:state', game.getState());
    });

    socket.on('game:move', async ({ gameId, move }) => {
      console.log('=== MOVE RECEIVED ===', { userId, gameId, move });
      
      if (!userId) {
        console.log('Move rejected: no userId');
        return;
      }

      const game = activeGames.get(Number(gameId));
      if (!game) {
        console.log('Move rejected: game not found in activeGames. Keys:', [...activeGames.keys()]);
        return socket.emit('error', { message: 'Game not found' });
      }

      // Verify it's this player's turn
      const turn = game.chess.turn();
      const isWhite = userId === game.whiteId;
      const isBlack = userId === game.blackId;
      
      console.log('Turn check:', { turn, userId, whiteId: game.whiteId, blackId: game.blackId, isWhite, isBlack });
      
      if ((turn === 'w' && !isWhite) || (turn === 'b' && !isBlack)) {
        console.log('Move rejected: not your turn');
        return socket.emit('error', { message: 'Not your turn' });
      }

      const result = game.makeMove(move);
      console.log('Move result:', result);
      
      if (!result.valid) {
        return socket.emit('game:move:invalid', { error: result.error });
      }

      // Broadcast move to all in game room
      const roomName = `game:${gameId}`;
      console.log('Broadcasting move to room:', roomName);
      io.to(roomName).emit('game:moved', {
        move: result.move,
        fen: game.chess.fen(),
        turn: game.chess.turn(),
        whiteTime: game.whiteTime,
        blackTime: game.blackTime,
        isCheck: game.chess.isCheck()
      });

      // Handle game over
      if (result.gameOver) {
        const ratingChanges = await game.endGame(result.result, result.reason);
        
        io.to(`game:${gameId}`).emit('game:over', {
          result: result.result,
          reason: result.reason,
          ratingChanges
        });
        
        activeGames.delete(gameId);
      }
    });

    socket.on('game:resign', async ({ gameId }) => {
      if (!userId) return;

      const game = activeGames.get(gameId);
      if (!game) return;

      const isWhite = userId === game.whiteId;
      const result = isWhite ? '0-1' : '1-0';
      
      const ratingChanges = await game.endGame(result, 'resignation');
      
      io.to(`game:${gameId}`).emit('game:over', {
        result,
        reason: 'resignation',
        ratingChanges
      });
      
      activeGames.delete(gameId);
    });

    socket.on('game:draw:offer', ({ gameId }) => {
      if (!userId) return;

      const game = activeGames.get(gameId);
      if (!game) return;

      const color = userId === game.whiteId ? 'w' : 'b';
      game.drawOffer = color;

      io.to(`game:${gameId}`).emit('game:draw:offered', { by: color });
    });

    socket.on('game:draw:accept', async ({ gameId }) => {
      if (!userId) return;

      const game = activeGames.get(gameId);
      if (!game || !game.drawOffer) return;

      // Verify opponent is accepting
      const myColor = userId === game.whiteId ? 'w' : 'b';
      if (game.drawOffer === myColor) return; // Can't accept own offer

      const ratingChanges = await game.endGame('1/2-1/2', 'draw_agreement');
      
      io.to(`game:${gameId}`).emit('game:over', {
        result: '1/2-1/2',
        reason: 'draw_agreement',
        ratingChanges
      });
      
      activeGames.delete(gameId);
    });

    socket.on('game:draw:decline', ({ gameId }) => {
      if (!userId) return;

      const game = activeGames.get(gameId);
      if (!game) return;

      game.drawOffer = null;
      io.to(`game:${gameId}`).emit('game:draw:declined');
    });

    // ========================================
    // SPECTATOR EVENTS
    // ========================================

    socket.on('spectate:join', async ({ gameId }) => {
      socket.join(`game:${gameId}`);
      
      // Track spectator
      if (!gameSpectators.has(gameId)) {
        gameSpectators.set(gameId, new Set());
      }
      gameSpectators.get(gameId).add(socket.id);

      // Record in database if user is authenticated
      if (userId) {
        await pool.query(`
          INSERT INTO game_spectators (game_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (game_id, user_id) DO NOTHING
        `, [gameId, userId]);
      }

      // Send current game state
      const game = activeGames.get(gameId);
      if (game) {
        socket.emit('game:state', {
          ...game.getState(),
          spectating: true,
          spectatorCount: gameSpectators.get(gameId).size
        });
      }

      // Broadcast spectator count
      io.to(`game:${gameId}`).emit('spectators:update', {
        count: gameSpectators.get(gameId).size
      });
    });

    socket.on('spectate:leave', ({ gameId }) => {
      socket.leave(`game:${gameId}`);
      
      if (gameSpectators.has(gameId)) {
        gameSpectators.get(gameId).delete(socket.id);
        io.to(`game:${gameId}`).emit('spectators:update', {
          count: gameSpectators.get(gameId).size
        });
      }
    });

    // ========================================
    // MATCHMAKING
    // ========================================

    socket.on('matchmaking:join', async ({ timeControl }) => {
      if (!userId) return;

      // Get user's rating for this time control
      const rating = await ratingService.getUserRating(userId, timeControl);

      const queueKey = `tc_${timeControl}`;
      if (!matchmakingQueues.has(queueKey)) {
        matchmakingQueues.set(queueKey, []);
      }

      const queue = matchmakingQueues.get(queueKey);
      
      // Remove if already in queue
      const existingIndex = queue.findIndex(p => p.userId === userId);
      if (existingIndex >= 0) {
        queue.splice(existingIndex, 1);
      }

      // Add to queue
      queue.push({
        userId,
        socketId: socket.id,
        rating: rating.rating,
        joinedAt: Date.now()
      });

      socket.emit('matchmaking:joined', { position: queue.length });

      // Try to find a match
      await tryMatch(io, queueKey, timeControl);
    });

    socket.on('matchmaking:leave', () => {
      if (!userId) return;

      // Remove from all queues
      for (const [key, queue] of matchmakingQueues) {
        const index = queue.findIndex(p => p.userId === userId);
        if (index >= 0) {
          queue.splice(index, 1);
        }
      }

      socket.emit('matchmaking:left');
    });

    // ========================================
    // CHALLENGE SYSTEM
    // ========================================

    socket.on('challenge:send', async ({ opponentId, timeControl, rated = true }) => {
      if (!userId) return;

      // Convert to number to match userSockets keys
      const oppId = Number(opponentId);
      const opponentSocketId = userSockets.get(oppId);
      
      console.log('Challenge send:', { from: userId, to: oppId, socketId: opponentSocketId, allSockets: [...userSockets.keys()] });
      
      if (!opponentSocketId) {
        return socket.emit('challenge:error', { message: 'Opponent is offline' });
      }

      const user = await pool.query('SELECT username, avatar FROM users WHERE id = $1', [userId]);
      
      io.to(opponentSocketId).emit('challenge:received', {
        from: {
          id: userId,
          username: user.rows[0].username,
          avatar: user.rows[0].avatar
        },
        timeControl,
        rated
      });

      socket.emit('challenge:sent', { to: oppId });
    });

    socket.on('challenge:accept', async ({ challengerId, timeControl, rated }) => {
      console.log('=== CHALLENGE ACCEPT RECEIVED ===');
      console.log('From userId:', userId);
      console.log('ChallengerID:', challengerId, 'Type:', typeof challengerId);
      console.log('TimeControl:', timeControl, 'Rated:', rated);
      
      if (!userId) {
        console.log('ERROR: No userId - not authenticated');
        return;
      }

      // Convert to number
      const challId = Number(challengerId);
      console.log('Converted challId:', challId);

      // Randomly assign colors - one player white, the other black
      const whitePlayer = Math.random() < 0.5 ? challId : userId;
      const blackPlayer = whitePlayer === challId ? userId : challId;
      console.log('White:', whitePlayer, 'Black:', blackPlayer);

      try {
        // Create the game
        const game = await pool.query(`
          INSERT INTO games (white_player_id, black_player_id, time_control, white_time_remaining, black_time_remaining, rated)
          VALUES ($1, $2, $3, $3, $3, $4)
          RETURNING id
        `, [whitePlayer, blackPlayer, timeControl, rated]);

        const gameId = game.rows[0].id;
        console.log('Game created with ID:', gameId);

        // Notify both players
        const challengerSocketId = userSockets.get(challId);
        console.log('Challenger socket ID:', challengerSocketId);
        console.log('All userSockets:', [...userSockets.entries()]);
        
        if (challengerSocketId) {
          console.log('Emitting challenge:accepted to challenger');
          io.to(challengerSocketId).emit('challenge:accepted', { gameId });
        } else {
          console.log('WARNING: Challenger socket not found!');
        }
        
        console.log('Emitting challenge:accepted to accepter (self)');
        socket.emit('challenge:accepted', { gameId });
        console.log('=== CHALLENGE ACCEPT COMPLETE ===');
      } catch (error) {
        console.error('Error creating game:', error);
        socket.emit('challenge:error', { message: 'Failed to create game' });
      }
    });

    socket.on('challenge:decline', ({ challengerId }) => {
      const challId = Number(challengerId);
      const challengerSocketId = userSockets.get(challId);
      if (challengerSocketId) {
        io.to(challengerSocketId).emit('challenge:declined');
      }
    });

    // ========================================
    // CHAT
    // ========================================

    socket.on('chat:message', async ({ gameId, content }) => {
      if (!userId) {
        console.log('Chat rejected: no userId');
        return;
      }
      if (!content || !content.trim()) {
        console.log('Chat rejected: empty content');
        return;
      }

      const gId = Number(gameId);
      
      console.log('Chat message from user', userId, 'in game', gId, ':', content);
      
      // Check for bad words (simple filter)
      const filtered = filterBadWords(content);
      const isFlagged = filtered !== content;

      try {
        // Get both player IDs from database
        const result = await pool.query(
          'SELECT white_player_id, black_player_id FROM games WHERE id = $1',
          [gId]
        );
        
        if (result.rows.length === 0) {
          console.log('Chat: game not found', gId);
          return;
        }
        
        const { white_player_id, black_player_id } = result.rows[0];
        const recipientId = userId === white_player_id ? black_player_id : white_player_id;

        // Get IP address
        const ipAddress = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || 
                          socket.handshake.address || 
                          'unknown';

        // Save to database with IP
        await pool.query(`
          INSERT INTO messages (sender_id, receiver_id, game_id, content, ip_address)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, recipientId, gId, filtered, ipAddress]);

        const messageData = {
          from: userId,
          content: filtered,
          timestamp: Date.now()
        };

        // Send to BOTH players directly via their sockets
        const whiteSocketId = userSockets.get(white_player_id);
        const blackSocketId = userSockets.get(black_player_id);
        
        console.log('Sending chat to white socket:', whiteSocketId, 'black socket:', blackSocketId);
        
        if (whiteSocketId) {
          io.to(whiteSocketId).emit('chat:message', messageData);
        }
        if (blackSocketId) {
          io.to(blackSocketId).emit('chat:message', messageData);
        }
        
        console.log('Chat message sent to both players');
      } catch (error) {
        console.error('Chat error:', error);
      }
    });

    // ========================================
    // CLUB CHAT
    // ========================================

    socket.on('club:join', async () => {
      if (!userId) return;
      
      // Check if user is club member
      const user = await pool.query('SELECT is_club_member FROM users WHERE id = $1', [userId]);
      if (!user.rows[0]?.is_club_member) {
        return socket.emit('error', { message: 'Not a club member' });
      }
      
      socket.join('club-chat');
      console.log(`User ${userId} joined club chat`);
    });

    socket.on('club:leave', () => {
      socket.leave('club-chat');
      console.log(`User ${userId} left club chat`);
    });

    socket.on('club:message', async ({ message }) => {
      if (!userId) return;
      
      // Verify club membership
      const user = await pool.query('SELECT is_club_member, username, avatar FROM users WHERE id = $1', [userId]);
      if (!user.rows[0]?.is_club_member) {
        return socket.emit('error', { message: 'Not a club member' });
      }
      
      if (!message || message.trim().length === 0 || message.length > 500) {
        return;
      }
      
      try {
        // Save to database
        const result = await pool.query(`
          INSERT INTO club_chat (user_id, message)
          VALUES ($1, $2)
          RETURNING id, created_at
        `, [userId, message.trim()]);
        
        const messageData = {
          id: result.rows[0].id,
          user_id: userId,
          username: user.rows[0].username,
          avatar: user.rows[0].avatar,
          message: message.trim(),
          created_at: result.rows[0].created_at
        };
        
        // Broadcast to all club members
        io.to('club-chat').emit('club:message', messageData);
      } catch (error) {
        console.error('Club chat error:', error);
      }
    });

    // ========================================
    // DISCONNECT HANDLING
    // ========================================

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (userId) {
        userSockets.delete(userId);
        
        // Update online status
        await pool.query('UPDATE users SET last_online = NOW() WHERE id = $1', [userId]);
        broadcastOnlineStatus(io, userId, false);

        // Handle active games
        for (const [gameId, game] of activeGames) {
          if (game.whiteId === userId || game.blackId === userId) {
            game.disconnectedPlayer = userId;
            
            // Wait 3 seconds before notifying - player might just be refreshing
            setTimeout(() => {
              // Check if still disconnected (didn't reconnect quickly)
              if (game.disconnectedPlayer === userId) {
                io.to(`game:${gameId}`).emit('game:opponent_disconnected', {
                  reconnectWindow: 60
                });
                console.log(`User ${userId} disconnected from game ${gameId} - notified opponent`);
              }
            }, 3000);
            
            // Set timeout for abandonment (60 seconds)
            game.disconnectTimeout = setTimeout(async () => {
              // Make sure they're still disconnected
              if (game.disconnectedPlayer !== userId) return;
              
              const result = userId === game.whiteId ? '0-1' : '1-0';
              const ratingChanges = await game.endGame(result, 'abandonment');
              
              io.to(`game:${gameId}`).emit('game:over', {
                result,
                reason: 'abandonment',
                ratingChanges
              });
              
              activeGames.delete(gameId);
            }, 60000);
          }
        }

        // Remove from matchmaking
        for (const [key, queue] of matchmakingQueues) {
          const index = queue.findIndex(p => p.userId === userId);
          if (index >= 0) {
            queue.splice(index, 1);
          }
        }

        // Remove from spectators
        for (const [gameId, spectators] of gameSpectators) {
          if (spectators.has(socket.id)) {
            spectators.delete(socket.id);
            io.to(`game:${gameId}`).emit('spectators:update', {
              count: spectators.size
            });
          }
        }
      }
    });
  });
}

// Helper: Try to match players in queue
async function tryMatch(io, queueKey, timeControl) {
  const queue = matchmakingQueues.get(queueKey);
  if (!queue || queue.length < 2) return;

  // Simple matching: pair closest ratings
  queue.sort((a, b) => a.rating - b.rating);

  // Find best pair (closest ratings)
  let bestPair = null;
  let bestDiff = Infinity;

  for (let i = 0; i < queue.length - 1; i++) {
    const diff = Math.abs(queue[i].rating - queue[i + 1].rating);
    // Also consider wait time (expand range over time)
    const waitBonus = Math.min((Date.now() - queue[i].joinedAt) / 10000, 200);
    const effectiveDiff = diff - waitBonus;
    
    if (effectiveDiff < bestDiff) {
      bestDiff = effectiveDiff;
      bestPair = [queue[i], queue[i + 1]];
    }
  }

  if (bestPair && (bestDiff < 300 || queue[0].joinedAt < Date.now() - 30000)) {
    // Create game
    const [player1, player2] = bestPair;
    
    // Random colors
    const whitePlayer = Math.random() < 0.5 ? player1 : player2;
    const blackPlayer = whitePlayer === player1 ? player2 : player1;

    const game = await pool.query(`
      INSERT INTO games (white_player_id, black_player_id, time_control, white_time_remaining, black_time_remaining, rated)
      VALUES ($1, $2, $3, $3, $3, TRUE)
      RETURNING id
    `, [whitePlayer.userId, blackPlayer.userId, timeControl]);

    const gameId = game.rows[0].id;

    // Remove from queue
    queue.splice(queue.indexOf(player1), 1);
    queue.splice(queue.indexOf(player2), 1);

    // Notify players
    io.to(player1.socketId).emit('matchmaking:found', { 
      gameId, 
      color: player1 === whitePlayer ? 'w' : 'b',
      opponent: {
        id: player2.userId,
        rating: player2.rating
      }
    });
    
    io.to(player2.socketId).emit('matchmaking:found', { 
      gameId, 
      color: player2 === whitePlayer ? 'w' : 'b',
      opponent: {
        id: player1.userId,
        rating: player1.rating
      }
    });
  }
}

// Helper: Broadcast online status to friends
async function broadcastOnlineStatus(io, oduserId, isOnline) {
  const friends = await pool.query(`
    SELECT CASE 
      WHEN user_id = $1 THEN friend_id 
      ELSE user_id 
    END as friend_id
    FROM friendships
    WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'
  `, [oduserId]);

  for (const row of friends.rows) {
    const friendSocketId = userSockets.get(row.friend_id);
    if (friendSocketId) {
      io.to(friendSocketId).emit('friend:status', {
        userId: oduserId,
        isOnline
      });
    }
  }
}

// Helper: Simple bad word filter
function filterBadWords(text) {
  const badWords = ['fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'crap'];
  let filtered = text;
  for (const word of badWords) {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  return filtered;
}

module.exports = { initializeSocket, activeGames, userSockets };
