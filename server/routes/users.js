const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const pool = require('../utils/db');
const ratingService = require('../services/ratingService');

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT id, username, avatar, is_club_member,
             (SELECT blitz_rating FROM user_ratings WHERE user_id = users.id) as rating
      FROM users
      WHERE username ILIKE $1 AND id != $2 AND is_banned = FALSE
      ORDER BY username
      LIMIT $3
    `, [`%${q}%`, req.user.id, parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar, u.is_club_member, u.is_admin, u.created_at, u.last_online,
             ur.*
      FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE u.id = $1 AND u.is_banned = FALSE
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get recent games
    const games = await pool.query(`
      SELECT g.id, g.result, g.result_reason, g.time_control, g.created_at,
             w.username as white_username, b.username as black_username,
             g.white_player_id, g.black_player_id
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE (g.white_player_id = $1 OR g.black_player_id = $1) AND g.status = 'completed'
      ORDER BY g.created_at DESC
      LIMIT 10
    `, [userId]);

    // Get puzzle stats
    const puzzleStats = await pool.query(`
      SELECT rating, puzzles_solved, best_streak, puzzle_rush_best
      FROM user_puzzle_ratings
      WHERE user_id = $1
    `, [userId]);

    // Get achievement count
    const achievements = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(a.points), 0) as points
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
    `, [userId]);

    // Check friendship status if authenticated
    let friendshipStatus = null;
    if (req.user && req.user.id !== userId) {
      const friendship = await pool.query(`
        SELECT * FROM friendships
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      `, [req.user.id, userId]);
      
      if (friendship.rows.length > 0) {
        friendshipStatus = friendship.rows[0];
      }
    }

    res.json({
      ...user,
      recentGames: games.rows,
      puzzleStats: puzzleStats.rows[0] || null,
      achievementStats: achievements.rows[0],
      friendshipStatus,
      isOnline: new Date(user.last_online) > new Date(Date.now() - 5 * 60 * 1000)
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's ratings
router.get('/:id/ratings', optionalAuth, async (req, res) => {
  try {
    const ratings = await ratingService.getAllRatings(req.params.id);
    
    if (!ratings) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(ratings);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's game history
router.get('/:id/games', optionalAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0, result } = req.query;

    let query = `
      SELECT g.*, 
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE (g.white_player_id = $1 OR g.black_player_id = $1) AND g.status = 'completed'
    `;
    const params = [req.params.id];

    if (result) {
      // Filter by result (win/loss/draw from user's perspective)
      if (result === 'win') {
        query += ` AND ((g.white_player_id = $1 AND g.result = '1-0') OR (g.black_player_id = $1 AND g.result = '0-1'))`;
      } else if (result === 'loss') {
        query += ` AND ((g.white_player_id = $1 AND g.result = '0-1') OR (g.black_player_id = $1 AND g.result = '1-0'))`;
      } else if (result === 'draw') {
        query += ` AND g.result = '1/2-1/2'`;
      }
    }

    query += ` ORDER BY g.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const games = await pool.query(query, params);
    res.json(games.rows);
  } catch (error) {
    console.error('Get user games error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get online users
router.get('/status/online', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar
      FROM users u
      WHERE u.last_online > NOW() - INTERVAL '5 minutes'
      AND u.is_banned = FALSE
      AND u.id != $1
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
