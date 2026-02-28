const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const puzzleService = require('../services/puzzleService');

// Get next puzzle for user (works for anonymous users too)
router.get('/next', optionalAuth, async (req, res) => {
  try {
    const { themes, minRating, maxRating } = req.query;

    // Use user ID if logged in, null for anonymous
    const userId = req.user?.id || null;

    const puzzle = await puzzleService.getNextPuzzle(userId, {
      themes: themes ? themes.split(',') : null,
      minRating: minRating ? parseInt(minRating) : null,
      maxRating: maxRating ? parseInt(maxRating) : null
    });

    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzles available' });
    }

    res.json({
      id: puzzle.id,
      fen: puzzle.fen,
      rating: puzzle.rating,
      themes: puzzle.themes,
      movesCount: puzzle.moves.split(' ').length
    });
  } catch (error) {
    console.error('Get puzzle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get daily puzzle
router.get('/daily', optionalAuth, async (req, res) => {
  try {
    const puzzle = await puzzleService.getDailyPuzzle();

    if (!puzzle) {
      return res.status(404).json({ error: 'No daily puzzle available' });
    }

    res.json({
      id: puzzle.puzzle_id || puzzle.id,
      fen: puzzle.fen,
      rating: puzzle.rating,
      themes: puzzle.themes,
      date: puzzle.date
    });
  } catch (error) {
    console.error('Get daily puzzle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Validate a move in puzzle
router.post('/:id/move', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { move, moveIndex = 0 } = req.body;

    const puzzle = await puzzleService.getPuzzle(id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    const result = puzzleService.validateMove(puzzle.fen, puzzle.moves, move, moveIndex);
    res.json(result);
  } catch (error) {
    console.error('Validate move error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete a puzzle attempt (requires login for rating tracking)
router.post('/:id/complete', optionalAuth, async (req, res) => {
  try {
    // Anonymous users can solve puzzles but we don't record stats
    if (!req.user) {
      return res.json({ newRating: 500, ratingChange: 0, solved: req.body.solved });
    }

    const { id } = req.params;
    const { solved, timeTaken, movesTried } = req.body;

    const result = await puzzleService.recordAttempt(
      req.user.id,
      id,
      solved,
      timeTaken,
      movesTried
    );

    res.json(result);
  } catch (error) {
    console.error('Complete puzzle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's puzzle rating and stats
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      // Anonymous users get default stats
      return res.json({ rating: 500, rd: 350, vol: 0.06, puzzles_solved: 0, current_streak: 0, best_streak: 0, puzzle_rush_best: 0 });
    }
    const rating = await puzzleService.getUserPuzzleRating(req.user.id);
    res.json(rating);
  } catch (error) {
    console.error('Get puzzle stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Puzzle Rush
router.post('/rush/start', optionalAuth, async (req, res) => {
  try {
    const { mode = 'survival' } = req.body;
    const userId = req.user?.id || 'anonymous';
    const session = await puzzleService.startPuzzleRush(userId, mode);

    // Return puzzles without solutions
    const sanitizedPuzzles = session.puzzles.map(p => ({
      id: p.id,
      fen: p.fen,
      rating: p.rating
    }));

    res.json({
      ...session,
      puzzles: sanitizedPuzzles
    });
  } catch (error) {
    console.error('Start puzzle rush error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get puzzle solution (for Puzzle Rush validation)
router.get('/:id/solution', optionalAuth, async (req, res) => {
  try {
    const puzzle = await puzzleService.getPuzzle(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    res.json({ moves: puzzle.moves });
  } catch (error) {
    console.error('Get solution error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// End Puzzle Rush
router.post('/rush/end', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      // Anonymous users - just acknowledge the score
      return res.json({ score: req.body.score, recorded: false });
    }
    const { score } = req.body;
    const result = await puzzleService.endPuzzleRush(req.user.id, score);
    res.json(result);
  } catch (error) {
    console.error('End puzzle rush error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available themes
router.get('/themes', optionalAuth, async (req, res) => {
  try {
    const themes = await puzzleService.getThemes();
    res.json(themes);
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get puzzle leaderboard
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const leaderboard = await puzzleService.getLeaderboard(parseInt(limit));
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
