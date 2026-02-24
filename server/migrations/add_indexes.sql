-- Performance indexes for Riddick Chess
-- Run with: psql $DATABASE_URL -f server/migrations/add_indexes.sql
-- All use IF NOT EXISTS so safe to re-run

-- Games: frequently queried by status, players, and tournament
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON games(completed_at DESC) WHERE status = 'completed';

-- Ratings: looked up by user_id on every game start/end
CREATE INDEX IF NOT EXISTS idx_ratings_user ON user_ratings(user_id);

-- Puzzle ratings: looked up when entering puzzle mode
CREATE INDEX IF NOT EXISTS idx_puzzle_ratings_user ON user_puzzle_ratings(user_id);

-- Tournaments: participants sorted by score, pairings by game
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tid ON tournament_participants(tournament_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_game ON tournament_pairings(game_id);

-- Friendships: looked up by both columns
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- Messages: chat history per game
CREATE INDEX IF NOT EXISTS idx_messages_game ON messages(game_id);

-- Achievements: per-user lookup
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);

-- Game spectators: per-game lookup
CREATE INDEX IF NOT EXISTS idx_game_spectators_game ON game_spectators(game_id);

-- Analysis: per-game lookup and status checks
CREATE INDEX IF NOT EXISTS idx_analysis_game ON game_analysis(game_id);
CREATE INDEX IF NOT EXISTS idx_analysis_status ON game_analysis(status) WHERE status = 'pending';

-- Users: ban check, club member check, last online for friend status
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_last_online ON users(last_online DESC);
