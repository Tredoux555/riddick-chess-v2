const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../utils/db');

// Dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users, games, tournaments, reports] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_banned = FALSE'),
      pool.query('SELECT COUNT(*) as count FROM games'),
      pool.query('SELECT COUNT(*) as count FROM tournaments'),
      pool.query("SELECT COUNT(*) as count FROM fair_play_reports WHERE status = 'pending'")
    ]);

    const activeGames = await pool.query("SELECT COUNT(*) as count FROM games WHERE status = 'active'");
    const onlineUsers = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_online > NOW() - INTERVAL '5 minutes' AND is_banned = FALSE
    `);

    const recentSignups = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    const gamesPlayed24h = await pool.query(`
      SELECT COUNT(*) as count FROM games 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalGames: parseInt(games.rows[0].count),
      totalTournaments: parseInt(tournaments.rows[0].count),
      pendingReports: parseInt(reports.rows[0].count),
      activeGames: parseInt(activeGames.rows[0].count),
      onlineUsers: parseInt(onlineUsers.rows[0].count),
      signups24h: parseInt(recentSignups.rows[0].count),
      gamesPlayed24h: parseInt(gamesPlayed24h.rows[0].count)
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users with pagination
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, banned } = req.query;

    let query = `
      SELECT u.id, u.email, u.username, u.avatar, u.is_admin, u.is_club_member,
             u.is_banned, u.ban_reason, u.created_at, u.last_online,
             ur.blitz_rating as rating, ur.total_games
      FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    if (banned === 'true') {
      query += ` AND u.is_banned = TRUE`;
    } else if (banned === 'false') {
      query += ` AND u.is_banned = FALSE`;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ban a user
router.post('/users/:id/ban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const result = await pool.query(`
      UPDATE users SET is_banned = TRUE, ban_reason = $1 WHERE id = $2
      RETURNING id, username
    `, [reason || 'No reason provided', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User ${result.rows[0].username} has been banned` });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unban a user
router.post('/users/:id/unban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE users SET is_banned = FALSE, ban_reason = NULL WHERE id = $1
      RETURNING id, username
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User ${result.rows[0].username} has been unbanned` });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set user as admin
router.post('/users/:id/make-admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE users SET is_admin = TRUE WHERE id = $1
      RETURNING id, username
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `User ${result.rows[0].username} is now an admin` });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove admin privileges
router.post('/users/:id/remove-admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin privileges' });
    }

    const result = await pool.query(`
      UPDATE users SET is_admin = FALSE WHERE id = $1
      RETURNING id, username
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: `Admin privileges removed from ${result.rows[0].username}` });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get fair play reports
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT fpr.*,
             reporter.username as reporter_username,
             reported.username as reported_username
      FROM fair_play_reports fpr
      JOIN users reporter ON fpr.reporter_id = reporter.id
      JOIN users reported ON fpr.reported_user_id = reported.id
      WHERE fpr.status = $1
      ORDER BY fpr.created_at DESC
      LIMIT $2
    `, [status, parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Review a report
router.post('/reports/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, banUser } = req.body;

    if (!['reviewed', 'dismissed', 'actioned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE fair_play_reports
      SET status = $1, resolution = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, resolution, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Ban user if requested
    if (banUser && result.rows[0].reported_user_id) {
      await pool.query(`
        UPDATE users SET is_banned = TRUE, ban_reason = $1 WHERE id = $2
      `, [resolution || 'Fair play violation', result.rows[0].reported_user_id]);
    }

    res.json({ message: 'Report reviewed', report: result.rows[0] });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get flagged messages
router.get('/flagged-messages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT m.*, 
             sender.username as sender_username,
             recipient.username as recipient_username
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users recipient ON m.recipient_id = recipient.id
      WHERE m.is_flagged = TRUE
      ORDER BY m.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get flagged messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed puzzles (for initial setup)
router.post('/seed-puzzles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Sample puzzles for initial setup
    const puzzles = [
      { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', moves: 'h5f7', rating: 800, themes: ['mateIn1', 'backRankMate'] },
      { fen: 'r1b1k2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5', moves: 'f3g5 f8e7 g5f7', rating: 1000, themes: ['fork', 'attackingf7'] },
      { fen: 'r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/2NP1N2/PPP1BPPP/R1BQK2R w KQkq - 0 6', moves: 'e4d5 e6d5 c3d5', rating: 1100, themes: ['discoveredAttack'] },
      { fen: '2kr3r/ppp2ppp/2n1bn2/2b1p3/4P1q1/2NP1N2/PPP1BPPP/R1BQ1RK1 w - - 0 10', moves: 'f3e5 g4e2 e5c6', rating: 1200, themes: ['fork', 'royalFork'] },
      { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 2 4', moves: 'f1e2 f6g4 e1g1', rating: 900, themes: ['development', 'castling'] },
      { fen: 'rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 2 5', moves: 'c4d5 e6d5 f1d3', rating: 1000, themes: ['openingPrinciples'] },
      { fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', moves: 'e1e8', rating: 800, themes: ['mateIn1', 'backRankMate'] },
      { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', moves: 'g8f6 f3g5', rating: 950, themes: ['italianGame', 'development'] },
      { fen: 'r2q1rk1/ppp1bppp/2n1bn2/3pp3/8/1BNP1N2/PPP1QPPP/R1B2RK1 w - - 0 10', moves: 'c3d5 f6d5 e2e5', rating: 1300, themes: ['tactic', 'pin'] },
      { fen: 'r1bq1rk1/ppppbppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 6 6', moves: 'b1c3 d7d6 c1g5', rating: 1050, themes: ['development', 'pin'] }
    ];

    for (const puzzle of puzzles) {
      await pool.query(`
        INSERT INTO puzzles (fen, moves, rating, themes)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [puzzle.fen, puzzle.moves, puzzle.rating, puzzle.themes]);
    }

    res.json({ message: `Seeded ${puzzles.length} puzzles` });
  } catch (error) {
    console.error('Seed puzzles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
