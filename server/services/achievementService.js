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
    try {
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
      const totalCount = parseInt(total.total) || 1;

      return {
        earned: parseInt(earned.earned_count) || 0,
        total: totalCount,
        points: parseInt(earned.total_points) || 0,
        maxPoints: parseInt(total.max_points) || 0,
        percentage: Math.round(((parseInt(earned.earned_count) || 0) / totalCount) * 100)
      };
    } catch (error) {
      console.error('getProgress error:', error);
      return {
        earned: 0,
        total: 0,
        points: 0,
        maxPoints: 0,
        percentage: 0
      };
    }
  }

  /**
   * Check achievements based on requirement type and value
   */
  async checkAchievementsByRequirement(userId, requirementType, currentValue) {
    const awarded = [];
    
    // Get achievements matching the requirement type that user qualifies for
    const achievements = await pool.query(`
      SELECT a.* FROM achievements a
      WHERE a.requirement_type = $1 
      AND a.requirement_value <= $2
      AND a.id NOT IN (
        SELECT achievement_id FROM user_achievements WHERE user_id = $3
      )
    `, [requirementType, currentValue, userId]);
    
    // Award each qualifying achievement
    for (const achievement of achievements.rows) {
      const result = await this.awardAchievement(userId, achievement.id);
      if (result.awarded) {
        awarded.push(result.achievement);
      }
    }
    
    return awarded;
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

    // Check win-based achievements using requirement-based matching
    const winAchievements = await this.checkAchievementsByRequirement(userId, 'wins', wins);
    awarded.push(...winAchievements);

    // Special checkmate achievements (these would need to be handled separately if they exist)
    // For now, we'll skip them as they're not in the new achievement list

    return awarded;
  }

  /**
   * Check tournament achievements
   */
  async checkTournamentAchievements(userId, placement, tournamentId) {
    const awarded = [];

    // Get tournament participation count
    const participationResult = await pool.query(`
      SELECT COUNT(*) as count FROM tournament_participants WHERE user_id = $1
    `, [userId]);
    const participationCount = parseInt(participationResult.rows[0]?.count || 0);

    // Check tournament participation achievements
    const participationAchievements = await this.checkAchievementsByRequirement(userId, 'tournament_count', participationCount);
    awarded.push(...participationAchievements);

    // Check tournament win achievements
    if (placement === 1) {
      const winAchievements = await this.checkAchievementsByRequirement(userId, 'tournament_wins', 1);
      awarded.push(...winAchievements);
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

    const friendCount = parseInt(friendResult.rows[0]?.count || 0);
    
    // Check friend-based achievements
    const friendAchievements = await this.checkAchievementsByRequirement(userId, 'friend_count', friendCount);
    awarded.push(...friendAchievements);

    return awarded;
  }

  /**
   * Check club membership achievements
   */
  async checkClubAchievements(userId) {
    const awarded = [];

    // Check if user is club member
    const userResult = await pool.query(`
      SELECT is_club_member FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows[0]?.is_club_member) {
      // Check club-based achievements (if club_member achievement exists with requirement_type='club')
      const clubAchievements = await this.checkAchievementsByRequirement(userId, 'club', 1);
      awarded.push(...clubAchievements);
    }

    return awarded;
  }

  /**
   * Check puzzle achievements
   */
  async checkPuzzleAchievements(userId) {
    const awarded = [];

    // Get puzzle stats
    const puzzleStats = await pool.query(`
      SELECT puzzles_solved, best_streak FROM user_puzzle_ratings WHERE user_id = $1
    `, [userId]);

    const puzzlesSolved = puzzleStats.rows[0]?.puzzles_solved || 0;
    const streak = puzzleStats.rows[0]?.best_streak || 0;

    // Check puzzle solved achievements
    const solvedAchievements = await this.checkAchievementsByRequirement(userId, 'puzzles_solved', puzzlesSolved);
    awarded.push(...solvedAchievements);

    // Check streak achievements
    const streakAchievements = await this.checkAchievementsByRequirement(userId, 'puzzle_streak', streak);
    awarded.push(...streakAchievements);

    return awarded;
  }

  /**
   * Check rating achievements
   */
  async checkRatingAchievements(userId, rating) {
    const awarded = [];

    // Check rating-based achievements (using the highest rating across all time controls)
    const ratingAchievements = await this.checkAchievementsByRequirement(userId, 'rating', rating);
    awarded.push(...ratingAchievements);

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
