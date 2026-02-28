/**
 * Puzzle Service
 * Handles puzzle logic, ratings, and Puzzle Rush
 */

const { Chess } = require('chess.js');
const { Glicko2 } = require('glicko2');
const pool = require('../utils/db');

class PuzzleService {
  constructor() {
    this.glicko = new Glicko2({
      tau: 0.5,
      rating: 500,
      rd: 350,
      vol: 0.06
    });
  }

  /**
   * Get a puzzle matched to user's rating
   */
  async getNextPuzzle(userId, options = {}) {
    const { themes, minRating, maxRating, excludeRecent = true } = options;

    // For anonymous users, use default rating
    let userRating = { rating: 500, rd: 350, vol: 0.06, puzzles_solved: 0 };
    if (userId) {
      userRating = await this.getUserPuzzleRating(userId);
    }

    // Target slightly above user rating for challenge
    const targetRating = userRating.rating + 50;
    const ratingRange = 200;

    let query, params;

    if (userId) {
      query = `
        SELECT p.*
        FROM puzzles p
        WHERE p.rating BETWEEN $2 AND $3
          AND p.fen IS NOT NULL AND p.fen != ''
          AND p.fen != 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          AND p.moves IS NOT NULL AND p.moves != ''
      `;
      params = [
        userId,
        minRating || Math.max(800, targetRating - ratingRange),
        maxRating || Math.min(2800, targetRating + ratingRange)
      ];

      // Exclude recently attempted puzzles
      if (excludeRecent) {
        query += `
          AND p.id NOT IN (
            SELECT puzzle_id FROM puzzle_attempts
            WHERE user_id = $1
            AND created_at > NOW() - INTERVAL '24 hours'
          )
        `;
      }
    } else {
      // Anonymous user - just pick a random puzzle in range
      query = `
        SELECT p.*
        FROM puzzles p
        WHERE p.rating BETWEEN $1 AND $2
          AND p.fen IS NOT NULL AND p.fen != ''
          AND p.fen != 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
          AND p.moves IS NOT NULL AND p.moves != ''
      `;
      params = [
        minRating || Math.max(800, targetRating - ratingRange),
        maxRating || Math.min(2800, targetRating + ratingRange)
      ];
    }

    query += ` ORDER BY RANDOM() LIMIT 1`;

    try {
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        // Fallback: get any valid puzzle in wider range
        const fallback = await pool.query(`
          SELECT * FROM puzzles 
          WHERE rating BETWEEN $1 AND $2
            AND fen IS NOT NULL AND fen != ''
            AND moves IS NOT NULL AND moves != ''
          ORDER BY RANDOM() LIMIT 1
        `, [targetRating - 500, targetRating + 500]);
        
        if (fallback.rows.length === 0) {
          // Ultra fallback: just get any puzzle
          const any = await pool.query(`SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1`);
          return any.rows[0] || null;
        }
        
        return fallback.rows[0] || null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('getNextPuzzle error:', error.message);
      // On any DB error, try simplest possible query
      try {
        const simple = await pool.query(`SELECT * FROM puzzles ORDER BY RANDOM() LIMIT 1`);
        return simple.rows[0] || null;
      } catch (e) {
        return null;
      }
    }
  }

