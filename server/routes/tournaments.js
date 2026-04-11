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

// Delete a tournament (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pool = require('../utils/db');
    
    // Delete in correct order (foreign keys)
    await pool.query('DELETE FROM tournament_pairings WHERE tournament_id = $1', [req.params.id]);
    await pool.query('DELETE FROM tournament_participants WHERE tournament_id = $1', [req.params.id]);
    await pool.query('DELETE FROM tournaments WHERE id = $1', [req.params.id]);
    
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (error) {
    console.error('Delete tournament error:', error);
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

// Get active games in tournament (for spectating)
router.get('/:id/active-games', authenticateToken, async (req, res) => {
  try {
    const pool = require('../utils/db');
    const result = await pool.query(`
      SELECT 
        tp.game_id,
        tp.round,
        g.status,
        w.username as white_username,
        b.username as black_username,
        g.created_at
      FROM tournament_pairings tp
      JOIN games g ON tp.game_id = g.id
      LEFT JOIN users w ON tp.white_player_id = w.id
      LEFT JOIN users b ON tp.black_player_id = b.id
      WHERE tp.tournament_id = $1 
        AND tp.is_bye = FALSE
        AND g.status = 'active'
      ORDER BY tp.round DESC, g.created_at DESC
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get active games error:', error);
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

// Admin: register a user for a tournament (bypasses payment)
router.post('/:id/admin-register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const result = await tournamentService.registerPlayer(req.params.id, userId);
    res.json(result);
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Quick create the official tournament (admin only)
router.post('/create-official-tournament', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pool = require('../utils/db');

    // Ensure entry_fee column exists
    await pool.query(`
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee INTEGER DEFAULT 0;
    `);

    // Create the tournament — FREE entry
    const result = await pool.query(`
      INSERT INTO tournaments (
        name, description, type, time_control, increment, max_players, total_rounds,
        status, current_round, start_time, forfeit_hours, is_arena, created_by, entry_fee
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `, [
      'Riddick Chess Open — April 2026',
      '🏆 The Riddick Chess Open!\n\n📅 Sign up now, tournament starts April 5th\n⏱️ 5+0 blitz games (5 minutes per player)\n🔄 Swiss system — 4 rounds\n👥 Open to everyone!\n\n🆓 FREE entry — just sign up and play!\n\nCome compete and climb the leaderboard!',
      'swiss',
      300,    // 5 minutes per player
      0,      // no increment
      32,     // max players
      4,      // 4 rounds
      'upcoming',
      0,
      '2026-04-05T12:00:00Z',  // April 5, 2026 noon UTC
      8,      // 8 hours to play each game
      false,
      req.user.id,
      0       // FREE
    ]);

    res.json({
      success: true,
      tournament: result.rows[0],
      viewUrl: `/tournament/${result.rows[0].id}`,
      message: 'Free tournament created! Share the tournaments page with students.'
    });
  } catch (error) {
    console.error('Create official tournament error:', error);
    if (error.message.includes('duplicate') || error.code === '23505') {
      res.status(400).json({ error: 'Tournament may already exist' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// ========================================
// TOURNAMENT CHAT — load history
// ========================================

router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const pool = require('../utils/db');
    const tournamentId = req.params.id;

    // Verify user is a participant
    const participant = await pool.query(
      'SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, req.user.id]
    );
    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a tournament participant' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before) : null;

    let query = `
      SELECT tm.id, tm.content, tm.created_at, tm.user_id,
             u.username, u.avatar
      FROM tournament_messages tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.tournament_id = $1
    `;
    const params = [tournamentId];

    if (before && Number.isInteger(before)) {
      query += ` AND tm.id < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY tm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    // Return oldest-first so UI can append
    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get tournament messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
