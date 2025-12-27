/**
 * Glicko-2 Rating Service
 * Handles all rating calculations for Riddick Chess
 */

const { Glicko2 } = require('glicko2');
const pool = require('../utils/db');

// Time control categories
const TIME_CATEGORIES = {
  bullet: { max: 179 },      // < 3 min
  blitz: { min: 180, max: 599 },  // 3-10 min
  rapid: { min: 600, max: 1799 }, // 10-30 min
  classical: { min: 1800 }   // 30+ min
};

function getTimeCategory(timeControl) {
  if (timeControl < 180) return 'bullet';
  if (timeControl < 600) return 'blitz';
  if (timeControl < 1800) return 'rapid';
  return 'classical';
}

class RatingService {
  constructor() {
    this.glicko = new Glicko2({
      tau: 0.5,
      rating: 1500,
      rd: 350,
      vol: 0.06
    });
  }

  /**
   * Get a user's rating for a specific time control
   */
  async getUserRating(userId, timeControl) {
    const category = getTimeCategory(timeControl);
    
    const result = await pool.query(`
      SELECT 
        ${category}_rating as rating,
        ${category}_rd as rd,
        ${category}_vol as vol,
        ${category}_games as games
      FROM user_ratings 
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return { rating: 1500, rd: 350, vol: 0.06, games: 0, provisional: true };
    }

    const data = result.rows[0];
    return {
      rating: parseFloat(data.rating),
      rd: parseFloat(data.rd),
      vol: parseFloat(data.vol),
      games: data.games,
      provisional: data.games < 10
    };
  }

  /**
   * Update ratings after a game
   * @param {string} whiteId - White player's user ID
   * @param {string} blackId - Black player's user ID
   * @param {string} result - '1-0', '0-1', or '1/2-1/2'
   * @param {number} timeControl - Time control in seconds
   */
  async updateRatings(whiteId, blackId, result, timeControl) {
    const category = getTimeCategory(timeControl);
    
    // Get current ratings
    const whiteRating = await this.getUserRating(whiteId, timeControl);
    const blackRating = await this.getUserRating(blackId, timeControl);

    // Create Glicko players
    const whitePlayer = this.glicko.makePlayer(
      whiteRating.rating, 
      whiteRating.rd, 
      whiteRating.vol
    );
    const blackPlayer = this.glicko.makePlayer(
      blackRating.rating, 
      blackRating.rd, 
      blackRating.vol
    );

    // Determine game result (from white's perspective)
    let gameResult;
    switch (result) {
      case '1-0': gameResult = 1; break;
      case '0-1': gameResult = 0; break;
      case '1/2-1/2': gameResult = 0.5; break;
      default: throw new Error('Invalid result');
    }

    // Update ratings
    this.glicko.updateRatings([[whitePlayer, blackPlayer, gameResult]]);

    // Get new ratings
    const newWhiteRating = whitePlayer.getRating();
    const newWhiteRd = whitePlayer.getRd();
    const newWhiteVol = whitePlayer.getVol();

    const newBlackRating = blackPlayer.getRating();
    const newBlackRd = blackPlayer.getRd();
    const newBlackVol = blackPlayer.getVol();

    // Calculate rating changes
    const whiteChange = Math.round(newWhiteRating - whiteRating.rating);
    const blackChange = Math.round(newBlackRating - blackRating.rating);

    // Determine win/loss/draw increments
    let whiteWin = 0, whiteLoss = 0, whiteDraw = 0;
    let blackWin = 0, blackLoss = 0, blackDraw = 0;
    
    switch (result) {
      case '1-0':
        whiteWin = 1;
        blackLoss = 1;
        break;
      case '0-1':
        whiteLoss = 1;
        blackWin = 1;
        break;
      case '1/2-1/2':
        whiteDraw = 1;
        blackDraw = 1;
        break;
    }

    // Update database
    await pool.query(`
      UPDATE user_ratings SET
        ${category}_rating = $1,
        ${category}_rd = $2,
        ${category}_vol = $3,
        ${category}_games = ${category}_games + 1,
        total_games = total_games + 1,
        total_wins = total_wins + $4,
        total_losses = total_losses + $5,
        total_draws = total_draws + $6,
        updated_at = NOW()
      WHERE user_id = $7
    `, [newWhiteRating, newWhiteRd, newWhiteVol, whiteWin, whiteLoss, whiteDraw, whiteId]);

    await pool.query(`
      UPDATE user_ratings SET
        ${category}_rating = $1,
        ${category}_rd = $2,
        ${category}_vol = $3,
        ${category}_games = ${category}_games + 1,
        total_games = total_games + 1,
        total_wins = total_wins + $4,
        total_losses = total_losses + $5,
        total_draws = total_draws + $6,
        updated_at = NOW()
      WHERE user_id = $7
    `, [newBlackRating, newBlackRd, newBlackVol, blackWin, blackLoss, blackDraw, blackId]);

    // Check for achievements
    await this.checkRatingAchievements(whiteId, Math.round(newWhiteRating));
    await this.checkRatingAchievements(blackId, Math.round(newBlackRating));

    return {
      white: {
        before: Math.round(whiteRating.rating),
        after: Math.round(newWhiteRating),
        change: whiteChange
      },
      black: {
        before: Math.round(blackRating.rating),
        after: Math.round(newBlackRating),
        change: blackChange
      }
    };
  }

  /**
   * Check and award rating-based achievements
   */
  async checkRatingAchievements(userId, rating) {
    const achievementService = require('./achievementService');
    
    // Use requirement-based matching
    await achievementService.checkRatingAchievements(userId, rating);
  }

  /**
   * Format rating for display
   */
  formatRating(rating, rd, games) {
    const provisional = games < 10;
    return {
      rating: Math.round(rating),
      display: provisional ? `${Math.round(rating)}?` : Math.round(rating).toString(),
      rd: Math.round(rd),
      provisional,
      confidence: {
        lower: Math.round(rating - 1.96 * rd),
        upper: Math.round(rating + 1.96 * rd)
      }
    };
  }

  /**
   * Get user's all ratings summary
   */
  async getAllRatings(userId) {
    const result = await pool.query(`
      SELECT * FROM user_ratings WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];
    return {
      bullet: this.formatRating(data.bullet_rating, data.bullet_rd, data.bullet_games),
      blitz: this.formatRating(data.blitz_rating, data.blitz_rd, data.blitz_games),
      rapid: this.formatRating(data.rapid_rating, data.rapid_rd, data.rapid_games),
      classical: this.formatRating(data.classical_rating, data.classical_rd, data.classical_games),
      stats: {
        totalGames: data.total_games,
        wins: data.total_wins,
        losses: data.total_losses,
        draws: data.total_draws,
        winRate: data.total_games > 0 
          ? ((data.total_wins / data.total_games) * 100).toFixed(1) 
          : '0.0'
      }
    };
  }

  /**
   * Get leaderboard for a specific time control
   */
  async getLeaderboard(timeControl, limit = 50) {
    const category = getTimeCategory(timeControl);
    
    const result = await pool.query(`
      SELECT * FROM leaderboard_${category}
      LIMIT $1
    `, [limit]);

    return result.rows;
  }
}

module.exports = new RatingService();
