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
  // SECRET STORE TABLES
  // ========================================

  // Test 10: Secret store users table
  try {
    const storeUsersCheck = await pool.query('SELECT COUNT(*) as count FROM secret_store_users');
    addTest('Database', '[Store] Users', 'pass', { count: parseInt(storeUsersCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Users', 'fail', null, e.message);
  }

  // Test 11: Secret store products table
  try {
    const storeProductsCheck = await pool.query('SELECT COUNT(*) as count FROM secret_store_products');
    addTest('Database', '[Store] Products', 'pass', { count: parseInt(storeProductsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Products', 'fail', null, e.message);
  }

  // Test 12: Secret store orders table
  try {
    const storeOrdersCheck = await pool.query('SELECT COUNT(*) as count FROM secret_store_orders');
    addTest('Database', '[Store] Orders', 'pass', { count: parseInt(storeOrdersCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Orders', 'fail', null, e.message);
  }

  // Test 13: Secret store reviews table
  try {
    const storeReviewsCheck = await pool.query('SELECT COUNT(*) as count FROM secret_store_reviews');
    addTest('Database', '[Store] Reviews', 'pass', { count: parseInt(storeReviewsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Reviews', 'fail', null, e.message);
  }

  // Test 14: Secret store favorites table
  try {
    const storeFavoritesCheck = await pool.query('SELECT COUNT(*) as count FROM secret_store_favorites');
    addTest('Database', '[Store] Favorites', 'pass', { count: parseInt(storeFavoritesCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Favorites', 'fail', null, e.message);
  }

  // Test 15: Secret store discounts table
  try {
    const storeDiscountsCheck = await pool.query('SELECT COUNT(*) as count FROM secret_store_discounts');
    addTest('Database', '[Store] Discounts', 'pass', { count: parseInt(storeDiscountsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Discounts', 'fail', null, e.message);
  }

  // ========================================
  // STORE FEATURES TABLES
  // ========================================

  // Test 16: Store wants table
  try {
    const wantsCheck = await pool.query('SELECT COUNT(*) as count FROM store_wants');
    addTest('Database', '[Store] Wants', 'pass', { count: parseInt(wantsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Wants', 'fail', null, e.message);
  }

  // Test 17: Store loyalty table
  try {
    const loyaltyCheck = await pool.query('SELECT COUNT(*) as count FROM store_loyalty');
    addTest('Database', '[Store] Loyalty', 'pass', { count: parseInt(loyaltyCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Loyalty', 'fail', null, e.message);
  }

  // Test 18: Store referrals table
  try {
    const referralsCheck = await pool.query('SELECT COUNT(*) as count FROM store_referrals');
    addTest('Database', '[Store] Referrals', 'pass', { count: parseInt(referralsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Referrals', 'fail', null, e.message);
  }

  // Test 19: Store flash sales table
  try {
    const flashSalesCheck = await pool.query('SELECT COUNT(*) as count FROM store_flash_sales');
    addTest('Database', '[Store] Flash Sales', 'pass', { count: parseInt(flashSalesCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Flash Sales', 'fail', null, e.message);
  }

  // Test 20: Store gift cards table
  try {
    const giftCardsCheck = await pool.query('SELECT COUNT(*) as count FROM store_gift_cards');
    addTest('Database', '[Store] Gift Cards', 'pass', { count: parseInt(giftCardsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Gift Cards', 'fail', null, e.message);
  }

  // Test 21: Store announcements table
  try {
    const announcementsCheck = await pool.query('SELECT COUNT(*) as count FROM store_announcements');
    addTest('Database', '[Store] Announcements', 'pass', { count: parseInt(announcementsCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Announcements', 'fail', null, e.message);
  }

  // Test 22: Store chat table
  try {
    const chatCheck = await pool.query('SELECT COUNT(*) as count FROM store_chat');
    addTest('Database', '[Store] Chat', 'pass', { count: parseInt(chatCheck.rows[0].count) });
  } catch (e) {
    addTest('Database', '[Store] Chat', 'fail', null, e.message);
  }

  // ========================================
  // TABLE SCHEMA TESTS
  // ========================================

  // Test 23: Check user_ratings has vol columns
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

  // Test: Tournament participants table
  try {
    const participants = await pool.query('SELECT COUNT(*) as count FROM tournament_participants');
    const activeParticipants = await pool.query(`
      SELECT COUNT(*) as count FROM tournament_participants tp
      JOIN tournaments t ON tp.tournament_id = t.id
      WHERE t.status IN ('upcoming', 'active') AND tp.is_withdrawn = FALSE
    `);
    addTest('Database', '[Tournament] Participants', 'pass', {
      total: parseInt(participants.rows[0].count),
      activeRegistrations: parseInt(activeParticipants.rows[0].count)
    });
  } catch (e) {
    addTest('Database', '[Tournament] Participants', 'fail', null, e.message);
  }

  // Test: Tournament pairings table
  try {
    const pairings = await pool.query('SELECT COUNT(*) as count FROM tournament_pairings');
    const completedPairings = await pool.query(`SELECT COUNT(*) as count FROM tournament_pairings WHERE result IS NOT NULL`);
    const pendingPairings = await pool.query(`SELECT COUNT(*) as count FROM tournament_pairings WHERE result IS NULL AND is_bye = FALSE`);
    addTest('Database', '[Tournament] Pairings', 'pass', {
      total: parseInt(pairings.rows[0].count),
      completed: parseInt(completedPairings.rows[0].count),
      pending: parseInt(pendingPairings.rows[0].count)
    });
  } catch (e) {
    addTest('Database', '[Tournament] Pairings', 'fail', null, e.message);
  }

  // Test: Tournament service
  try {
    const tournamentService = require('../services/tournamentService');
    const activeTournaments = await tournamentService.getActiveTournaments(5);
    addTest('Services', 'Tournament Service', 'pass', { 
      activeTournamentsFound: activeTournaments.length
    });
  } catch (e) {
    addTest('Services', 'Tournament Service', 'fail', null, e.message);
  }

  // Test: Tournament schema columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tournament_participants'
    `);
    const colNames = cols.rows.map(r => r.column_name);
    const required = ['user_id', 'tournament_id', 'score', 'buchholz', 'opponents', 'colors', 'has_bye'];
    const missing = required.filter(c => !colNames.includes(c));
    if (missing.length > 0) {
      addTest('Schema', '[Tournament] Participant Columns', 'fail', { missing, found: colNames });
    } else {
      addTest('Schema', '[Tournament] Participant Columns', 'pass', { columns: required });
    }
  } catch (e) {
    addTest('Schema', '[Tournament] Participant Columns', 'fail', null, e.message);
  }

  // Test: Tournament no-show protection columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tournament_participants' 
      AND column_name IN ('last_activity', 'games_forfeited', 'is_active', 'checked_in')
    `);
    const found = cols.rows.map(r => r.column_name);
    const required = ['last_activity', 'games_forfeited', 'is_active', 'checked_in'];
    const missing = required.filter(c => !found.includes(c));
    if (missing.length > 0) {
      addTest('Schema', '[Tournament] No-Show Protection', 'warn', { missing }, 'Run init-db to add no-show protection columns');
    } else {
      addTest('Schema', '[Tournament] No-Show Protection', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', '[Tournament] No-Show Protection', 'fail', null, e.message);
  }

  // Test: Tournament forfeit columns in pairings
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tournament_pairings' 
      AND column_name IN ('forfeit_deadline', 'is_forfeited', 'forfeited_by')
    `);
    const found = cols.rows.map(r => r.column_name);
    if (found.length < 3) {
      addTest('Schema', '[Tournament] Forfeit Tracking', 'warn', { found }, 'Forfeit tracking columns not fully set up');
    } else {
      addTest('Schema', '[Tournament] Forfeit Tracking', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', '[Tournament] Forfeit Tracking', 'fail', null, e.message);
  }

  // Test: Tournament extended settings columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tournaments' 
      AND column_name IN ('registration_start', 'registration_end', 'tournament_end', 'forfeit_hours')
    `);
    const found = cols.rows.map(r => r.column_name);
    if (found.length < 4) {
      addTest('Schema', '[Tournament] Extended Settings', 'warn', { found }, 'Extended tournament settings not fully set up');
    } else {
      addTest('Schema', '[Tournament] Extended Settings', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', '[Tournament] Extended Settings', 'fail', null, e.message);
  }

  // Test: Forfeited games count
  try {
    const forfeited = await pool.query(`SELECT COUNT(*) as count FROM tournament_pairings WHERE is_forfeited = TRUE`);
    const totalForfeits = await pool.query(`SELECT COALESCE(SUM(games_forfeited), 0) as count FROM tournament_participants`);
    addTest('Features', '[Tournament] Forfeit System', 'pass', {
      forfeitedPairings: parseInt(forfeited.rows[0].count),
      totalPlayerForfeits: parseInt(totalForfeits.rows[0].count)
    });
  } catch (e) {
    // Tables might not have these columns yet
    addTest('Features', '[Tournament] Forfeit System', 'warn', null, 'Forfeit tracking not available: ' + e.message);
  }

  // Test 33: Puzzle system
  try {
    const totalPuzzles = await pool.query(`SELECT COUNT(*) as count FROM puzzles`);
    // themes is stored as text, not array - just count distinct themes
    const themeSample = await pool.query(`SELECT DISTINCT themes FROM puzzles LIMIT 20`);
    addTest('Features', 'Puzzle System', 'pass', {
      totalPuzzles: parseInt(totalPuzzles.rows[0].count),
      themeSamples: themeSample.rows.length
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

  // ========================================
  // BOT & ANALYSIS SYSTEM
  // ========================================

  // Test: Bots table
  try {
    const bots = await pool.query('SELECT COUNT(*) as count FROM bots WHERE is_active = true');
    const count = parseInt(bots.rows[0].count);
    if (count === 0) {
      addTest('Database', '[Bots] Bots Table', 'warn', { count }, 'No active bots found! Should have 6 bots seeded.');
    } else {
      addTest('Database', '[Bots] Bots Table', 'pass', { activeBots: count });
    }
  } catch (e) {
    addTest('Database', '[Bots] Bots Table', 'fail', null, e.message);
  }

  // Test: Bot games table
  try {
    const botGames = await pool.query('SELECT COUNT(*) as count FROM bot_games');
    const activeGames = await pool.query(`SELECT COUNT(*) as count FROM bot_games WHERE status = 'active'`);
    const completedGames = await pool.query(`SELECT COUNT(*) as count FROM bot_games WHERE status = 'completed'`);
    addTest('Database', '[Bots] Bot Games', 'pass', {
      total: parseInt(botGames.rows[0].count),
      active: parseInt(activeGames.rows[0].count),
      completed: parseInt(completedGames.rows[0].count)
    });
  } catch (e) {
    addTest('Database', '[Bots] Bot Games', 'fail', null, e.message);
  }

  // Test: Game analyses table
  try {
    const analyses = await pool.query('SELECT COUNT(*) as count FROM game_analyses');
    const completed = await pool.query(`SELECT COUNT(*) as count FROM game_analyses WHERE status = 'completed'`);
    const pending = await pool.query(`SELECT COUNT(*) as count FROM game_analyses WHERE status IN ('pending', 'analyzing')`);
    addTest('Database', '[Analysis] Analyses', 'pass', {
      total: parseInt(analyses.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      pending: parseInt(pending.rows[0].count)
    });
  } catch (e) {
    addTest('Database', '[Analysis] Analyses', 'fail', null, e.message);
  }

  // Test: Move evaluations table
  try {
    const evals = await pool.query('SELECT COUNT(*) as count FROM move_evaluations');
    addTest('Database', '[Analysis] Move Evaluations', 'pass', {
      totalEvaluations: parseInt(evals.rows[0].count)
    });
  } catch (e) {
    addTest('Database', '[Analysis] Move Evaluations', 'fail', null, e.message);
  }

  // Test: Bot list API
  try {
    const botList = await pool.query('SELECT id, name, emoji, elo, skill_level FROM bots WHERE is_active = true ORDER BY elo');
    addTest('API', '[Bots] List Bots', 'pass', {
      botsAvailable: botList.rows.length,
      bots: botList.rows.map(b => `${b.emoji} ${b.name} (${b.elo})`)
    });
  } catch (e) {
    addTest('API', '[Bots] List Bots', 'fail', null, e.message);
  }

  // Test: Bot engine service
  try {
    const botEngine = require('../services/botEngine');
    if (typeof botEngine.getBestMove === 'function') {
      addTest('Services', 'Bot Engine', 'pass', { 
        methods: ['getBestMove', 'evaluatePosition'] 
      });
    } else {
      addTest('Services', 'Bot Engine', 'warn', null, 'getBestMove method not found');
    }
  } catch (e) {
    addTest('Services', 'Bot Engine', 'fail', null, e.message);
  }

  // Test: User's bot game history
  try {
    const userBotGames = await pool.query(`
      SELECT COUNT(*) as count FROM bot_games WHERE user_id = $1
    `, [req.user.id]);
    addTest('API', '[Bots] User Bot Games', 'pass', {
      userBotGames: parseInt(userBotGames.rows[0].count)
    });
  } catch (e) {
    addTest('API', '[Bots] User Bot Games', 'fail', null, e.message);
  }

  // Test: User's analysis history
  try {
    const userAnalyses = await pool.query(`
      SELECT COUNT(*) as count FROM game_analyses WHERE user_id = $1
    `, [req.user.id]);
    addTest('API', '[Analysis] User Analyses', 'pass', {
      userAnalyses: parseInt(userAnalyses.rows[0].count)
    });
  } catch (e) {
    addTest('API', '[Analysis] User Analyses', 'fail', null, e.message);
  }

  // Test: Bot games integrity (no orphans)
  try {
    const orphanedBotGames = await pool.query(`
      SELECT COUNT(*) as count FROM bot_games bg
      LEFT JOIN users u ON bg.user_id = u.id
      LEFT JOIN bots b ON bg.bot_id = b.id
      WHERE u.id IS NULL OR b.id IS NULL
    `);
    const count = parseInt(orphanedBotGames.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Bot Games Orphans', 'warn', { orphanedCount: count }, 'Bot games with missing user or bot');
    } else {
      addTest('Integrity', 'Bot Games Orphans', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Bot Games Orphans', 'fail', null, e.message);
  }

  // Test: Analysis integrity (no orphans)
  try {
    const orphanedAnalyses = await pool.query(`
      SELECT COUNT(*) as count FROM game_analyses ga
      LEFT JOIN users u ON ga.user_id = u.id
      WHERE u.id IS NULL
    `);
    const count = parseInt(orphanedAnalyses.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Analysis Orphans', 'warn', { orphanedCount: count }, 'Analyses with missing user');
    } else {
      addTest('Integrity', 'Analysis Orphans', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Analysis Orphans', 'fail', null, e.message);
  }

  // ========================================
  // CLUB TABLES
  // ========================================

  // Test 36: Club info table
  try {
    const info = await pool.query('SELECT * FROM club_info WHERE id = 1');
    if (info.rows.length > 0) {
      addTest('Database', 'Club Info Table', 'pass', { clubName: info.rows[0].name });
    } else {
      addTest('Database', 'Club Info Table', 'warn', null, 'No club info record');
    }
  } catch (e) {
    addTest('Database', 'Club Info Table', 'fail', null, e.message);
  }

  // Test 37: Club chat table
  try {
    const chat = await pool.query('SELECT COUNT(*) as count FROM club_chat');
    addTest('Database', 'Club Chat Table', 'pass', { messages: parseInt(chat.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Club Chat Table', 'fail', null, e.message);
  }

  // Test 38: Club join requests table
  try {
    const requests = await pool.query('SELECT COUNT(*) as count FROM club_join_requests');
    const pending = await pool.query(`SELECT COUNT(*) as count FROM club_join_requests WHERE status = 'pending'`);
    addTest('Database', 'Club Join Requests', 'pass', { 
      total: parseInt(requests.rows[0].count),
      pending: parseInt(pending.rows[0].count)
    });
  } catch (e) {
    addTest('Database', 'Club Join Requests', 'fail', null, e.message);
  }

  // ========================================
  // ANNOUNCEMENTS SYSTEM
  // ========================================

  // Test 39: Announcements table
  try {
    const announcements = await pool.query('SELECT COUNT(*) as count FROM announcements');
    const active = await pool.query(`SELECT COUNT(*) as count FROM announcements WHERE expires_at IS NULL OR expires_at > NOW()`);
    addTest('Database', 'Announcements Table', 'pass', {
      total: parseInt(announcements.rows[0].count),
      active: parseInt(active.rows[0].count)
    });
  } catch (e) {
    addTest('Database', 'Announcements Table', 'fail', null, e.message);
  }

  // ========================================
  // USER MODERATION SCHEMA
  // ========================================

  // Test 40: User ban columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('is_banned', 'ban_reason', 'ban_expires')
    `);
    const found = cols.rows.map(r => r.column_name);
    const required = ['is_banned', 'ban_reason', 'ban_expires'];
    const missing = required.filter(c => !found.includes(c));
    if (missing.length > 0) {
      addTest('Schema', 'User Ban Columns', 'fail', { missing });
    } else {
      addTest('Schema', 'User Ban Columns', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', 'User Ban Columns', 'fail', null, e.message);
  }

  // Test 41: User mute columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('is_muted', 'mute_expires')
    `);
    const found = cols.rows.map(r => r.column_name);
    const required = ['is_muted', 'mute_expires'];
    const missing = required.filter(c => !found.includes(c));
    if (missing.length > 0) {
      addTest('Schema', 'User Mute Columns', 'fail', { missing });
    } else {
      addTest('Schema', 'User Mute Columns', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', 'User Mute Columns', 'fail', null, e.message);
  }

  // Test 42: Password reset columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_token_expires', 'must_change_password')
    `);
    const found = cols.rows.map(r => r.column_name);
    const required = ['reset_token', 'reset_token_expires', 'must_change_password'];
    const missing = required.filter(c => !found.includes(c));
    if (missing.length > 0) {
      addTest('Schema', 'Password Reset Columns', 'fail', { missing });
    } else {
      addTest('Schema', 'Password Reset Columns', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', 'Password Reset Columns', 'fail', null, e.message);
  }

  // Test 43: User customization columns
  try {
    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('board_theme', 'piece_set')
    `);
    const found = cols.rows.map(r => r.column_name);
    if (found.length < 2) {
      addTest('Schema', 'Customization Columns', 'fail', { found }, 'Missing board_theme or piece_set');
    } else {
      addTest('Schema', 'Customization Columns', 'pass', { columns: found });
    }
  } catch (e) {
    addTest('Schema', 'Customization Columns', 'fail', null, e.message);
  }

  // ========================================
  // ADMIN FUNCTIONS
  // ========================================

  // Test 44: Admin stats endpoint
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_banned = FALSE) as users,
        (SELECT COUNT(*) FROM games) as games,
        (SELECT COUNT(*) FROM users WHERE is_club_member = TRUE) as club
    `);
    addTest('Admin', 'Stats Query', 'pass', {
      users: parseInt(stats.rows[0].users),
      games: parseInt(stats.rows[0].games),
      clubMembers: parseInt(stats.rows[0].club)
    });
  } catch (e) {
    addTest('Admin', 'Stats Query', 'fail', null, e.message);
  }

  // Test 45: Banned users count
  try {
    const banned = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_banned = TRUE');
    const muted = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_muted = TRUE');
    addTest('Admin', 'Moderation Status', 'pass', {
      bannedUsers: parseInt(banned.rows[0].count),
      mutedUsers: parseInt(muted.rows[0].count)
    });
  } catch (e) {
    addTest('Admin', 'Moderation Status', 'fail', null, e.message);
  }

  // Test 46: Admin users count
  try {
    const admins = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = TRUE');
    addTest('Admin', 'Admin Users', 'pass', { adminCount: parseInt(admins.rows[0].count) });
  } catch (e) {
    addTest('Admin', 'Admin Users', 'fail', null, e.message);
  }

  // ========================================
  // FAIR PLAY & REPORTS
  // ========================================

  // Test 47: Fair play reports table
  try {
    const reports = await pool.query('SELECT COUNT(*) as count FROM fair_play_reports');
    const pending = await pool.query(`SELECT COUNT(*) as count FROM fair_play_reports WHERE status = 'pending'`);
    addTest('Database', 'Fair Play Reports', 'pass', {
      total: parseInt(reports.rows[0].count),
      pending: parseInt(pending.rows[0].count)
    });
  } catch (e) {
    addTest('Database', 'Fair Play Reports', 'warn', null, e.message);
  }

  // ========================================
  // PUZZLE ATTEMPTS & RUSH
  // ========================================

  // Test 48: Puzzle attempts table
  try {
    const attempts = await pool.query('SELECT COUNT(*) as count FROM puzzle_attempts');
    addTest('Database', 'Puzzle Attempts', 'pass', { attempts: parseInt(attempts.rows[0].count) });
  } catch (e) {
    addTest('Database', 'Puzzle Attempts', 'fail', null, e.message);
  }

  // Test 49: Puzzle rush scores
  try {
    const rushScores = await pool.query('SELECT COUNT(*) as count FROM puzzle_rush_scores');
    const highScore = await pool.query('SELECT MAX(score) as max FROM puzzle_rush_scores');
    addTest('Features', 'Puzzle Rush', 'pass', {
      totalAttempts: parseInt(rushScores.rows[0].count),
      highScore: parseInt(highScore.rows[0].max) || 0
    });
  } catch (e) {
    addTest('Features', 'Puzzle Rush', 'warn', null, e.message);
  }

  // ========================================
  // USER ACHIEVEMENTS
  // ========================================

  // Test 50: User achievements table
  try {
    const ua = await pool.query('SELECT COUNT(*) as count FROM user_achievements');
    const uniqueUsers = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM user_achievements');
    addTest('Database', 'User Achievements', 'pass', {
      totalAwarded: parseInt(ua.rows[0].count),
      usersWithAchievements: parseInt(uniqueUsers.rows[0].count)
    });
  } catch (e) {
    addTest('Database', 'User Achievements', 'fail', null, e.message);
  }

  // ========================================
  // EXPIRED BANS/MUTES CHECK
  // ========================================

  // Test 51: Expired bans still active
  try {
    const expiredBans = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE is_banned = TRUE AND ban_expires IS NOT NULL AND ban_expires < NOW()
    `);
    const count = parseInt(expiredBans.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Expired Bans', 'warn', { expiredBanCount: count }, 'Users with expired bans still marked as banned');
    } else {
      addTest('Integrity', 'Expired Bans', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Expired Bans', 'fail', null, e.message);
  }

  // Test 52: Expired mutes still active
  try {
    const expiredMutes = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE is_muted = TRUE AND mute_expires IS NOT NULL AND mute_expires < NOW()
    `);
    const count = parseInt(expiredMutes.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Expired Mutes', 'warn', { expiredMuteCount: count }, 'Users with expired mutes still marked as muted');
    } else {
      addTest('Integrity', 'Expired Mutes', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Expired Mutes', 'fail', null, e.message);
  }

  // ========================================
  // EXPIRED RESET TOKENS
  // ========================================

  // Test 53: Expired reset tokens
  try {
    const expiredTokens = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE reset_token IS NOT NULL AND reset_token_expires < NOW()
    `);
    const count = parseInt(expiredTokens.rows[0].count);
    if (count > 0) {
      addTest('Integrity', 'Expired Reset Tokens', 'warn', { count }, 'Expired password reset tokens should be cleaned up');
    } else {
      addTest('Integrity', 'Expired Reset Tokens', 'pass');
    }
  } catch (e) {
    addTest('Integrity', 'Expired Reset Tokens', 'fail', null, e.message);
  }

  // ========================================
  // SOCKET EVENTS COVERAGE
  // ========================================

  // Test 54: Club chat socket readiness
  try {
    const clubMembers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_club_member = TRUE');
    addTest('Realtime', 'Club Chat Ready', 'pass', { 
      potentialChatUsers: parseInt(clubMembers.rows[0].count)
    });
  } catch (e) {
    addTest('Realtime', 'Club Chat Ready', 'fail', null, e.message);
  }

  // ========================================
  // FULL TABLE LIST CHECK
  // ========================================

  // Test 55: All required tables exist
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tableNames = tables.rows.map(r => r.table_name);
    const required = [
      'users', 'games', 'user_ratings', 'puzzles', 'puzzle_attempts',
      'achievements', 'user_achievements', 'friendships', 'messages',
      'tournaments', 'tournament_participants', 'tournament_pairings',
      'club_info', 'club_chat', 'club_join_requests', 'announcements'
    ];
    const missing = required.filter(t => !tableNames.includes(t));
    if (missing.length > 0) {
      addTest('Schema', 'Required Tables', 'fail', { missing, found: tableNames.length });
    } else {
      addTest('Schema', 'Required Tables', 'pass', { tableCount: tableNames.length });
    }
  } catch (e) {
    addTest('Schema', 'Required Tables', 'fail', null, e.message);
  }

  // Calculate final summary
  results.summary.passRate = results.summary.total > 0 
    ? Math.round((results.summary.passed / results.summary.total) * 100) 
    : 0;
  
  results.duration = Date.now() - new Date(results.timestamp).getTime();

  // Add store features summary
  try {
    const wantsCheck = await pool.query('SELECT COUNT(*) as count FROM store_wants');
    const loyaltyCheck = await pool.query('SELECT COUNT(*) as count FROM store_loyalty');
    const referralsCheck = await pool.query('SELECT COUNT(*) as count FROM store_referrals');
    const flashSalesCheck = await pool.query('SELECT COUNT(*) as count FROM store_flash_sales');
    const giftCardsCheck = await pool.query('SELECT COUNT(*) as count FROM store_gift_cards');
    const announcementsCheck = await pool.query('SELECT COUNT(*) as count FROM store_announcements');
    const chatCheck = await pool.query('SELECT COUNT(*) as count FROM store_chat');

    results.storeFeatures = {
      wants: { status: 'ok', count: parseInt(wantsCheck.rows[0].count) },
      loyalty: { status: 'ok', count: parseInt(loyaltyCheck.rows[0].count) },
      referrals: { status: 'ok', count: parseInt(referralsCheck.rows[0].count) },
      flashSales: { status: 'ok', count: parseInt(flashSalesCheck.rows[0].count) },
      giftCards: { status: 'ok', count: parseInt(giftCardsCheck.rows[0].count) },
      announcements: { status: 'ok', count: parseInt(announcementsCheck.rows[0].count) },
      chat: { status: 'ok', count: parseInt(chatCheck.rows[0].count) }
    };
  } catch (e) {
    results.storeFeatures = {
      error: 'Failed to check store features tables',
      message: e.message
    };
  }

  res.json(results);
});

module.exports = router;
