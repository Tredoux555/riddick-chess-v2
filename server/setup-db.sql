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

-- User ratings table
CREATE TABLE IF NOT EXISTS user_ratings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  bullet_rating INTEGER DEFAULT 1200,
  blitz_rating INTEGER DEFAULT 1200,
  rapid_rating INTEGER DEFAULT 1200,
  classical_rating INTEGER DEFAULT 1200
);

-- User puzzle ratings
CREATE TABLE IF NOT EXISTS user_puzzle_ratings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  rating INTEGER DEFAULT 1200,
  puzzles_solved INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0
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
  created_at TIMESTAMP DEFAULT NOW()
);

