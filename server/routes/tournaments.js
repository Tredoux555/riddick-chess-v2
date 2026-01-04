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

// Quick create the official tournament (admin only) - one time use
router.post('/create-official-tournament', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pool = require('../utils/db');
    
    // First add any missing columns
    await pool.query(`
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMP;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_end TIMESTAMP;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_end TIMESTAMP;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS forfeit_hours INTEGER DEFAULT 24;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 5;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS increment INTEGER DEFAULT 0;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_arena BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS games_forfeited INTEGER DEFAULT 0;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT FALSE;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS forfeit_deadline TIMESTAMP;
      ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS is_forfeited BOOLEAN DEFAULT FALSE;
      ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS forfeited_by INTEGER;
    `);

    // Create the tournament
    const result = await pool.query(`
      INSERT INTO tournaments (
        name, description, type, time_control, increment, max_players, total_rounds,
        status, current_round, start_time, registration_start, registration_end,
        tournament_end, forfeit_hours, is_arena, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
    `, [
      "Riddick from G5-1's Official Tournament",
      `🏆 The schoolwide official back-to-school tournament!
返校官方锦标赛！欢迎所有人参加！

📅 SCHEDULE / 时间安排
• Sign up / 报名: Mon Jan 5th - Fri Jan 9th 5PM
• Tournament / 比赛: Fri Jan 9th 5PM - Sun Jan 11th 6PM
• Finals / 决赛: Mon Jan 12th at Recess (in person! 当面对决！)

⏱️ GAME FORMAT / 比赛形式
• 10 minutes per player, no extra time
• 每人10分钟，无加时

⚠️ RULES / 规则
• You have 8 HOURS to play each game or forfeit
• 每场比赛必须在8小时内完成，否则判负
• 2 forfeits = kicked out / 两次弃权 = 退出比赛
• Top 2 play finals IN PERSON! / 前两名现场决赛！

🎯 Anyone can join! Come have fun!
欢迎所有人参加！来玩吧！`,
      'swiss',
      600,    // 10 minutes
      0,      // no increment
      500,    // max players (realistic)
      6,      // 6 rounds (good for up to 64 players, can extend)
      'upcoming',
      0,
      '2026-01-09T09:00:00Z',  // Fri Jan 9 5PM Beijing = 9AM UTC
      '2026-01-04T16:00:00Z',  // Mon Jan 5 midnight Beijing
      '2026-01-09T09:00:00Z',  // Registration ends when tournament starts
      '2026-01-11T10:00:00Z',  // Sun Jan 11 6PM Beijing
      8,      // 8 HOURS to play each game
      false,
      req.user.id
    ]);

    res.json({ 
      success: true, 
      tournament: result.rows[0],
      viewUrl: `/tournament/${result.rows[0].id}`,
      message: 'Tournament created! Share the tournaments page with students.'
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

module.exports = router;
