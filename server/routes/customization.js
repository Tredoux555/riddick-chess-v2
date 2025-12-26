const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../utils/db');

// Get all board themes
router.get('/themes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM board_themes ORDER BY is_premium, name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all piece sets
router.get('/pieces', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM piece_sets ORDER BY is_premium, name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get pieces error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT up.*, bt.name as theme_name, bt.light_color, bt.dark_color,
             ps.name as piece_set_name
      FROM user_preferences up
      LEFT JOIN board_themes bt ON up.board_theme = bt.id
      LEFT JOIN piece_sets ps ON up.piece_set = ps.id
      WHERE up.user_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      // Create default preferences
      await pool.query(`
        INSERT INTO user_preferences (user_id) VALUES ($1)
      `, [req.user.id]);
      
      return res.json({
        board_theme: 'classic',
        piece_set: 'cburnett',
        sound_enabled: true,
        auto_promote_queen: true,
        show_legal_moves: true,
        confirm_resign: true,
        animation_speed: 'normal'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const {
      board_theme,
      piece_set,
      sound_enabled,
      auto_promote_queen,
      show_legal_moves,
      confirm_resign,
      animation_speed
    } = req.body;

    const result = await pool.query(`
      INSERT INTO user_preferences (user_id, board_theme, piece_set, sound_enabled, auto_promote_queen, show_legal_moves, confirm_resign, animation_speed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        board_theme = COALESCE($2, user_preferences.board_theme),
        piece_set = COALESCE($3, user_preferences.piece_set),
        sound_enabled = COALESCE($4, user_preferences.sound_enabled),
        auto_promote_queen = COALESCE($5, user_preferences.auto_promote_queen),
        show_legal_moves = COALESCE($6, user_preferences.show_legal_moves),
        confirm_resign = COALESCE($7, user_preferences.confirm_resign),
        animation_speed = COALESCE($8, user_preferences.animation_speed)
      RETURNING *
    `, [req.user.id, board_theme, piece_set, sound_enabled, auto_promote_queen, show_legal_moves, confirm_resign, animation_speed]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
