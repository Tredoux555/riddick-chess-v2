const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../utils/db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/lessons');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files allowed'));
    }
  }
});

// Get all published lessons (public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT id, title, description, video_url, video_filename, thumbnail_url, 
             category, difficulty, order_index, views, created_at
      FROM chess_lessons 
      WHERE is_published = true
    `;
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    query += ' ORDER BY category, order_index, created_at';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all lessons including unpublished (admin)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.username as created_by_username
      FROM chess_lessons l
      LEFT JOIN users u ON l.created_by = u.id
      ORDER BY category, order_index, created_at
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all lessons error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single lesson
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM chess_lessons WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Increment views
    await pool.query('UPDATE chess_lessons SET views = views + 1 WHERE id = $1', [req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create lesson (admin) - with video upload
router.post('/', authenticateToken, requireAdmin, upload.single('video'), async (req, res) => {
  try {
    const { title, description, category, difficulty, order_index, video_url } = req.body;
    
    // Either uploaded file or external URL
    const videoFilename = req.file ? req.file.filename : null;
    const finalVideoUrl = req.file ? `/api/lessons/video/${req.file.filename}` : video_url;
    
    const result = await pool.query(`
      INSERT INTO chess_lessons (title, description, video_url, video_filename, category, difficulty, order_index, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description, finalVideoUrl, videoFilename, category || 'basics', difficulty || 'beginner', order_index || 0, req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update lesson (admin)
router.put('/:id', authenticateToken, requireAdmin, upload.single('video'), async (req, res) => {
  try {
    const { title, description, category, difficulty, order_index, is_published, video_url } = req.body;
    
    // If new video uploaded, delete old one
    if (req.file) {
      const old = await pool.query('SELECT video_filename FROM chess_lessons WHERE id = $1', [req.params.id]);
      if (old.rows[0]?.video_filename) {
        const oldPath = path.join(uploadsDir, old.rows[0].video_filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    
    const videoFilename = req.file ? req.file.filename : undefined;
    const finalVideoUrl = req.file ? `/api/lessons/video/${req.file.filename}` : video_url;
    
    const result = await pool.query(`
      UPDATE chess_lessons 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          video_url = COALESCE($3, video_url),
          video_filename = COALESCE($4, video_filename),
          category = COALESCE($5, category),
          difficulty = COALESCE($6, difficulty),
          order_index = COALESCE($7, order_index),
          is_published = COALESCE($8, is_published),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [title, description, finalVideoUrl, videoFilename, category, difficulty, order_index, is_published, req.params.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete lesson (admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Delete video file
    const lesson = await pool.query('SELECT video_filename FROM chess_lessons WHERE id = $1', [req.params.id]);
    if (lesson.rows[0]?.video_filename) {
      const filePath = path.join(uploadsDir, lesson.rows[0].video_filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    await pool.query('DELETE FROM chess_lessons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve video files
router.get('/video/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.sendFile(filePath);
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM chess_lessons 
      WHERE is_published = true 
      GROUP BY category 
      ORDER BY category
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

