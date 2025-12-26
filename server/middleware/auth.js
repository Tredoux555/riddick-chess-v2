const jwt = require('jsonwebtoken');
const pool = require('../utils/db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, username, avatar, is_admin, is_club_member, is_banned FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (result.rows[0].is_banned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireClubMember = (req, res, next) => {
  if (!req.user || !req.user.is_club_member) {
    return res.status(403).json({ error: 'Club membership required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query(
        'SELECT id, email, username, avatar, is_admin, is_club_member FROM users WHERE id = $1',
        [decoded.id]
      );
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch (error) {
      // Token invalid, continue without user
    }
  }
  next();
};

module.exports = { authenticateToken, requireAdmin, requireClubMember, optionalAuth };
