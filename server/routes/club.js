const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireClubMember } = require('../middleware/auth');
const pool = require('../utils/db');
const achievementService = require('../services/achievementService');

// ============================================
// CLUB INFO
// ============================================

// Get club info (public)
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const club = await pool.query('SELECT * FROM club_info WHERE id = 1');
    const memberCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_club_member = TRUE');
    
    res.json({
      ...club.rows[0],
      memberCount: parseInt(memberCount.rows[0].count)
    });
  } catch (error) {
    console.error('Get club info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update club info (admin only)
router.put('/info', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;
    
    const result = await pool.query(`
      UPDATE club_info 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          logo_url = COALESCE($3, logo_url),
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [name, description, logoUrl]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update club info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if user is club member
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Check for pending request
    const pending = await pool.query(
      'SELECT * FROM club_join_requests WHERE user_id = $1 AND status = $2',
      [req.user.id, 'pending']
    );
    
    res.json({
      isMember: req.user.is_club_member,
      verifiedAt: req.user.club_verified_at,
      hasPendingRequest: pending.rows.length > 0
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// JOIN REQUESTS
// ============================================

// Request to join club
router.post('/join', authenticateToken, async (req, res) => {
  try {
    if (req.user.is_club_member) {
      return res.status(400).json({ error: 'Already a member' });
    }
    
    const { message } = req.body;
    
    // Check for existing pending request
    const existing = await pool.query(
      'SELECT * FROM club_join_requests WHERE user_id = $1 AND status = $2',
      [req.user.id, 'pending']
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }
    
    await pool.query(`
      INSERT INTO club_join_requests (user_id, message)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET message = $2, status = 'pending', created_at = NOW()
    `, [req.user.id, message]);
    
    res.json({ message: 'Join request submitted!' });
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending join requests (admin)
router.get('/join-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT jr.*, u.username, u.avatar, u.created_at as user_joined
      FROM club_join_requests jr
      JOIN users u ON jr.user_id = u.id
      WHERE jr.status = 'pending'
      ORDER BY jr.created_at ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Approve join request (admin)
router.post('/join-requests/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the request
    const request = await pool.query('SELECT * FROM club_join_requests WHERE id = $1', [id]);
    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    const userId = request.rows[0].user_id;
    
    // Update request status
    await pool.query(`
      UPDATE club_join_requests 
      SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
      WHERE id = $2
    `, [req.user.id, id]);
    
    // Make user a club member
    await pool.query(`
      UPDATE users SET is_club_member = TRUE, club_verified_at = NOW() WHERE id = $1
    `, [userId]);
    
    // Award achievement
    await achievementService.checkClubAchievements(userId);
    
    res.json({ message: 'Request approved!' });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject join request (admin)
router.post('/join-requests/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(`
      UPDATE club_join_requests 
      SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1
      WHERE id = $2
    `, [req.user.id, id]);
    
    res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// CLUB CHAT
// ============================================

// Get chat messages (members only)
router.get('/chat', authenticateToken, requireClubMember, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    
    let query = `
      SELECT cc.*, u.username, u.avatar
      FROM club_chat cc
      JOIN users u ON cc.user_id = u.id
    `;
    const params = [];
    
    if (before) {
      params.push(before);
      query += ` WHERE cc.id < $${params.length}`;
    }
    
    params.push(parseInt(limit));
    query += ` ORDER BY cc.created_at DESC LIMIT $${params.length}`;
    
    const result = await pool.query(query, params);
    
    // Return in chronological order
    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send chat message (members only) - also handled via socket
router.post('/chat', authenticateToken, requireClubMember, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 chars)' });
    }
    
    const result = await pool.query(`
      INSERT INTO club_chat (user_id, message)
      VALUES ($1, $2)
      RETURNING *
    `, [req.user.id, message.trim()]);
    
    // Get user info for response
    const user = await pool.query('SELECT username, avatar FROM users WHERE id = $1', [req.user.id]);
    
    res.json({
      ...result.rows[0],
      username: user.rows[0].username,
      avatar: user.rows[0].avatar
    });
  } catch (error) {
    console.error('Send chat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// MEMBER MANAGEMENT (Admin Only)
// ============================================

// Get all club members
router.get('/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, avatar, is_club_member, club_verified_at, created_at
      FROM users
      WHERE is_club_member = TRUE
      ORDER BY club_verified_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all members list (for club page - members can see other members)
router.get('/members/list', authenticateToken, requireClubMember, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, avatar, club_verified_at,
             (SELECT MAX(last_online) FROM users WHERE id = u.id) as last_online
      FROM users u
      WHERE is_club_member = TRUE
      ORDER BY last_online DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get members list error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get pending member requests (non-members who haven't requested)
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, avatar, created_at
      FROM users
      WHERE is_club_member = FALSE AND is_admin = FALSE AND is_banned = FALSE
      AND id NOT IN (SELECT user_id FROM club_join_requests WHERE status = 'pending')
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify/add a club member directly (admin)
router.post('/members/:userId/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      UPDATE users
      SET is_club_member = TRUE, club_verified_at = NOW()
      WHERE id = $1
      RETURNING id, username, is_club_member
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await achievementService.checkClubAchievements(userId);
    
    res.json({
      message: 'User verified as club member',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke club membership (admin)
router.post('/members/:userId/revoke', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(`
      UPDATE users
      SET is_club_member = FALSE, club_verified_at = NULL
      WHERE id = $1
      RETURNING id, username
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      message: 'Club membership revoked',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Revoke member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
