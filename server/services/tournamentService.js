/**
 * Tournament Service
 * Handles Swiss-system tournaments with Buchholz tiebreakers
 * Includes No-Show Protection System
 */

const pool = require('../utils/db');
const ratingService = require('./ratingService');
const achievementService = require('./achievementService');

class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(data, createdBy) {
    const {
      name,
      description,
      type = 'swiss',
      timeControl = 600,
      increment = 0,
      maxPlayers = 32,
      totalRounds = 5,
      prizeDescription,
      startTime,
      registrationStart,
      registrationEnd,
      tournamentEnd,
      forfeitHours = 24,
      isArena = false
    } = data;

    const result = await pool.query(`
      INSERT INTO tournaments (
        name, description, created_by, type, time_control, increment, 
        max_players, total_rounds, prize_description, start_time,
        registration_start, registration_end, tournament_end, forfeit_hours, is_arena
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      name, description, createdBy, type, timeControl, increment,
      maxPlayers, totalRounds, prizeDescription, startTime,
      registrationStart, registrationEnd, tournamentEnd, forfeitHours, isArena
    ]);

    return result.rows[0];
  }

  /**
   * Check for and process forfeits (call this periodically)
   */
  async processForfeits(tournamentId) {
    const tournament = await pool.query(`
      SELECT forfeit_hours FROM tournaments WHERE id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) return { processed: 0 };

    const forfeitHours = tournament.rows[0].forfeit_hours || 24;
    
    // Find pairings that have exceeded forfeit deadline
    const expiredPairings = await pool.query(`
      SELECT tp.*, g.status as game_status, g.white_player_id, g.black_player_id
      FROM tournament_pairings tp
      LEFT JOIN games g ON tp.game_id = g.id
      WHERE tp.tournament_id = $1 
        AND tp.result IS NULL 
        AND tp.is_bye = FALSE
        AND tp.created_at < NOW() - INTERVAL '1 hour' * $2
        AND (g.status IS NULL OR g.status = 'waiting' OR g.status = 'active')
    `, [tournamentId, forfeitHours]);

    let processed = 0;
    
    for (const pairing of expiredPairings.rows) {
      // Check which player(s) didn't show up
      const whiteActivity = await this.getPlayerLastActivity(tournamentId, pairing.white_player_id);
      const blackActivity = await this.getPlayerLastActivity(tournamentId, pairing.black_player_id);

      const whiteNoShow = !whiteActivity || (Date.now() - new Date(whiteActivity).getTime()) > forfeitHours * 60 * 60 * 1000;
      const blackNoShow = !blackActivity || (Date.now() - new Date(blackActivity).getTime()) > forfeitHours * 60 * 60 * 1000;

      let result = null;
      let forfeitedBy = null;

      if (whiteNoShow && blackNoShow) {
        // Both no-show - double forfeit (0-0)
        result = '0-0';
        await this.incrementForfeit(tournamentId, pairing.white_player_id);
        await this.incrementForfeit(tournamentId, pairing.black_player_id);
      } else if (whiteNoShow) {
        // White forfeits - black wins
        result = '0-1';
        forfeitedBy = pairing.white_player_id;
        await this.incrementForfeit(tournamentId, pairing.white_player_id);
        await this.awardForfeitWin(tournamentId, pairing.black_player_id);
      } else if (blackNoShow) {
        // Black forfeits - white wins
        result = '1-0';
        forfeitedBy = pairing.black_player_id;
        await this.incrementForfeit(tournamentId, pairing.black_player_id);
        await this.awardForfeitWin(tournamentId, pairing.white_player_id);
      }

      if (result) {
        await pool.query(`
          UPDATE tournament_pairings 
          SET result = $1, is_forfeited = TRUE, forfeited_by = $2
          WHERE id = $3
        `, [result, forfeitedBy, pairing.id]);

        // Update game status if exists
        if (pairing.game_id) {
          await pool.query(`
            UPDATE games SET status = 'completed', result = $1 WHERE id = $2
          `, [result, pairing.game_id]);
        }

        processed++;
      }
    }

