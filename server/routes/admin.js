const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../utils/db');

// ============================================
// DASHBOARD & STATS
// ============================================

router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users, games, tournaments, clubMembers] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_banned = FALSE'),
      pool.query('SELECT COUNT(*) as count FROM games'),
      pool.query('SELECT COUNT(*) as count FROM tournaments'),
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_club_member = TRUE')
    ]);

    const activeGames = await pool.query("SELECT COUNT(*) as count FROM games WHERE status = 'active'");
    const onlineUsers = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_online > NOW() - INTERVAL '5 minutes' AND is_banned = FALSE
    `);
    const activeTournaments = await pool.query("SELECT COUNT(*) as count FROM tournaments WHERE status = 'active'");

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalGames: parseInt(games.rows[0].count),
      totalTournaments: parseInt(tournaments.rows[0].count),
      clubMembers: parseInt(clubMembers.rows[0].count),
      activeGames: parseInt(activeGames.rows[0].count),
      onlineUsers: parseInt(onlineUsers.rows[0].count),
      activeTournaments: parseInt(activeTournaments.rows[0].count)
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users with search/filter
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, banned, clubMember } = req.query;

    let query = `
      SELECT u.id, u.email, u.username, u.avatar, u.is_admin, u.is_club_member,
             u.is_banned, u.ban_reason, u.ban_expires, u.is_muted, u.mute_expires,
             u.created_at, u.last_online,
             ur.blitz_rating, ur.rapid_rating, ur.bullet_rating,
             ur.total_games, ur.total_wins
      FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (banned === 'true') query += ` AND u.is_banned = TRUE`;
    if (banned === 'false') query += ` AND u.is_banned = FALSE`;
    if (clubMember === 'true') query += ` AND u.is_club_member = TRUE`;

    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user details
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await pool.query(`
      SELECT u.*, ur.*
      FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE u.id = $1
    `, [id]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get recent activity
    const recentGames = await pool.query(`
      SELECT id, white_player_id, black_player_id, result, created_at
      FROM games 
      WHERE white_player_id = $1 OR black_player_id = $1
      ORDER BY created_at DESC LIMIT 10
    `, [id]);
    
    const loginCount = await pool.query(`
      SELECT COUNT(*) as count FROM games WHERE white_player_id = $1 OR black_player_id = $1
    `, [id]);
    
    res.json({
      ...user.rows[0],
      recentGames: recentGames.rows,
      totalGamesPlayed: parseInt(loginCount.rows[0].count)
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================
// DELETE ACCOUNT
// ============================================

router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists
    const user = await pool.query('SELECT username, is_admin FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.rows[0].is_admin) {
      return res.status(400).json({ error: 'Cannot delete another admin. Remove admin status first.' });
    }
    
    // Delete in order (foreign key constraints)
    await pool.query('DELETE FROM club_chat WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM club_join_requests WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [id]);
    await pool.query('DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1', [id]);
    await pool.query('DELETE FROM user_achievements WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM puzzle_attempts WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM tournament_participants WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM user_ratings WHERE user_id = $1', [id]);
    // Don't delete games - just anonymize them
    await pool.query('UPDATE games SET white_player_id = NULL WHERE white_player_id = $1', [id]);
    await pool.query('UPDATE games SET black_player_id = NULL WHERE black_player_id = $1', [id]);
    // Finally delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: `Account "${user.rows[0].username}" deleted successfully` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// ============================================
// PASSWORD MANAGEMENT
// ============================================

// Admin force password reset (sets temp password)
router.post('/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Generate random password if not provided
    const tempPassword = newPassword || crypto.randomBytes(4).toString('hex'); // 8 char random
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const result = await pool.query(`
      UPDATE users SET password = $1, must_change_password = TRUE WHERE id = $2
      RETURNING username, email
    `, [hashedPassword, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      message: `Password reset for ${result.rows[0].username}`,
      tempPassword: tempPassword,
      email: result.rows[0].email,
      note: 'Give this temporary password to the user. They will be prompted to change it on login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate password reset token (for user self-service)
router.post('/users/:id/generate-reset-link', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const result = await pool.query(`
      UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3
      RETURNING username, email
    `, [token, expires, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const resetLink = `${process.env.FRONTEND_URL || 'https://riddickchess.site'}/reset-password?token=${token}`;
    
    res.json({ 
      message: `Reset link generated for ${result.rows[0].username}`,
      resetLink,
      email: result.rows[0].email,
      expiresIn: '24 hours',
      note: 'Send this link to the user'
    });
  } catch (error) {
    console.error('Generate reset link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// EDIT USER
// ============================================

router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;
    
    // Check for duplicates
    if (username) {
      const existingUsername = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]
      );
      if (existingUsername.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]
      );
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    const result = await pool.query(`
      UPDATE users SET 
        username = COALESCE($1, username),
        email = COALESCE($2, email)
      WHERE id = $3
      RETURNING id, username, email
    `, [username, email, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated', user: result.rows[0] });
  } catch (error) {
    console.error('Edit user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================
// BAN MANAGEMENT
// ============================================

// Ban user (permanent or temporary)
router.post('/users/:id/ban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, duration } = req.body; // duration in hours, null = permanent
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }
    
    let banExpires = null;
    if (duration) {
      banExpires = new Date(Date.now() + duration * 60 * 60 * 1000);
    }
    
    const result = await pool.query(`
      UPDATE users SET is_banned = TRUE, ban_reason = $1, ban_expires = $2 WHERE id = $3
      RETURNING username
    `, [reason || 'No reason provided', banExpires, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const banType = duration ? `for ${duration} hours` : 'permanently';
    res.json({ message: `${result.rows[0].username} banned ${banType}` });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unban user
router.post('/users/:id/unban', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE users SET is_banned = FALSE, ban_reason = NULL, ban_expires = NULL WHERE id = $1
      RETURNING username
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `${result.rows[0].username} unbanned` });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mute user (chat only)
router.post('/users/:id/mute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body; // duration in hours
    
    let muteExpires = null;
    if (duration) {
      muteExpires = new Date(Date.now() + duration * 60 * 60 * 1000);
    }
    
    const result = await pool.query(`
      UPDATE users SET is_muted = TRUE, mute_expires = $1 WHERE id = $2
      RETURNING username
    `, [muteExpires, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const muteType = duration ? `for ${duration} hours` : 'permanently';
    res.json({ message: `${result.rows[0].username} muted ${muteType}` });
  } catch (error) {
    console.error('Mute user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unmute user
router.post('/users/:id/unmute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE users SET is_muted = FALSE, mute_expires = NULL WHERE id = $1
      RETURNING username
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `${result.rows[0].username} unmuted` });
  } catch (error) {
    console.error('Unmute user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ADMIN & CLUB MANAGEMENT
// ============================================

router.post('/users/:id/make-admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE users SET is_admin = TRUE WHERE id = $1
      RETURNING username
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `${result.rows[0].username} is now an admin` });
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:id/remove-admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' });
    }
    
    const result = await pool.query(`
      UPDATE users SET is_admin = FALSE WHERE id = $1
      RETURNING username
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `Admin removed from ${result.rows[0].username}` });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// RATINGS MANAGEMENT
// ============================================

router.post('/users/:id/reset-ratings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE user_ratings SET 
        bullet_rating = 1500, bullet_rd = 350, bullet_games = 0,
        blitz_rating = 1500, blitz_rd = 350, blitz_games = 0,
        rapid_rating = 1500, rapid_rd = 350, rapid_games = 0,
        classical_rating = 1500, classical_rd = 350, classical_games = 0,
        puzzle_rating = 1500,
        total_games = 0, total_wins = 0, total_losses = 0, total_draws = 0
      WHERE user_id = $1
      RETURNING user_id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User ratings not found' });
    }
    
    res.json({ message: 'Ratings reset to 1500' });
  } catch (error) {
    console.error('Reset ratings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// ============================================
// ANNOUNCEMENTS
// ============================================

router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.username as author_username
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      WHERE a.expires_at IS NULL OR a.expires_at > NOW()
      ORDER BY a.is_pinned DESC, a.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, content, type, isPinned, expiresIn } = req.body;
    
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
    }
    
    const result = await pool.query(`
      INSERT INTO announcements (title, content, type, is_pinned, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title, content, type || 'info', isPinned || false, expiresAt, req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// REPORTS
// ============================================

router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fpr.*,
             reporter.username as reporter_username,
             reported.username as reported_username
      FROM fair_play_reports fpr
      JOIN users reporter ON fpr.reporter_id = reporter.id
      JOIN users reported ON fpr.reported_user_id = reported.id
      ORDER BY fpr.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reports/:id/review', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, banUser } = req.body;
    
    const result = await pool.query(`
      UPDATE fair_play_reports
      SET status = $1, resolution = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, resolution, req.user.id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (banUser && result.rows[0].reported_user_id) {
      await pool.query(`
        UPDATE users SET is_banned = TRUE, ban_reason = $1 WHERE id = $2
      `, [resolution || 'Fair play violation', result.rows[0].reported_user_id]);
    }
    
    res.json({ message: 'Report reviewed' });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
