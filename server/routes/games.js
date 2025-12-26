const express = require('express');
const router = express.Router();
const { Chess } = require('chess.js');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const pool = require('../utils/db');
const ratingService = require('../services/ratingService');

// Get user's games
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT g.*,
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE (g.white_player_id = $1 OR g.black_player_id = $1)
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      query += ` AND g.status = $${params.length}`;
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get my games error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active games for user
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*,
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE (g.white_player_id = $1 OR g.black_player_id = $1)
      AND g.status = 'active'
      ORDER BY g.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific game
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*,
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar,
             (SELECT COUNT(*) FROM game_spectators WHERE game_id = g.id) as spectator_count
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE g.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];

    // Add player perspective if authenticated
    if (req.user) {
      game.myColor = game.white_player_id === req.user.id ? 'w' : 
                     game.black_player_id === req.user.id ? 'b' : null;
    }

    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new game (for custom games/challenges)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { opponentId, timeControl = 600, increment = 0, rated = true, color = 'random' } = req.body;

    if (!opponentId) {
      return res.status(400).json({ error: 'Opponent ID is required' });
    }

    // Determine colors
    let whiteId, blackId;
    if (color === 'white') {
      whiteId = req.user.id;
      blackId = opponentId;
    } else if (color === 'black') {
      whiteId = opponentId;
      blackId = req.user.id;
    } else {
      // Random
      if (Math.random() < 0.5) {
        whiteId = req.user.id;
        blackId = opponentId;
      } else {
        whiteId = opponentId;
        blackId = req.user.id;
      }
    }

    const result = await pool.query(`
      INSERT INTO games (white_player_id, black_player_id, time_control, increment, white_time_remaining, black_time_remaining, rated)
      VALUES ($1, $2, $3, $4, $3, $3, $5)
      RETURNING *
    `, [whiteId, blackId, timeControl, increment, rated]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game PGN
router.get('/:id/pgn', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.pgn, g.result, g.created_at,
             w.username as white_username,
             b.username as black_username
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE g.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];
    const date = new Date(game.created_at);
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

    // Build proper PGN with headers
    const pgn = `[Event "Riddick Chess Game"]
[Site "Riddick Chess"]
[Date "${dateStr}"]
[White "${game.white_username || 'Unknown'}"]
[Black "${game.black_username || 'Unknown'}"]
[Result "${game.result || '*'}"]

${game.pgn || ''}`;

    res.type('text/plain').send(pgn);
  } catch (error) {
    console.error('Get PGN error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get live games (for spectating)
router.get('/live/all', optionalAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await pool.query(`
      SELECT g.*,
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar,
             COALESCE(wr.blitz_rating, 1500) as white_rating,
             COALESCE(br.blitz_rating, 1500) as black_rating,
             (SELECT COUNT(*) FROM game_spectators WHERE game_id = g.id) as spectator_count
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      LEFT JOIN user_ratings wr ON w.id = wr.user_id
      LEFT JOIN user_ratings br ON b.id = br.user_id
      WHERE g.status = 'active'
      ORDER BY (COALESCE(wr.blitz_rating, 1500) + COALESCE(br.blitz_rating, 1500)) / 2 DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get live games error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get featured game (highest rated active game)
router.get('/live/featured', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*,
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar,
             COALESCE(wr.blitz_rating, 1500) as white_rating,
             COALESCE(br.blitz_rating, 1500) as black_rating,
             (SELECT COUNT(*) FROM game_spectators WHERE game_id = g.id) as spectator_count
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      LEFT JOIN user_ratings wr ON w.id = wr.user_id
      LEFT JOIN user_ratings br ON b.id = br.user_id
      WHERE g.status = 'active' AND g.tournament_id IS NOT NULL
      ORDER BY (COALESCE(wr.blitz_rating, 1500) + COALESCE(br.blitz_rating, 1500)) / 2 DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Fallback to any active game
      const fallback = await pool.query(`
        SELECT g.*,
               w.username as white_username, w.avatar as white_avatar,
               b.username as black_username, b.avatar as black_avatar
        FROM games g
        LEFT JOIN users w ON g.white_player_id = w.id
        LEFT JOIN users b ON g.black_player_id = b.id
        WHERE g.status = 'active'
        LIMIT 1
      `);
      
      if (fallback.rows.length === 0) {
        return res.status(404).json({ error: 'No active games' });
      }
      
      return res.json(fallback.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get featured game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analyze a game position
router.post('/:id/analyze', authenticateToken, async (req, res) => {
  try {
    const { fen, depth = 15 } = req.body;

    // For now, just validate the position
    // In production, you'd integrate with Stockfish.js or an external engine API
    const chess = new Chess(fen);
    
    const legalMoves = chess.moves({ verbose: true });
    
    res.json({
      fen,
      legalMoves: legalMoves.map(m => ({
        san: m.san,
        uci: m.from + m.to + (m.promotion || ''),
        from: m.from,
        to: m.to
      })),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      turn: chess.turn()
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Report a game
router.post('/:id/report', authenticateToken, async (req, res) => {
  try {
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Get the opponent
    const game = await pool.query(`
      SELECT white_player_id, black_player_id FROM games WHERE id = $1
    `, [req.params.id]);

    if (game.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const reportedUserId = game.rows[0].white_player_id === req.user.id 
      ? game.rows[0].black_player_id 
      : game.rows[0].white_player_id;

    await pool.query(`
      INSERT INTO fair_play_reports (reporter_id, reported_user_id, game_id, reason, details)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.user.id, reportedUserId, req.params.id, reason, details]);

    res.json({ message: 'Report submitted for review' });
  } catch (error) {
    console.error('Report game error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