  /**
   * Get today's daily puzzle
   */
  async getDailyPuzzle() {
    // Check if today's puzzle exists
    let result = await pool.query(`
      SELECT dp.*, p.fen, p.moves, p.rating, p.themes
      FROM daily_puzzles dp
      JOIN puzzles p ON dp.puzzle_id = p.id
      WHERE dp.date = CURRENT_DATE
    `);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create today's puzzle - pick a good quality puzzle
    const puzzle = await pool.query(`
      SELECT id FROM puzzles 
      WHERE rating BETWEEN 1200 AND 1800
      AND plays > 10
      AND (successes::float / NULLIF(plays, 0)) BETWEEN 0.4 AND 0.7
      AND id NOT IN (SELECT puzzle_id FROM daily_puzzles WHERE date > CURRENT_DATE - INTERVAL '30 days')
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (puzzle.rows.length === 0) {
      // Fallback to any puzzle
      const fallback = await pool.query(`
        SELECT id FROM puzzles ORDER BY RANDOM() LIMIT 1
      `);
      if (fallback.rows.length === 0) return null;
      
      await pool.query(`
        INSERT INTO daily_puzzles (puzzle_id, date) VALUES ($1, CURRENT_DATE)
      `, [fallback.rows[0].id]);
      
      return this.getDailyPuzzle();
    }

    await pool.query(`
      INSERT INTO daily_puzzles (puzzle_id, date) VALUES ($1, CURRENT_DATE)
    `, [puzzle.rows[0].id]);

    return this.getDailyPuzzle();
  }

  /**
   * Validate a move in a puzzle
   */
  validateMove(fen, solutionMoves, userMove, moveIndex = 0) {
    const chess = new Chess(fen);
    const movesArray = solutionMoves.split(' ').filter(m => m.length > 0);
    
    // Play moves up to current position
    for (let i = 0; i < moveIndex; i++) {
      const move = movesArray[i];
      chess.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4] || undefined
      });
    }

    // Try user's move
    const expectedMove = movesArray[moveIndex];
    let move;
    
    try {
      // Handle both UCI and SAN notation
      if (userMove.length >= 4 && /^[a-h][1-8][a-h][1-8]/.test(userMove)) {
        // UCI format (e2e4)
        move = chess.move({
          from: userMove.slice(0, 2),
          to: userMove.slice(2, 4),
          promotion: userMove[4] || undefined
        });
      } else {
        // SAN format (e4, Nf3, etc)
        move = chess.move(userMove);
      }
    } catch (e) {
      return { valid: false, correct: false, error: 'Invalid move format' };
    }

    if (!move) {
      return { valid: false, correct: false, error: 'Illegal move' };
    }

    // Check if move matches expected
    const moveUci = move.from + move.to + (move.promotion || '');
    const isCorrect = moveUci === expectedMove;

    // If correct, play opponent's response (if exists)
    let opponentMove = null;
    if (isCorrect && moveIndex + 1 < movesArray.length) {
      const oppMoveUci = movesArray[moveIndex + 1];
      const oppMove = chess.move({
        from: oppMoveUci.slice(0, 2),
        to: oppMoveUci.slice(2, 4),
        promotion: oppMoveUci[4] || undefined
      });
      if (oppMove) {
        opponentMove = {
          san: oppMove.san,
          uci: oppMoveUci
        };
      }
    }

    const isCompleted = isCorrect && (moveIndex + 2 >= movesArray.length);

    return {
      valid: true,
      correct: isCorrect,
      newFen: chess.fen(),
      opponentMove,
      completed: isCompleted,
      movesRemaining: Math.ceil((movesArray.length - moveIndex - 2) / 2),
      hint: isCorrect ? null : { from: expectedMove.slice(0, 2) }
    };
  }

  /**
   * Record a puzzle attempt and update ratings
   */
  async recordAttempt(userId, puzzleId, solved, timeTaken, movesTried = []) {
    // Get current ratings
    const userRating = await this.getUserPuzzleRating(userId);
    const puzzle = await this.getPuzzle(puzzleId);

    if (!puzzle) {
      throw new Error('Puzzle not found');
    }

    // Create Glicko players
    const userPlayer = this.glicko.makePlayer(
      userRating.rating,
      userRating.rd,
      userRating.vol
    );
    const puzzlePlayer = this.glicko.makePlayer(
      puzzle.rating,
      puzzle.rating_deviation,
      0.06
    );

    // Update ratings (user vs puzzle)
    const result = solved ? 1 : 0;
    this.glicko.updateRatings([[userPlayer, puzzlePlayer, result]]);

    const newUserRating = Math.round(userPlayer.getRating());
    const newUserRd = userPlayer.getRd();
    const newUserVol = userPlayer.getVol();
    const ratingChange = newUserRating - userRating.rating;

    // Record attempt
    await pool.query(`
      INSERT INTO puzzle_attempts (puzzle_id, user_id, solved, time_taken, moves_tried, rating_before, rating_after)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [puzzleId, puzzleId, solved, timeTaken, movesTried, userRating.rating, newUserRating]);

    // Update user puzzle rating
    const streakUpdate = solved 
      ? 'current_streak = current_streak + 1, best_streak = GREATEST(best_streak, current_streak + 1)'
      : 'current_streak = 0';

    await pool.query(`
      UPDATE user_puzzle_ratings SET
        rating = $1,
        rd = $2,
        vol = $3,
        puzzles_solved = puzzles_solved + $4,
        puzzles_failed = puzzles_failed + $5,
        ${streakUpdate},
        updated_at = NOW()
      WHERE user_id = $6
    `, [newUserRating, newUserRd, newUserVol, solved ? 1 : 0, solved ? 0 : 1, userId]);

    // Update puzzle stats
    await pool.query(`
      UPDATE puzzles SET
        plays = plays + 1,
        successes = successes + $1
      WHERE id = $2
    `, [solved ? 1 : 0, puzzleId]);

    // Check achievements
    await this.checkPuzzleAchievements(userId);

    return {
      newRating: newUserRating,
      ratingChange,
      solved
    };
  }

