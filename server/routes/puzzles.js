const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const puzzleService = require('../services/puzzleService');

// Get next puzzle for user
router.get('/next', authenticateToken, async (req, res) => {
  try {
    const { themes, minRating, maxRating } = req.query;
    
    const puzzle = await puzzleService.getNextPuzzle(req.user.id, {
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
      // Don't send solution to client!
      movesCount: puzzle.moves.split(' ').length
    });
  } catch (error) {
    console.error('Get puzzle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get daily puzzle
router.get('/daily', authenticateToken, async (req, res) => {
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
router.post('/:id/move', authenticateToken, async (req, res) => {
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

// Complete a puzzle attempt
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
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
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const rating = await puzzleService.getUserPuzzleRating(req.user.id);
    res.json(rating);
  } catch (error) {
    console.error('Get puzzle stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Puzzle Rush
router.post('/rush/start', authenticateToken, async (req, res) => {
  try {
    const { mode = 'survival' } = req.body;
    const session = await puzzleService.startPuzzleRush(req.user.id, mode);
    
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
router.get('/:id/solution', authenticateToken, async (req, res) => {
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
router.post('/rush/end', authenticateToken, async (req, res) => {
  try {
    const { score } = req.body;
    const result = await puzzleService.endPuzzleRush(req.user.id, score);
    res.json(result);
  } catch (error) {
    console.error('End puzzle rush error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available themes
router.get('/themes', authenticateToken, async (req, res) => {
  try {
    const themes = await puzzleService.getThemes();
    res.json(themes);
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get puzzle leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
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
