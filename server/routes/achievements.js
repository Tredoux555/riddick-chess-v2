const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const achievementService = require('../services/achievementService');

// Get all achievements with user's progress
router.get('/', authenticateToken, async (req, res) => {
  try {
    const achievements = await achievementService.getUserAchievements(req.user.id);
    res.json(achievements);
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's achievement progress/stats
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await achievementService.getProgress(req.user.id);
    res.json(progress);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recently earned achievements
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const recent = await achievementService.getRecentAchievements(req.user.id, parseInt(limit));
    res.json(recent);
  } catch (error) {
    console.error('Get recent achievements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get global achievement statistics
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const stats = await achievementService.getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Get global stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific user's achievements (for profile viewing)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const achievements = await achievementService.getUserAchievements(userId);
    res.json(achievements.filter(a => a.earned)); // Only show earned achievements
  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
