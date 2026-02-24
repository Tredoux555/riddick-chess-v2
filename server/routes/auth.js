const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "438652858045-9r90vj4o3b3ivojorb531q7pjnk5v1l8.apps.googleusercontent.com");

// Register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email or username exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, avatar, is_admin, is_club_member`,
      [email.toLowerCase(), username, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      // Check if ban has expired
      if (user.ban_expires && new Date(user.ban_expires) < new Date()) {
        // Ban expired — unban the user
        await pool.query('UPDATE users SET is_banned = FALSE, ban_reason = NULL, ban_expires = NULL WHERE id = $1', [user.id]);
      } else {
        return res.status(403).json({ error: 'Account is banned', reason: user.ban_reason, expires: user.ban_expires });
      }
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please use Google to sign in' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        is_admin: user.is_admin,
        is_club_member: user.is_club_member
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || "438652858045-9r90vj4o3b3ivojorb531q7pjnk5v1l8.apps.googleusercontent.com"
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // First: check if user exists by google_id (trusted link)
    let result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );

    let user;

    if (result.rows.length > 0) {
      // User already linked to this Google account
      user = result.rows[0];

      if (user.is_banned) {
        return res.status(403).json({ error: 'Account is banned', reason: user.ban_reason });
      }
    } else {
      // Check if email matches an existing account
      result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];

        if (user.is_banned) {
          return res.status(403).json({ error: 'Account is banned', reason: user.ban_reason });
        }

        // Only link Google ID if the Google email is verified AND
        // the existing account doesn't already have a different google_id
        if (payload.email_verified && !user.google_id) {
          await pool.query(
            'UPDATE users SET google_id = $1, avatar = COALESCE(avatar, $2) WHERE id = $3',
            [googleId, picture, user.id]
          );
        } else if (user.google_id && user.google_id !== googleId) {
          // This account is already linked to a different Google account
          return res.status(400).json({ error: 'This email is already linked to a different Google account' });
        }
      }
    }

    if (!user) {
      // Create new user - clean username from Google name
      const cleanName = name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      let username = cleanName;

      // Ensure username uniqueness by appending random digits if needed
      const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
      if (usernameCheck.rows.length > 0) {
        username = cleanName + Math.floor(Math.random() * 9999);
      }

      result = await pool.query(
        `INSERT INTO users (email, username, google_id, avatar)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, avatar, is_admin, is_club_member`,
        [email.toLowerCase(), username, googleId, picture]
      );

      user = result.rows[0];
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        is_admin: user.is_admin,
        is_club_member: user.is_club_member
      }
    });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, ur.*, upr.rating as puzzle_rating, upr.puzzles_solved, upr.best_streak
      FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      LEFT JOIN user_puzzle_ratings upr ON u.id = upr.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    delete user.password_hash;

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      // Check if username is taken
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (avatar !== undefined) {
      updates.push(`avatar = $${paramCount++}`);
      values.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, username, avatar`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    
    if (!result.rows[0].password_hash) {
      return res.status(400).json({ error: 'Cannot change password for Google accounts' });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PASSWORD RESET (User Self-Service)
// ============================================

// Request password reset (generates token - normally would send email)
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await pool.query('SELECT id, username FROM users WHERE email = $1', [email]);
    
    // Always return success to prevent email enumeration
    if (user.rows.length === 0) {
      return res.json({ message: 'If an account exists with this email, a reset link has been generated.' });
    }
    
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(`
      UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3
    `, [token, expires, user.rows[0].id]);
    
    // In production, you'd send an email here
    // For now, we'll just return success
    console.log(`Password reset requested for ${email}, token: ${token}`);
    
    res.json({ 
      message: 'If an account exists with this email, a reset link has been generated.',
      // Remove this in production - only for testing
      ...(process.env.NODE_ENV !== 'production' && { debug_token: token })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify reset token
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const result = await pool.query(`
      SELECT id, username FROM users 
      WHERE reset_token = $1 AND reset_token_expires > NOW()
    `, [token]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    res.json({ valid: true, username: result.rows[0].username });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const user = await pool.query(`
      SELECT id FROM users 
      WHERE reset_token = $1 AND reset_token_expires > NOW()
    `, [token]);
    
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(`
      UPDATE users SET 
        password_hash = $1, 
        reset_token = NULL, 
        reset_token_expires = NULL,
        must_change_password = FALSE
      WHERE id = $2
    `, [hashedPassword, user.rows[0].id]);
    
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