  /**
   * Get user's puzzle rating
   */
  async getUserPuzzleRating(userId) {
    const result = await pool.query(`
      SELECT * FROM user_puzzle_ratings WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return { rating: 500, rd: 350, vol: 0.06, puzzles_solved: 0, current_streak: 0, best_streak: 0 };
    }

    return result.rows[0];
  }

  /**
   * Get a puzzle by ID
   */
  async getPuzzle(puzzleId) {
    const result = await pool.query(`
      SELECT * FROM puzzles WHERE id = $1
    `, [puzzleId]);

    return result.rows[0] || null;
  }

  /**
   * Start a Puzzle Rush session
   */
  async startPuzzleRush(userId, mode = 'survival') {
    // Get puzzles ordered by difficulty, randomized within rating bands
    // Ensure we only get puzzles with valid FEN (not starting position) and valid moves
    const puzzles = await pool.query(`
      SELECT id, fen, moves, rating, themes
      FROM puzzles
      WHERE fen IS NOT NULL 
        AND fen != ''
        AND fen != 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        AND moves IS NOT NULL 
        AND moves != ''
        AND LENGTH(moves) >= 7
      ORDER BY rating ASC, RANDOM()
      LIMIT 100
    `);

    if (puzzles.rows.length === 0) {
      // Fallback: get ANY puzzles
      const fallback = await pool.query(`
        SELECT id, fen, moves, rating, themes
        FROM puzzles
        WHERE fen IS NOT NULL AND moves IS NOT NULL
        ORDER BY RANDOM()
        LIMIT 50
      `);
      return {
        sessionId: `rush_${userId}_${Date.now()}`,
        mode,
        puzzles: fallback.rows,
        lives: mode === 'survival' ? 3 : Infinity,
        timeLimit: mode === 'timed' ? 300000 : Infinity,
        startTime: Date.now()
      };
    }

    return {
      sessionId: `rush_${userId}_${Date.now()}`,
      mode,
      puzzles: puzzles.rows,
      lives: mode === 'survival' ? 3 : Infinity,
      timeLimit: mode === 'timed' ? 300000 : Infinity,
      startTime: Date.now()
    };
  }

  /**
   * End a Puzzle Rush and record score
   */
  async endPuzzleRush(userId, score) {
    // Update best score if applicable
    await pool.query(`
      UPDATE user_puzzle_ratings
      SET puzzle_rush_best = GREATEST(puzzle_rush_best, $1)
      WHERE user_id = $2
    `, [score, userId]);

    // Check achievements (puzzle_rush achievements can be added to database with requirement_type='puzzle_rush')
    // For now, using requirement-based matching if achievements exist in database
    const achievementService = require('./achievementService');
    // Note: Add puzzle_rush achievements to database with requirement_type='puzzle_rush' to enable
    // await achievementService.checkAchievementsByRequirement(userId, 'puzzle_rush', score);

    return { score, recorded: true };
  }

  /**
   * Check and award puzzle achievements
   */
  async checkPuzzleAchievements(userId) {
    const achievementService = require('./achievementService');
    
    // Use requirement-based matching
    await achievementService.checkPuzzleAchievements(userId);
  }

  /**
   * Get available puzzle themes
   */
  async getThemes() {
    const result = await pool.query(`
      SELECT DISTINCT unnest(themes) as theme, COUNT(*) as count
      FROM puzzles
      GROUP BY theme
      ORDER BY count DESC
    `);

    return result.rows;
  }

  /**
   * Get puzzle leaderboard
   */
  async getLeaderboard(limit = 50) {
    const result = await pool.query(`
      SELECT * FROM leaderboard_puzzles LIMIT $1
    `, [limit]);

    return result.rows;
  }
}

module.exports = new PuzzleService();
