const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../utils/db');
const achievementService = require('../services/achievementService');

// Get all friends
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.id as friendship_id,
        f.status,
        f.created_at as friends_since,
        CASE 
          WHEN f.user_id = $1 THEN f.friend_id 
          ELSE f.user_id 
        END as friend_id,
        u.username,
        u.avatar,
        u.last_online,
        u.is_club_member,
        ur.blitz_rating as rating
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE (f.user_id = $1 OR f.friend_id = $1) 
        AND f.status = 'accepted'
        AND u.is_banned = FALSE
      ORDER BY u.last_online DESC
    `, [req.user.id]);

    // Add online status
    const friends = result.rows.map(f => ({
      ...f,
      isOnline: new Date(f.last_online) > new Date(Date.now() - 5 * 60 * 1000)
    }));

    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending friend requests
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    // Incoming requests
    const incoming = await pool.query(`
      SELECT f.id as friendship_id, f.created_at,
             u.id as user_id, u.username, u.avatar,
             ur.blitz_rating as rating
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE f.friend_id = $1 AND f.status = 'pending' AND u.is_banned = FALSE
      ORDER BY f.created_at DESC
    `, [req.user.id]);

    // Outgoing requests
    const outgoing = await pool.query(`
      SELECT f.id as friendship_id, f.created_at,
             u.id as user_id, u.username, u.avatar,
             ur.blitz_rating as rating
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE f.user_id = $1 AND f.status = 'pending' AND u.is_banned = FALSE
      ORDER BY f.created_at DESC
    `, [req.user.id]);

    res.json({
      incoming: incoming.rows,
      outgoing: outgoing.rows
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send friend request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1 AND is_banned = FALSE', [userId]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existing = await pool.query(`
      SELECT * FROM friendships
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [req.user.id, userId]);

    if (existing.rows.length > 0) {
      const friendship = existing.rows[0];
      if (friendship.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
      if (friendship.status === 'pending') {
        if (friendship.user_id === req.user.id) {
          return res.status(400).json({ error: 'Friend request already sent' });
        } else {
          // They sent us a request, accept it
          await pool.query(`
            UPDATE friendships SET status = 'accepted' WHERE id = $1
          `, [friendship.id]);
          
          await achievementService.checkSocialAchievements(req.user.id);
          await achievementService.checkSocialAchievements(userId);
          
          return res.json({ message: 'Friend request accepted' });
        }
      }
      if (friendship.status === 'blocked') {
        return res.status(400).json({ error: 'Cannot send friend request' });
      }
    }

    // Create friend request
    const result = await pool.query(`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING id
    `, [req.user.id, userId]);

    res.status(201).json({ 
      message: 'Friend request sent',
      friendshipId: result.rows[0].id
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept friend request
router.post('/accept/:friendshipId', authenticateToken, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    const result = await pool.query(`
      UPDATE friendships
      SET status = 'accepted'
      WHERE id = $1 AND friend_id = $2 AND status = 'pending'
      RETURNING *
    `, [friendshipId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Check social achievements for both users
    await achievementService.checkSocialAchievements(req.user.id);
    await achievementService.checkSocialAchievements(result.rows[0].user_id);

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline friend request
router.post('/decline/:friendshipId', authenticateToken, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    const result = await pool.query(`
      DELETE FROM friendships
      WHERE id = $1 AND friend_id = $2 AND status = 'pending'
      RETURNING id
    `, [friendshipId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove friend
router.delete('/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;

    const result = await pool.query(`
      DELETE FROM friendships
      WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        AND status = 'accepted'
      RETURNING id
    `, [req.user.id, friendId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block user
router.post('/block/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Remove existing friendship if any
    await pool.query(`
      DELETE FROM friendships
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [req.user.id, userId]);

    // Create blocked relationship
    await pool.query(`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES ($1, $2, 'blocked')
      ON CONFLICT DO NOTHING
    `, [req.user.id, userId]);

    res.json({ message: 'User blocked' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unblock user
router.post('/unblock/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(`
      DELETE FROM friendships
      WHERE user_id = $1 AND friend_id = $2 AND status = 'blocked'
    `, [req.user.id, userId]);

    res.json({ message: 'User unblocked' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
