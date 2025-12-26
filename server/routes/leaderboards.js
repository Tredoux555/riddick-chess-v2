const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../utils/db');
const ratingService = require('../services/ratingService');

// Get rating leaderboard by time control
router.get('/ratings/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 50 } = req.query;

    const validCategories = ['bullet', 'blitz', 'rapid', 'classical'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const result = await pool.query(`
      SELECT * FROM leaderboard_${category} LIMIT $1
    `, [parseInt(limit)]);

    // Get user's rank
    let userRank = null;
    if (req.user) {
      const userResult = await pool.query(`
        SELECT rank FROM (
          SELECT user_id, RANK() OVER (ORDER BY ${category}_rating DESC) as rank
          FROM user_ratings
          WHERE ${category}_games >= 10
        ) ranked
        WHERE user_id = $1
      `, [req.user.id]);
      
      if (userResult.rows.length > 0) {
        userRank = parseInt(userResult.rows[0].rank);
      }
    }

    res.json({
      leaderboard: result.rows,
      userRank,
      category
    });
  } catch (error) {
    console.error('Get rating leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get puzzle leaderboard
router.get('/puzzles', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT * FROM leaderboard_puzzles LIMIT $1
    `, [parseInt(limit)]);

    // Get user's rank
    let userRank = null;
    if (req.user) {
      const userResult = await pool.query(`
        SELECT rank FROM (
          SELECT user_id, RANK() OVER (ORDER BY rating DESC) as rank
          FROM user_puzzle_ratings
          WHERE puzzles_solved >= 20
        ) ranked
        WHERE user_id = $1
      `, [req.user.id]);
      
      if (userResult.rows.length > 0) {
        userRank = parseInt(userResult.rows[0].rank);
      }
    }

    res.json({
      leaderboard: result.rows,
      userRank
    });
  } catch (error) {
    console.error('Get puzzle leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Puzzle Rush leaderboard
router.get('/puzzle-rush', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar, upr.puzzle_rush_best as score,
             RANK() OVER (ORDER BY upr.puzzle_rush_best DESC) as rank
      FROM users u
      JOIN user_puzzle_ratings upr ON u.id = upr.user_id
      WHERE upr.puzzle_rush_best > 0 AND u.is_banned = FALSE
      ORDER BY upr.puzzle_rush_best DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      leaderboard: result.rows
    });
  } catch (error) {
    console.error('Get puzzle rush leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get streak leaderboard
router.get('/streaks', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar, upr.best_streak as streak,
             RANK() OVER (ORDER BY upr.best_streak DESC) as rank
      FROM users u
      JOIN user_puzzle_ratings upr ON u.id = upr.user_id
      WHERE upr.best_streak > 0 AND u.is_banned = FALSE
      ORDER BY upr.best_streak DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      leaderboard: result.rows
    });
  } catch (error) {
    console.error('Get streaks leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get achievement points leaderboard
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar,
             COUNT(ua.id) as achievements_count,
             COALESCE(SUM(a.points), 0) as total_points,
             RANK() OVER (ORDER BY COALESCE(SUM(a.points), 0) DESC) as rank
      FROM users u
      LEFT JOIN user_achievements ua ON u.id = ua.user_id
      LEFT JOIN achievements a ON ua.achievement_id = a.id
      WHERE u.is_banned = FALSE
      GROUP BY u.id, u.username, u.avatar
      HAVING COUNT(ua.id) > 0
      ORDER BY total_points DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      leaderboard: result.rows
    });
  } catch (error) {
    console.error('Get achievements leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tournament winners
router.get('/tournament-winners', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar, COUNT(*) as wins,
             RANK() OVER (ORDER BY COUNT(*) DESC) as rank
      FROM users u
      JOIN (
        SELECT tournament_id, user_id
        FROM tournament_participants
        WHERE (tournament_id, score) IN (
          SELECT tournament_id, MAX(score)
          FROM tournament_participants
          GROUP BY tournament_id
        )
      ) winners ON u.id = winners.user_id
      WHERE u.is_banned = FALSE
      GROUP BY u.id, u.username, u.avatar
      ORDER BY wins DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({
      leaderboard: result.rows
    });
  } catch (error) {
    console.error('Get tournament winners error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
