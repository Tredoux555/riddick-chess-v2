/**
 * Achievement Service
 * Handles achievement tracking and awarding
 */

const pool = require('../utils/db');

class AchievementService {
  /**
   * Award an achievement to a user (if not already earned)
   */
  async awardAchievement(userId, achievementId) {
    try {
      // Check if already earned
      const existing = await pool.query(`
        SELECT id FROM user_achievements
        WHERE user_id = $1 AND achievement_id = $2
      `, [userId, achievementId]);

      if (existing.rows.length > 0) {
        return { awarded: false, reason: 'already_earned' };
      }

      // Award the achievement
      await pool.query(`
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES ($1, $2)
      `, [userId, achievementId]);

      // Get achievement details for notification
      const achievement = await pool.query(`
        SELECT * FROM achievements WHERE id = $1
      `, [achievementId]);

      return {
        awarded: true,
        achievement: achievement.rows[0]
      };
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return { awarded: false, error: error.message };
    }
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId) {
    const result = await pool.query(`
      SELECT a.*, ua.earned_at,
             CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.category, a.points
    `, [userId]);

    return result.rows;
  }

  /**
   * Get recently earned achievements for a user
   */
  async getRecentAchievements(userId, limit = 5) {
    const result = await pool.query(`
      SELECT a.*, ua.earned_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  /**
   * Get achievement progress for a user
   */
  async getProgress(userId) {
    // Get user stats
    const statsResult = await pool.query(`
      SELECT 
        ur.total_wins, ur.total_games,
        upr.puzzles_solved, upr.best_streak, upr.puzzle_rush_best,
        (SELECT COUNT(*) FROM friendships WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted') as friend_count,
        (SELECT COUNT(*) FROM tournament_participants WHERE user_id = $1) as tournament_participations,
        u.is_club_member
      FROM users u
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      LEFT JOIN user_puzzle_ratings upr ON u.id = upr.user_id
      WHERE u.id = $1
    `, [userId]);

    const stats = statsResult.rows[0] || {};

    // Get earned count
    const earnedResult = await pool.query(`
      SELECT COUNT(*) as earned_count,
             COALESCE(SUM(a.points), 0) as total_points
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
    `, [userId]);

    const earned = earnedResult.rows[0];

    // Get total achievements
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(points), 0) as max_points FROM achievements
    `);

    const total = totalResult.rows[0];

    return {
      stats,
      earned: parseInt(earned.earned_count),
      total: parseInt(total.total),
      points: parseInt(earned.total_points),
      maxPoints: parseInt(total.max_points),
      percentage: Math.round((earned.earned_count / total.total) * 100)
    };
  }

  /**
   * Check all achievements after a game
   */
  async checkGameAchievements(userId, gameResult, gameDetails) {
    const awarded = [];

    // Get user stats
    const stats = await pool.query(`
      SELECT total_wins FROM user_ratings WHERE user_id = $1
    `, [userId]);

    const wins = stats.rows[0]?.total_wins || 0;

    // Win-based achievements
    if (wins >= 1) {
      const result = await this.awardAchievement(userId, 'first_win');
      if (result.awarded) awarded.push(result.achievement);
    }
    if (wins >= 10) {
      const result = await this.awardAchievement(userId, 'ten_wins');
      if (result.awarded) awarded.push(result.achievement);
    }
    if (wins >= 50) {
      const result = await this.awardAchievement(userId, 'fifty_wins');
      if (result.awarded) awarded.push(result.achievement);
    }
    if (wins >= 100) {
      const result = await this.awardAchievement(userId, 'hundred_wins');
      if (result.awarded) awarded.push(result.achievement);
    }

    // Special checkmate achievements
    if (gameDetails && gameDetails.checkmate) {
      if (gameDetails.moveCount <= 4) {
        // Scholar's mate
        const result = await this.awardAchievement(userId, 'checkmate_scholar');
        if (result.awarded) awarded.push(result.achievement);
      }
      
      if (gameDetails.isBackRankMate) {
        const result = await this.awardAchievement(userId, 'checkmate_back_rank');
        if (result.awarded) awarded.push(result.achievement);
      }
    }

    return awarded;
  }

  /**
   * Check tournament achievements
   */
  async checkTournamentAchievements(userId, placement, tournamentId) {
    const awarded = [];

    // First tournament participation
    const result1 = await this.awardAchievement(userId, 'first_tournament');
    if (result1.awarded) awarded.push(result1.achievement);

    // Tournament winner
    if (placement === 1) {
      const result2 = await this.awardAchievement(userId, 'tournament_winner');
      if (result2.awarded) awarded.push(result2.achievement);
    }

    return awarded;
  }

  /**
   * Check social achievements
   */
  async checkSocialAchievements(userId) {
    const awarded = [];

    // Friend count
    const friendResult = await pool.query(`
      SELECT COUNT(*) as count FROM friendships
      WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'
    `, [userId]);

    if (friendResult.rows[0].count >= 10) {
      const result = await this.awardAchievement(userId, 'friendly_player');
      if (result.awarded) awarded.push(result.achievement);
    }

    // Club member
    const userResult = await pool.query(`
      SELECT is_club_member FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows[0]?.is_club_member) {
      const result = await this.awardAchievement(userId, 'club_member');
      if (result.awarded) awarded.push(result.achievement);
    }

    return awarded;
  }

  /**
   * Get global achievement statistics
   */
  async getGlobalStats() {
    const result = await pool.query(`
      SELECT a.id, a.name, a.icon, a.rarity,
             COUNT(ua.id) as earned_count,
             (COUNT(ua.id)::float / NULLIF((SELECT COUNT(*) FROM users), 0) * 100) as earn_percentage
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      GROUP BY a.id, a.name, a.icon, a.rarity
      ORDER BY earn_percentage DESC
    `);

    return result.rows;
  }
}

module.exports = new AchievementService();
