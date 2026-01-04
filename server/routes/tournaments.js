const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const tournamentService = require('../services/tournamentService');

// Get all active/upcoming tournaments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const tournaments = await tournamentService.getActiveTournaments(parseInt(limit));
    res.json(tournaments);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get MY tournaments (must be before /:id)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const tournaments = await tournamentService.getUserTournaments(req.user.id);
    res.json(tournaments);
  } catch (error) {
    console.error('Get my tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's tournament history (must be before /:id)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;
    const tournaments = await tournamentService.getUserTournaments(userId);
    res.json(tournaments);
  } catch (error) {
    console.error('Get user tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a tournament (admin only) - must be before /:id
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tournament = await tournamentService.createTournament(req.body, req.user.id);
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific tournament (MUST be after /my and /user/:userId)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Getting tournament:', req.params.id);
    const tournament = await tournamentService.getTournament(req.params.id, req.user.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tournament standings
router.get('/:id/standings', authenticateToken, async (req, res) => {
  try {
    const standings = await tournamentService.getStandings(req.params.id);
    res.json(standings);
  } catch (error) {
    console.error('Get standings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all rounds with pairings
router.get('/:id/rounds', authenticateToken, async (req, res) => {
  try {
    const rounds = await tournamentService.getAllRounds(req.params.id);
    res.json(rounds);
  } catch (error) {
    console.error('Get rounds error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pairings for a specific round
router.get('/:id/rounds/:round', authenticateToken, async (req, res) => {
  try {
    const pairings = await tournamentService.getRoundPairings(req.params.id, parseInt(req.params.round));
    res.json(pairings);
  } catch (error) {
    console.error('Get round pairings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register for a tournament
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const result = await tournamentService.registerPlayer(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Register tournament error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Withdraw from a tournament
router.post('/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const result = await tournamentService.withdrawPlayer(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Withdraw tournament error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Start a tournament (admin only)
router.post('/:id/start', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await tournamentService.startTournament(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Generate next round (admin only)
router.post('/:id/next-round', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tournament = await tournamentService.getTournament(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== 'active') {
      return res.status(400).json({ error: 'Tournament is not active' });
    }

    const pairings = await tournamentService.generatePairings(
      req.params.id, 
      tournament.current_round + 1
    );

    // Update current round
    await require('../utils/db').query(`
      UPDATE tournaments SET current_round = current_round + 1 WHERE id = $1
    `, [req.params.id]);

    res.json({ round: tournament.current_round + 1, pairings });
  } catch (error) {
    console.error('Generate next round error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process forfeits for inactive players (admin only)
router.post('/:id/process-forfeits', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await tournamentService.processForfeits(req.params.id);
    res.json({ success: true, forfeitsProcessed: result.processed });
  } catch (error) {
    console.error('Process forfeits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inactive players (admin only)
router.get('/:id/inactive-players', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 12;
    const players = await tournamentService.getInactivePlayers(req.params.id, hours);
    res.json(players);
  } catch (error) {
    console.error('Get inactive players error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check-in for tournament
router.post('/:id/check-in', authenticateToken, async (req, res) => {
  try {
    const result = await tournamentService.checkInPlayer(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update player activity (called when player is active in tournament)
router.post('/:id/activity', authenticateToken, async (req, res) => {
  try {
    await tournamentService.updatePlayerActivity(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
