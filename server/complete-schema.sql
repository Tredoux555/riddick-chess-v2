-- RIDDICK CHESS v2 - Complete Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255),
  avatar TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_club_member BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User ratings
CREATE TABLE IF NOT EXISTS user_ratings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bullet_rating INTEGER DEFAULT 1200,
  blitz_rating INTEGER DEFAULT 1200,
  rapid_rating INTEGER DEFAULT 1200,
  classical_rating INTEGER DEFAULT 1200
);

-- User puzzle ratings
CREATE TABLE IF NOT EXISTS user_puzzle_ratings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER DEFAULT 1200,
  puzzles_solved INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0
);

-- User preferences (themes, etc)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  board_theme VARCHAR(50) DEFAULT 'classic',
  piece_set VARCHAR(50) DEFAULT 'classic',
  sound_enabled BOOLEAN DEFAULT true,
  auto_promote_queen BOOLEAN DEFAULT true
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  white_id INTEGER REFERENCES users(id),
  black_id INTEGER REFERENCES users(id),
  white_username VARCHAR(50),
  black_username VARCHAR(50),
  time_control INTEGER,
  increment INTEGER DEFAULT 0,
  fen TEXT,
  pgn TEXT,
  status VARCHAR(20) DEFAULT 'active',
  result VARCHAR(10),
  rated BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);


-- Game spectators
CREATE TABLE IF NOT EXISTS game_spectators (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Puzzles
CREATE TABLE IF NOT EXISTS puzzles (
  id SERIAL PRIMARY KEY,
  fen TEXT NOT NULL,
  moves TEXT NOT NULL,
  rating INTEGER DEFAULT 1200,
  themes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


-- Daily puzzles
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id SERIAL PRIMARY KEY,
  puzzle_id INTEGER REFERENCES puzzles(id),
  date DATE UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Puzzle attempts
CREATE TABLE IF NOT EXISTS puzzle_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id INTEGER REFERENCES puzzles(id) ON DELETE CASCADE,
  solved BOOLEAN DEFAULT false,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  requirement_type VARCHAR(50),
  requirement_value INTEGER
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);


-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  time_control INTEGER NOT NULL,
  max_players INTEGER DEFAULT 16,
  status VARCHAR(20) DEFAULT 'upcoming',
  current_round INTEGER DEFAULT 0,
  start_time TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(4,1) DEFAULT 0,
  buchholz NUMERIC(6,2) DEFAULT 0,
  UNIQUE(tournament_id, user_id)
);

-- Tournament pairings
CREATE TABLE IF NOT EXISTS tournament_pairings (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  white_id INTEGER REFERENCES users(id),
  black_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  result VARCHAR(10)
);

-- Fair play reports
CREATE TABLE IF NOT EXISTS fair_play_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id),
  reported_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);


-- Club content
CREATE TABLE IF NOT EXISTS club_content (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Club events
CREATE TABLE IF NOT EXISTS club_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Board themes
CREATE TABLE IF NOT EXISTS board_themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  light_color VARCHAR(7) NOT NULL,
  dark_color VARCHAR(7) NOT NULL,
  is_premium BOOLEAN DEFAULT false
);

-- Piece sets
CREATE TABLE IF NOT EXISTS piece_sets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  is_premium BOOLEAN DEFAULT false
);

-- Insert default themes
INSERT INTO board_themes (name, light_color, dark_color) VALUES
  ('classic', '#f0d9b5', '#b58863'),
  ('blue', '#dee3e6', '#8ca2ad'),
  ('green', '#ffffdd', '#86a666')
ON CONFLICT (name) DO NOTHING;

-- Insert default piece sets
INSERT INTO piece_sets (name) VALUES ('classic'), ('neo'), ('alpha')
ON CONFLICT (name) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value) VALUES
  ('First Win', 'Win your first game', '🏆', 'games', 'wins', 1),
  ('10 Wins', 'Win 10 games', '🎯', 'games', 'wins', 10),
  ('Puzzle Solver', 'Solve 10 puzzles', '🧩', 'puzzles', 'puzzles_solved', 10),
  ('Streak Master', 'Get a 5 puzzle streak', '🔥', 'puzzles', 'puzzle_streak', 5)
ON CONFLICT DO NOTHING;
