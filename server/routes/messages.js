const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../utils/db');

// Get conversations list (most recent message per person)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (other_id)
        other_id,
        u.username as other_username,
        u.avatar as other_avatar,
        dm.content as last_message,
        dm.created_at as last_message_at,
        dm.sender_id,
        (SELECT COUNT(*) FROM direct_messages
         WHERE sender_id = other_id AND receiver_id = $1 AND read_at IS NULL
        ) as unread_count
      FROM (
        SELECT
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_id,
          id, content, created_at, sender_id
        FROM direct_messages
        WHERE sender_id = $1 OR receiver_id = $1
      ) dm
      JOIN users u ON dm.other_id = u.id
      ORDER BY other_id, dm.created_at DESC
    `, [req.user.id]);

    // Sort by most recent message
    const conversations = result.rows.sort((a, b) =>
      new Date(b.last_message_at) - new Date(a.last_message_at)
    );

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count total
router.get('/unread', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM direct_messages WHERE receiver_id = $1 AND read_at IS NULL',
      [req.user.id]
    );
    res.json({ unread: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages with a specific user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const otherId = parseInt(req.params.userId);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;

    let query = `
      SELECT dm.id, dm.sender_id, dm.receiver_id, dm.content, dm.created_at, dm.read_at,
             u.username as sender_username, u.avatar as sender_avatar
      FROM direct_messages dm
      JOIN users u ON dm.sender_id = u.id
      WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
         OR (dm.sender_id = $2 AND dm.receiver_id = $1)
    `;
    const params = [req.user.id, otherId];

    if (before) {
      query += ` AND dm.id < $3`;
      params.push(before);
    }

    query += ` ORDER BY dm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Mark messages as read
    await pool.query(`
      UPDATE direct_messages SET read_at = NOW()
      WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL
    `, [otherId, req.user.id]);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get DMs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
