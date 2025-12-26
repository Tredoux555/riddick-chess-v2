const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireClubMember } = require('../middleware/auth');
const pool = require('../utils/db');
const achievementService = require('../services/achievementService');

// Check if user is club member
router.get('/status', authenticateToken, async (req, res) => {
  res.json({
    isMember: req.user.is_club_member,
    verifiedAt: null // Would come from user record
  });
});

// ============================================
// CLUB CONTENT (Members Only)
// ============================================

// Get all club content
router.get('/content', authenticateToken, requireClubMember, async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT cc.*, u.username as author_username, u.avatar as author_avatar
      FROM club_content cc
      JOIN users u ON cc.created_by = u.id
    `;
    const params = [];

    if (type) {
      params.push(type);
      query += ` WHERE cc.content_type = $${params.length}`;
    }

    query += ` ORDER BY cc.is_pinned DESC, cc.created_at DESC`;
    params.push(parseInt(limit), parseInt(offset));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get club content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single content item
router.get('/content/:id', authenticateToken, requireClubMember, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cc.*, u.username as author_username, u.avatar as author_avatar
      FROM club_content cc
      JOIN users u ON cc.created_by = u.id
      WHERE cc.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create club content (admin only)
router.post('/content', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, content, contentType, attachmentUrl, isPinned } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(`
      INSERT INTO club_content (title, content, content_type, attachment_url, created_by, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title, content, contentType, attachmentUrl, req.user.id, isPinned || false]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update club content (admin only)
router.put('/content/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, contentType, attachmentUrl, isPinned } = req.body;

    const result = await pool.query(`
      UPDATE club_content
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          content_type = COALESCE($3, content_type),
          attachment_url = COALESCE($4, attachment_url),
          is_pinned = COALESCE($5, is_pinned),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [title, content, contentType, attachmentUrl, isPinned, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete club content (admin only)
router.delete('/content/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM club_content WHERE id = $1 RETURNING id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({ message: 'Content deleted' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// CLUB EVENTS (Members Only)
// ============================================

// Get upcoming club events
router.get('/events', authenticateToken, requireClubMember, async (req, res) => {
  try {
    const { upcoming = true, limit = 10 } = req.query;

    let query = `
      SELECT ce.*, u.username as organizer_username
      FROM club_events ce
      JOIN users u ON ce.created_by = u.id
    `;

    if (upcoming === 'true' || upcoming === true) {
      query += ` WHERE ce.event_date >= NOW()`;
    }

    query += ` ORDER BY ce.event_date ASC LIMIT $1`;

    const result = await pool.query(query, [parseInt(limit)]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create club event (admin only)
router.post('/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, eventDate, location } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({ error: 'Title and event date are required' });
    }

    const result = await pool.query(`
      INSERT INTO club_events (title, description, event_date, location, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, description, eventDate, location, req.user.id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete club event (admin only)
router.delete('/events/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM club_events WHERE id = $1 RETURNING id
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
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

// Get pending member requests (non-members)
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, avatar, created_at
      FROM users
      WHERE is_club_member = FALSE AND is_admin = FALSE AND is_banned = FALSE
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify/add a club member
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

    // Award achievement
    await achievementService.awardAchievement(userId, 'club_member');

    res.json({
      message: 'User verified as club member',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke club membership
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