    // Check if round is complete after processing forfeits
    if (processed > 0) {
      const currentRound = await pool.query(`
        SELECT current_round FROM tournaments WHERE id = $1
      `, [tournamentId]);
      
      if (currentRound.rows[0]?.current_round > 0) {
        const unfinished = await pool.query(`
          SELECT COUNT(*) FROM tournament_pairings
          WHERE tournament_id = $1 AND round = $2 AND result IS NULL AND is_bye = FALSE
        `, [tournamentId, currentRound.rows[0].current_round]);

        if (parseInt(unfinished.rows[0].count) === 0) {
          await this.completeRound(tournamentId, currentRound.rows[0].current_round);
        }
      }
    }

    return { processed };
  }

  /**
   * Get player's last activity in tournament
   */
  async getPlayerLastActivity(tournamentId, userId) {
    const result = await pool.query(`
      SELECT last_activity FROM tournament_participants
      WHERE tournament_id = $1 AND user_id = $2
    `, [tournamentId, userId]);
    return result.rows[0]?.last_activity;
  }

  /**
   * Update player activity timestamp
   */
  async updatePlayerActivity(tournamentId, userId) {
    await pool.query(`
      UPDATE tournament_participants 
      SET last_activity = NOW()
      WHERE tournament_id = $1 AND user_id = $2
    `, [tournamentId, userId]);
  }

  /**
   * Increment forfeit count and possibly auto-withdraw
   */
  async incrementForfeit(tournamentId, userId) {
    const result = await pool.query(`
      UPDATE tournament_participants 
      SET games_forfeited = games_forfeited + 1
      WHERE tournament_id = $1 AND user_id = $2
      RETURNING games_forfeited
    `, [tournamentId, userId]);

    // Auto-withdraw after 2 forfeits
    if (result.rows[0]?.games_forfeited >= 2) {
      await pool.query(`
        UPDATE tournament_participants 
        SET is_withdrawn = TRUE, is_active = FALSE
        WHERE tournament_id = $1 AND user_id = $2
      `, [tournamentId, userId]);
    }
  }

  /**
   * Award forfeit win (score + activity update)
   */
  async awardForfeitWin(tournamentId, userId) {
    await pool.query(`
      UPDATE tournament_participants 
      SET score = score + 1, games_played = games_played + 1, last_activity = NOW()
      WHERE tournament_id = $1 AND user_id = $2
    `, [tournamentId, userId]);
  }

  /**
   * Check-in a player for the tournament
   */
  async checkInPlayer(tournamentId, userId) {
    await pool.query(`
      UPDATE tournament_participants 
      SET checked_in = TRUE, last_activity = NOW()
      WHERE tournament_id = $1 AND user_id = $2
    `, [tournamentId, userId]);
    return { success: true };
  }

  /**
   * Get inactive players who should be warned/withdrawn
   */
  async getInactivePlayers(tournamentId, hoursInactive = 12) {
    const result = await pool.query(`
      SELECT tp.user_id, u.username, tp.last_activity, tp.games_played, tp.games_forfeited
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1 
        AND tp.is_withdrawn = FALSE
        AND tp.is_active = TRUE
        AND tp.last_activity < NOW() - INTERVAL '1 hour' * $2
      ORDER BY tp.last_activity ASC
    `, [tournamentId, hoursInactive]);
    return result.rows;
  }

  /**
   * Get tournament by ID with full details
   */
  async getTournament(tournamentId, userId = null) {
    const tournament = await pool.query(`
      SELECT t.*, u.username as creator_username,
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id AND is_withdrawn = FALSE) as participant_count
      FROM tournaments t
      JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) {
      return null;
    }

    const data = tournament.rows[0];

    // Get participants
    const participants = await pool.query(`
      SELECT tp.*, u.username, u.avatar,
             COALESCE(ur.blitz_rating, 500) as rating
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE tp.tournament_id = $1 AND (tp.is_withdrawn = FALSE OR tp.is_withdrawn IS NULL)
      ORDER BY tp.score DESC, tp.buchholz DESC, COALESCE(ur.blitz_rating, 500) DESC
    `, [tournamentId]);

    // Check if user is registered
    const isRegistered = userId ? participants.rows.some(p => p.user_id === userId) : false;

    // Get current round pairings if active
    let currentPairings = [];
    if (data.status === 'active' && data.current_round > 0) {
      currentPairings = await this.getRoundPairings(tournamentId, data.current_round);
    }

    return {
      ...data,
      participants: participants.rows.map((p, i) => ({ ...p, rank: i + 1 })),
      isRegistered,
      currentPairings
    };
  }

  /**
   * Register a player for a tournament
   */
  async registerPlayer(tournamentId, userId) {
    // Check tournament status and capacity
    const tournament = await pool.query(`
      SELECT t.*, 
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id AND is_withdrawn = FALSE) as current_count
      FROM tournaments t
      WHERE t.id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) {
      throw new Error('Tournament not found');
    }

    const t = tournament.rows[0];

    if (t.status !== 'upcoming') {
      throw new Error('Tournament registration is closed');
    }

    if (t.current_count >= t.max_players) {
      throw new Error('Tournament is full');
    }

    // Check if already registered
    const existing = await pool.query(`
      SELECT id, is_withdrawn FROM tournament_participants
      WHERE tournament_id = $1 AND user_id = $2
    `, [tournamentId, userId]);

    if (existing.rows.length > 0) {
      if (existing.rows[0].is_withdrawn) {
        // Re-register
        await pool.query(`
          UPDATE tournament_participants SET is_withdrawn = FALSE WHERE id = $1
        `, [existing.rows[0].id]);
        return { success: true, message: 'Re-registered for tournament' };
      }
      throw new Error('Already registered for this tournament');
    }

    await pool.query(`
      INSERT INTO tournament_participants (tournament_id, user_id)
      VALUES ($1, $2)
    `, [tournamentId, userId]);

    return { success: true, message: 'Registered for tournament' };
  }

  /**
   * Withdraw from a tournament
   */
  async withdrawPlayer(tournamentId, userId) {
    const tournament = await pool.query(`
      SELECT status FROM tournaments WHERE id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) {
      throw new Error('Tournament not found');
    }

    if (tournament.rows[0].status === 'completed') {
      throw new Error('Cannot withdraw from a completed tournament');
    }

    const result = await pool.query(`
      UPDATE tournament_participants
      SET is_withdrawn = TRUE
      WHERE tournament_id = $1 AND user_id = $2
      RETURNING id
    `, [tournamentId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Not registered for this tournament');
    }

    return { success: true };
  }

  /**
   * Start a tournament and generate first round pairings
   */
  async startTournament(tournamentId) {
    const tournament = await pool.query(`
      SELECT * FROM tournaments WHERE id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) {
      throw new Error('Tournament not found');
    }

    if (tournament.rows[0].status !== 'upcoming') {
      throw new Error('Tournament has already started');
    }

    // Get participants sorted by rating
    const participants = await pool.query(`
      SELECT tp.user_id, COALESCE(ur.blitz_rating, 500) as rating
      FROM tournament_participants tp
      LEFT JOIN user_ratings ur ON tp.user_id = ur.user_id
      WHERE tp.tournament_id = $1 AND (tp.is_withdrawn = FALSE OR tp.is_withdrawn IS NULL)
      ORDER BY COALESCE(ur.blitz_rating, 500) DESC
    `, [tournamentId]);

    if (participants.rows.length < 2) {
      throw new Error('Need at least 2 participants to start');
    }

    // Update tournament status
    await pool.query(`
      UPDATE tournaments SET status = 'active', current_round = 1 WHERE id = $1
    `, [tournamentId]);

    // Generate first round pairings
    const pairings = await this.generatePairings(tournamentId, 1, participants.rows);

    return {
      success: true,
      round: 1,
      pairings
    };
  }

  /**
   * Generate pairings for a round using Swiss system
   */
  async generatePairings(tournamentId, round, participantsInput = null) {
    // Get participants if not provided
    let participants;
    if (participantsInput) {
      participants = participantsInput;
    } else {
      const result = await pool.query(`
        SELECT tp.user_id, tp.score, tp.opponents, tp.colors, tp.has_bye,
               ur.blitz_rating as rating
        FROM tournament_participants tp
        JOIN user_ratings ur ON tp.user_id = ur.user_id
        WHERE tp.tournament_id = $1 AND tp.is_withdrawn = FALSE
        ORDER BY tp.score DESC, ur.blitz_rating DESC
      `, [tournamentId]);
      participants = result.rows;
    }

    const tournament = await pool.query(`
      SELECT time_control, increment FROM tournaments WHERE id = $1
    `, [tournamentId]);

    const { time_control, increment } = tournament.rows[0];

    // Sort by score (primary) and rating (secondary)
    participants.sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return (b.rating || 500) - (a.rating || 500);
    });

    const pairings = [];
    const paired = new Set();

    // Handle bye for odd number of players
    if (participants.length % 2 === 1) {
      // Give bye to lowest-scored player who hasn't had one
      for (let i = participants.length - 1; i >= 0; i--) {
        const player = participants[i];
        if (!player.has_bye) {
          pairings.push({
            white_player_id: player.user_id,
            black_player_id: null,
            is_bye: true,
            result: '1-0' // Bye counts as win
          });
          paired.add(player.user_id);

          // Update player's bye status and score
          await pool.query(`
            UPDATE tournament_participants
            SET has_bye = TRUE, score = score + 1
            WHERE tournament_id = $1 AND user_id = $2
          `, [tournamentId, player.user_id]);

          break;
        }
      }
    }

    // Pair remaining players
    for (let i = 0; i < participants.length; i++) {
      const player1 = participants[i];
      if (paired.has(player1.user_id)) continue;

      // Find best opponent
      for (let j = i + 1; j < participants.length; j++) {
        const player2 = participants[j];
        if (paired.has(player2.user_id)) continue;

        // Check if they've already played
        const opponents = player1.opponents || [];
        if (opponents.includes(player2.user_id)) continue;

        // Determine colors
        const colors = this.assignColors(player1, player2);

        // Create the game
        const gameResult = await pool.query(`
          INSERT INTO games (white_player_id, black_player_id, time_control, increment, white_time_remaining, black_time_remaining, tournament_id, rated)
          VALUES ($1, $2, $3, $4, $3, $3, $5, TRUE)
          RETURNING id
        `, [colors.white, colors.black, time_control, increment, tournamentId]);

        const gameId = gameResult.rows[0].id;

        // Create pairing record
        await pool.query(`
          INSERT INTO tournament_pairings (tournament_id, round, white_player_id, black_player_id, game_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [tournamentId, round, colors.white, colors.black, gameId]);

        // Update opponent history and colors
        await pool.query(`
          UPDATE tournament_participants
          SET opponents = array_append(opponents, $1),
              colors = array_append(colors, $2)
          WHERE tournament_id = $3 AND user_id = $4
        `, [player2.user_id, colors.white === player1.user_id ? 'w' : 'b', tournamentId, player1.user_id]);

        await pool.query(`
          UPDATE tournament_participants
          SET opponents = array_append(opponents, $1),
              colors = array_append(colors, $2)
          WHERE tournament_id = $3 AND user_id = $4
        `, [player1.user_id, colors.white === player2.user_id ? 'w' : 'b', tournamentId, player2.user_id]);

        pairings.push({
          white_player_id: colors.white,
          black_player_id: colors.black,
          game_id: gameId,
          is_bye: false
        });

        paired.add(player1.user_id);
        paired.add(player2.user_id);
        break;
      }
    }

    return pairings;
  }

  /**
   * Assign colors based on color history
   */
  assignColors(player1, player2) {
    const p1Colors = player1.colors || [];
    const p2Colors = player2.colors || [];

    const p1Whites = p1Colors.filter(c => c === 'w').length;
    const p2Whites = p2Colors.filter(c => c === 'w').length;

    // Give white to player who has had fewer whites
    if (p1Whites < p2Whites) {
      return { white: player1.user_id, black: player2.user_id };
    } else if (p2Whites < p1Whites) {
      return { white: player2.user_id, black: player1.user_id };
    } else {
      // Equal whites, alternate based on last color
      const p1Last = p1Colors[p1Colors.length - 1];
      if (p1Last === 'b' || !p1Last) {
        return { white: player1.user_id, black: player2.user_id };
      } else {
        return { white: player2.user_id, black: player1.user_id };
      }
    }
  }

  /**
   * Record a game result in tournament
   */
  async recordResult(tournamentId, gameId, result) {
    console.log(`Recording tournament result: tournament=${tournamentId}, game=${gameId}, result=${result}`);
    
    // Get the pairing
    const pairing = await pool.query(`
      SELECT * FROM tournament_pairings
      WHERE tournament_id = $1 AND game_id = $2
    `, [tournamentId, gameId]);

    if (pairing.rows.length === 0) {
      console.log('Pairing not found for tournament result');
      throw new Error('Pairing not found');
    }

    const { white_player_id, black_player_id, round } = pairing.rows[0];
    console.log(`Found pairing: white=${white_player_id}, black=${black_player_id}, round=${round}`);

    // Update pairing result
    await pool.query(`
      UPDATE tournament_pairings SET result = $1 WHERE tournament_id = $2 AND game_id = $3
    `, [result, tournamentId, gameId]);

    // Update scores
    let whiteScore = 0, blackScore = 0;
    switch (result) {
      case '1-0': whiteScore = 1; break;
      case '0-1': blackScore = 1; break;
      case '1/2-1/2': whiteScore = 0.5; blackScore = 0.5; break;
    }

    console.log(`Updating scores: white ${white_player_id} +${whiteScore}, black ${black_player_id} +${blackScore}`);

    await pool.query(`
      UPDATE tournament_participants SET score = score + $1, games_played = COALESCE(games_played, 0) + 1
      WHERE tournament_id = $2 AND user_id = $3
    `, [whiteScore, tournamentId, white_player_id]);

    await pool.query(`
      UPDATE tournament_participants SET score = score + $1, games_played = COALESCE(games_played, 0) + 1
      WHERE tournament_id = $2 AND user_id = $3
    `, [blackScore, tournamentId, black_player_id]);

    console.log('Scores updated successfully');

    // Check if round is complete
    const unfinished = await pool.query(`
      SELECT COUNT(*) FROM tournament_pairings
      WHERE tournament_id = $1 AND round = $2 AND result IS NULL AND is_bye = FALSE
    `, [tournamentId, round]);

    if (parseInt(unfinished.rows[0].count) === 0) {
      await this.completeRound(tournamentId, round);
    }

    return { success: true };
  }

  /**
   * Complete a round and prepare for next
   */
  async completeRound(tournamentId, round) {
    // Calculate Buchholz scores
    await this.calculateBuchholz(tournamentId);

    // Check if tournament is complete
    const tournament = await pool.query(`
      SELECT total_rounds FROM tournaments WHERE id = $1
    `, [tournamentId]);

    if (round >= tournament.rows[0].total_rounds) {
      // Tournament complete
      await pool.query(`
        UPDATE tournaments SET status = 'completed' WHERE id = $1
      `, [tournamentId]);

      // Award achievements
      const standings = await this.getStandings(tournamentId);
      for (let i = 0; i < standings.length; i++) {
        await achievementService.checkTournamentAchievements(
          standings[i].user_id,
          i + 1,
          tournamentId
        );
      }
    } else {
      // Generate next round pairings
      await pool.query(`
        UPDATE tournaments SET current_round = $1 WHERE id = $2
      `, [round + 1, tournamentId]);

      await this.generatePairings(tournamentId, round + 1);
    }
  }

  /**
   * Calculate Buchholz tiebreaker scores
   */
  async calculateBuchholz(tournamentId) {
    const participants = await pool.query(`
      SELECT user_id, opponents FROM tournament_participants
      WHERE tournament_id = $1 AND is_withdrawn = FALSE
    `, [tournamentId]);

    for (const participant of participants.rows) {
      let buchholz = 0;

      for (const oppId of (participant.opponents || [])) {
        const oppScore = await pool.query(`
          SELECT score FROM tournament_participants
          WHERE tournament_id = $1 AND user_id = $2
        `, [tournamentId, oppId]);

        if (oppScore.rows.length > 0) {
          buchholz += parseFloat(oppScore.rows[0].score);
        }
      }

      await pool.query(`
        UPDATE tournament_participants SET buchholz = $1
        WHERE tournament_id = $2 AND user_id = $3
      `, [buchholz, tournamentId, participant.user_id]);
    }
  }

  /**
   * Get tournament standings
   */
  async getStandings(tournamentId) {
    const result = await pool.query(`
      SELECT tp.*, u.username, u.avatar, ur.blitz_rating as rating
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      LEFT JOIN user_ratings ur ON u.id = ur.user_id
      WHERE tp.tournament_id = $1 AND tp.is_withdrawn = FALSE
      ORDER BY tp.score DESC, tp.buchholz DESC, ur.blitz_rating DESC
    `, [tournamentId]);

    return result.rows.map((row, index) => ({
      ...row,
      rank: index + 1
    }));
  }

  /**
   * Get pairings for a specific round
   */
  async getRoundPairings(tournamentId, round) {
    const result = await pool.query(`
      SELECT tp.*,
             w.username as white_username, w.avatar as white_avatar,
             b.username as black_username, b.avatar as black_avatar
      FROM tournament_pairings tp
      LEFT JOIN users w ON tp.white_player_id = w.id
      LEFT JOIN users b ON tp.black_player_id = b.id
      WHERE tp.tournament_id = $1 AND tp.round = $2
    `, [tournamentId, round]);

    return result.rows;
  }

  /**
   * Get all rounds with results
   */
  async getAllRounds(tournamentId) {
    const tournament = await pool.query(`
      SELECT current_round FROM tournaments WHERE id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) return [];

    const rounds = [];
    for (let i = 1; i <= tournament.rows[0].current_round; i++) {
      const pairings = await this.getRoundPairings(tournamentId, i);
      rounds.push({ round: i, pairings });
    }

    return rounds;
  }

  /**
   * Get upcoming and active tournaments
   */
  async getActiveTournaments(limit = 20) {
    const result = await pool.query(`
      SELECT t.*, u.username as creator_username,
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id AND is_withdrawn = FALSE) as participant_count
      FROM tournaments t
      JOIN users u ON t.created_by = u.id
      WHERE t.status IN ('upcoming', 'active')
      ORDER BY t.start_time ASC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get user's tournament history
   */
  async getUserTournaments(userId) {
    const result = await pool.query(`
      SELECT t.*, tp.score, tp.buchholz,
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id AND is_withdrawn = FALSE) as participant_count,
             (
               SELECT COUNT(*) + 1 FROM tournament_participants tp2
               WHERE tp2.tournament_id = t.id
               AND tp2.is_withdrawn = FALSE
               AND (tp2.score > tp.score OR (tp2.score = tp.score AND tp2.buchholz > tp.buchholz))
             ) as final_rank
      FROM tournaments t
      JOIN tournament_participants tp ON t.id = tp.tournament_id
      WHERE tp.user_id = $1
      ORDER BY t.start_time DESC
    `, [userId]);

    return result.rows;
  }
}

module.exports = new TournamentService();
