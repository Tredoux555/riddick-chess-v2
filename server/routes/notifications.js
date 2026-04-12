const express = require('express');
const router = express.Router();
const { pool } = require('../init-db');
const { authenticateToken } = require('../middleware/auth');

// Get unread notifications
router.get('/unread', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1 AND dismissed_at IS NULL
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND read_at IS NULL AND dismissed_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Get notification count error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dismiss notification
router.post('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid ID' });
    await pool.query(
      'UPDATE notifications SET dismissed_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dismiss all
router.post('/dismiss-all', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET dismissed_at = NOW() WHERE user_id = $1 AND dismissed_at IS NULL',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
