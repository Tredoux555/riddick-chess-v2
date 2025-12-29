const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../utils/db');

// Health check endpoint - tests all systems
router.get('/health-check', authenticateToken, requireAdmin, async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    server: 'riddickchess.site',
    version: '2.0',
    tests: [],
    summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
  };

  const addTest = (category, name, status, details = null, error = null) => {
    results.tests.push({ category, name, status, details, error, time: Date.now() });
    results.summary.total++;
    if (status === 'pass') results.summary.passed++;
    else if (status === 'fail') results.summary.failed++;
    else if (status === 'warn') results.summary.warnings++;
  };

  // ========================================
  // DATABASE TESTS
  // ========================================
  
  // Test 1: Database connection
  try {
    const dbResult = await pool.query('SELECT NOW() as time, version() as version');
    addTest('Database', 'Connection', 'pass', { 
      serverTime: dbResult.rows[0].time,
      version: dbResult.rows[0].version.substring(0, 50) + '...'
    });
  } catch (e) {
    addTest('Database', 'Connection', 'fail', null, e.message);
  }

  // Test 2: Users table
  try {
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    addTest('Database', 'Users Table', 'pass', { count: parseInt(users.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Users Table', 'fail', null, e.message);
  }

  // Test 3: Games table
  try {
    const games = await pool.query('SELECT COUNT(*) as count FROM games');
    addTest('Database', 'Games Table', 'pass', { count: parseInt(games.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Games Table', 'fail', null, e.message);
  }

  // Test 4: User ratings table
  try {
    const ratings = await pool.query('SELECT COUNT(*) as count FROM user_ratings');
    addTest('Database', 'Ratings Table', 'pass', { count: parseInt(ratings.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Ratings Table', 'fail', null, e.message);
  }

  // Test 5: Puzzles table
  try {
    const puzzles = await pool.query('SELECT COUNT(*) as count FROM puzzles');
    const count = parseInt(puzzles.rows[0].count);
    if (count === 0) {
      addTest('Database', 'Puzzles Table', 'warn', { count, message: 'No puzzles loaded! Run seed-puzzles.' });
    } else {
      addTest('Database', 'Puzzles Table', 'pass', { count });
    }
  } catch (e) {
    addTest('Database', 'Puzzles Table', 'fail', null, e.message);
  }

  // Test 6: Achievements table
  try {
    const achievements = await pool.query('SELECT COUNT(*) as count FROM achievements');
    addTest('Database', 'Achievements Table', 'pass', { count: parseInt(achievements.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Achievements Table', 'fail', null, e.message);
  }

  // Test 7: Tournaments table
  try {
    const tournaments = await pool.query('SELECT COUNT(*) as count FROM tournaments');
    addTest('Database', 'Tournaments Table', 'pass', { count: parseInt(tournaments.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Tournaments Table', 'fail', null, e.message);
  }

  // Test 8: Messages table
  try {
    const messages = await pool.query('SELECT COUNT(*) as count FROM messages');
    addTest('Database', 'Messages Table', 'pass', { count: parseInt(messages.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Messages Table', 'fail', null, e.message);
  }

  // Test 9: Friendships table
  try {
    const friendships = await pool.query('SELECT COUNT(*) as count FROM friendships');
    addTest('Database', 'Friendships Table', 'pass', { count: parseInt(friendships.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Friendships Table', 'fail', null, e.message);
  }

  // ========================================
  // TABLE SCHEMA TESTS
  // ========================================

  // Test 10: Check user_ratings has vol columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_ratings' AND column_name LIKE '%_vol'
    `);
    const volCols = cols.rows.map(r => r.column_name);
    const required = ['bullet_vol', 'blitz_vol', 'rapid_vol', 'classical_vol'];
    const missing = required.filter(c => !volCols.includes(c));
    if (missing.length > 0) {
      addTest('Schema', 'Rating Vol Columns', 'fail', { missing }, 'Missing volatility columns for Glicko-2');
    } else {
      addTest('Schema', 'Rating Vol Columns', 'pass', { columns: volCols });
    }
  } catch (e) {
    addTest('Schema', 'Rating Vol Columns', 'fail', null, e.message);
  }

  // Test 11: Check messages table has game_id
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'game_id'
    `);
    if (cols.rows.length === 0) {
      addTest('Schema', 'Messages game_id Column', 'fail', null, 'Missing game_id column for in-game chat');
    } else {
      addTest('Schema', 'Messages game_id Column', 'pass');
    }
  } catch (e) {
    addTest('Schema', 'Messages game_id Column', 'fail', null, e.message);
  }

  // Test 12: Check tournament_participants columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tournament_participants'
    `);
    const colNames = cols.rows.map(r => r.column_name);
    const required = ['user_id', 'tournament_id', 'score', 'buchholz', 'opponents', 'colors', 'has_bye'];
    const missing = required.filter(c => !colNames.includes(c));
    if (missing.length > 0) {
      addTest('Schema', 'Tournament Participants', 'fail', { missing, found: colNames });
    } else {
      addTest('Schema', 'Tournament Participants', 'pass', { columns: colNames });
    }
  } catch (e) {
    addTest('Schema', 'Tournament Participants', 'fail', null, e.message);
  }

  // ========================================
  // SERVICE TESTS
  // ========================================

  // Test 13: Rating Service
  try {
    const ratingService = require('../services/ratingService');
    const testRating = await ratingService.getUserRating(req.user.id, 600);
    addTest('Services', 'Rating Service', 'pass', { 
      rating: Math.round(testRating.rating),
      rd: Math.round(testRating.rd)
    });
  } catch (e) {
    addTest('Services', 'Rating Service', 'fail', null, e.message);
  }

  // Test 14: Achievement Service
  try {
    const achievementService = require('../services/achievementService');
    const achievements = await achievementService.getUserAchievements(req.user.id);
    addTest('Services', 'Achievement Service', 'pass', { 
      achievementCount: achievements.length 
    });
  } catch (e) {
    addTest('Services', 'Achievement Service', 'fail', null, e.message);
  }

  // Test 15: Puzzle Service
  try {
    const puzzleService = require('../services/puzzleService');
    const puzzle = await puzzleService.getNextPuzzle(req.user.id);
    if (puzzle) {
      addTest('Services', 'Puzzle Service', 'pass', { puzzleId: puzzle.id });
    } else {
      addTest('Services', 'Puzzle Service', 'warn', null, 'No puzzles available');
    }
  } catch (e) {
    addTest('Services', 'Puzzle Service', 'fail', null, e.message);
  }

  // Test 16: Tournament Service
  try {
    const tournamentService = require('../services/tournamentService');
    const tournaments = await tournamentService.getActiveTournaments(5);
    addTest('Services', 'Tournament Service', 'pass', { 
      activeTournaments: tournaments.length 
    });
  } catch (e) {
    addTest('Services', 'Tournament Service', 'fail', null, e.message);
  }

  // ========================================
  // API ROUTE TESTS
  // ========================================

  // Test 17: Auth /me endpoint
  try {
    const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length > 0) {
      addTest('API', 'Auth /me', 'pass', { userId: user.rows[0].id, username: user.rows[0].username });
    } else {
      addTest('API', 'Auth /me', 'fail', null, 'User not found');
    }
  } catch (e) {
    addTest('API', 'Auth /me', 'fail', null, e.message);
  }

  // Test 18: Users search
  try {
    const users = await pool.query(`
      SELECT id, username FROM users WHERE username ILIKE $1 LIMIT 5
    `, ['%test%']);
    addTest('API', 'Users Search', 'pass', { resultsFound: users.rows.length });
  } catch (e) {
    addTest('API', 'Users Search', 'fail', null, e.message);
  }

  // Test 19: Games list
  try {
    const games = await pool.query(`
      SELECT id FROM games 
      WHERE white_player_id = $1 OR black_player_id = $1 
      ORDER BY created_at DESC LIMIT 5
    `, [req.user.id]);
    addTest('API', 'Games List', 'pass', { gamesFound: games.rows.length });
  } catch (e) {
    addTest('API', 'Games List', 'fail', null, e.message);
  }

  // Test 20: Leaderboards ratings
  try {
    const leaderboard = await pool.query(`
      SELECT u.id, u.username, ur.blitz_rating
      FROM users u
      JOIN user_ratings ur ON u.id = ur.user_id
      WHERE ur.blitz_games >= 1
      ORDER BY ur.blitz_rating DESC
      LIMIT 10
    `);
    addTest('API', 'Leaderboards', 'pass', { topPlayersCount: leaderboard.rows.length });
  } catch (e) {
    addTest('API', 'Leaderboards', 'fail', null, e.message);
  }

  // Test 21: Friends list
  try {
    const friends = await pool.query(`
      SELECT f.id FROM friendships f
      WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
    `, [req.user.id]);
    addTest('API', 'Friends List', 'pass', { friendsCount: friends.rows.length });
  } catch (e) {
    addTest('API', 'Friends List', 'fail', null, e.message);
  }

  // Test 22: Club status
  try {
    const club = await pool.query('SELECT is_club_member FROM users WHERE id = $1', [req.user.id]);
    addTest('API', 'Club Status', 'pass', { isClubMember: club.rows[0]?.is_club_member || false });
  } catch (e) {
    addTest('API', 'Club Status', 'fail', null, e.message);
  }

  // Test 23: Customization preferences
  try {
    const prefs = await pool.query('SELECT board_theme, piece_set FROM users WHERE id = $1', [req.user.id]);
    addTest('API', 'Customization', 'pass', { 
      boardTheme: prefs.rows[0]?.board_theme || 'default',
      pieceSet: prefs.rows[0]?.piece_set || 'default'
    });
  } catch (e) {
    addTest('API', 'Customization', 'fail', null, e.message);
  }

  // ========================================
  // DATA INTEGRITY TESTS
  // ========================================

  // Test 24: Orphaned ratings check
  try {
    const orphaned = await pool.query(`
      SELECT COUNT(*) as count FROM user_ratings ur
      LEFT JOIN users u ON ur.user_id = u.id
      WHERE u.id IS NULL
    `);
    const count = parseInt(orphaned.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Orphaned Ratings', 'warn', { orphanedCount: count }, 'Found ratings without users');
    } else {
      addTest('Integrity', 'Orphaned Ratings', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Orphaned Ratings', 'fail', null, e.message);
  }

  // Test 25: Games with missing players
  try {
    const orphaned = await pool.query(`
      SELECT COUNT(*) as count FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE w.id IS NULL OR b.id IS NULL
    `);
    const count = parseInt(orphaned.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Games Missing Players', 'warn', { count }, 'Games with deleted players');
    } else {
      addTest('Integrity', 'Games Missing Players', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Games Missing Players', 'fail', null, e.message);
  }

  // Test 26: Users without ratings
  try {
    const missing = await pool.query(`
      SELECT COUNT(*) as count FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE ur.user_id IS NULL
    `);
    const count = parseInt(missing.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Users Without Ratings', 'warn', { count }, 'Users missing rating records');
    } else {
      addTest('Integrity', 'Users Without Ratings', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Users Without Ratings', 'fail', null, e.message);
  }

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  // Test 27: Query performance - simple select
  try {
    const start = Date.now();
    await pool.query('SELECT COUNT(*) FROM users');
    const duration = Date.now() - start;
    if (duration > 1000) {
      addTest('Performance', 'Simple Query', 'warn', { durationMs: duration }, 'Query took over 1 second');
    } else {
      addTest('Performance', 'Simple Query', 'pass', { durationMs: duration });
    }
  } catch (e) {
    addTest('Performance', 'Simple Query', 'fail', null, e.message);
  }

  // Test 28: Complex join performance
  try {
    const start = Date.now();
    await pool.query(`
      SELECT g.id, w.username, b.username
      FROM games g
      JOIN users w ON g.white_player_id = w.id
      JOIN users b ON g.black_player_id = b.id
      LIMIT 100
    `);
    const duration = Date.now() - start;
    if (duration > 2000) {
      addTest('Performance', 'Complex Query', 'warn', { durationMs: duration }, 'Query took over 2 seconds');
    } else {
      addTest('Performance', 'Complex Query', 'pass', { durationMs: duration });
    }
  } catch (e) {
    addTest('Performance', 'Complex Query', 'fail', null, e.message);
  }

  // Test 29: Active connections
  try {
    const conns = await pool.query(`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `);
    const count = parseInt(conns.rows[0].count);
    if (count > 50) {
      addTest('Performance', 'DB Connections', 'warn', { activeConnections: count }, 'High connection count');
    } else {
      addTest('Performance', 'DB Connections', 'pass', { activeConnections: count });
    }
  } catch (e) {
    addTest('Performance', 'DB Connections', 'fail', null, e.message);
  }

  // ========================================
  // SOCKET/REALTIME TESTS
  // ========================================

  // Test 30: Active games in memory (indirect check)
  try {
    const activeGames = await pool.query(`
      SELECT COUNT(*) as count FROM games WHERE status = 'active'
    `);
    addTest('Realtime', 'Active Games', 'pass', { 
      activeInDB: parseInt(activeGames.rows[0].count)
    });
  } catch (e) {
    addTest('Realtime', 'Active Games', 'fail', null, e.message);
  }

  // Test 31: Recent online users
  try {
    const online = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_online > NOW() - INTERVAL '5 minutes'
    `);
    addTest('Realtime', 'Online Users', 'pass', { 
      recentlyOnline: parseInt(online.rows[0].count)
    });
  } catch (e) {
    addTest('Realtime', 'Online Users', 'fail', null, e.message);
  }

  // ========================================
  // FEATURE SPECIFIC TESTS
  // ========================================

  // Test 32: Tournament system
  try {
    const upcoming = await pool.query(`SELECT COUNT(*) as count FROM tournaments WHERE status = 'upcoming'`);
    const active = await pool.query(`SELECT COUNT(*) as count FROM tournaments WHERE status = 'active'`);
    const completed = await pool.query(`SELECT COUNT(*) as count FROM tournaments WHERE status = 'completed'`);
    addTest('Features', 'Tournaments', 'pass', {
      upcoming: parseInt(upcoming.rows[0].count),
      active: parseInt(active.rows[0].count),
      completed: parseInt(completed.rows[0].count)
    });
  } catch (e) {
    addTest('Features', 'Tournaments', 'fail', null, e.message);
  }

  // Test 33: Puzzle system
  try {
    const themes = await pool.query(`SELECT DISTINCT unnest(themes) as theme FROM puzzles LIMIT 20`);
    const totalPuzzles = await pool.query(`SELECT COUNT(*) as count FROM puzzles`);
    addTest('Features', 'Puzzle System', 'pass', {
      totalPuzzles: parseInt(totalPuzzles.rows[0].count),
      themesAvailable: themes.rows.length
    });
  } catch (e) {
    addTest('Features', 'Puzzle System', 'fail', null, e.message);
  }

  // Test 34: Achievement badges
  try {
    const badges = await pool.query(`SELECT COUNT(*) as count FROM achievements`);
    const awarded = await pool.query(`SELECT COUNT(*) as count FROM user_achievements`);
    addTest('Features', 'Achievements', 'pass', {
      totalBadges: parseInt(badges.rows[0].count),
      totalAwarded: parseInt(awarded.rows[0].count)
    });
  } catch (e) {
    addTest('Features', 'Achievements', 'fail', null, e.message);
  }

  // Test 35: Club system
  try {
    const members = await pool.query(`SELECT COUNT(*) as count FROM users WHERE is_club_member = true`);
    const content = await pool.query(`SELECT COUNT(*) as count FROM club_content`);
    addTest('Features', 'Club System', 'pass', {
      members: parseInt(members.rows[0].count),
      contentItems: parseInt(content.rows[0].count)
    });
  } catch (e) {
    // Club content table might not exist
    addTest('Features', 'Club System', 'warn', null, e.message);
  }

  // Calculate final summary
  results.summary.passRate = results.summary.total > 0 
    ? Math.round((results.summary.passed / results.summary.total) * 100) 
    : 0;
  
  results.duration = Date.now() - new Date(results.timestamp).getTime();

  res.json(results);
});

module.exports = router;
