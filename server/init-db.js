/**
 * Database initialization - creates all tables on startup
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  console.log('🔧 Initializing database...');
  
  const client = await pool.connect();
  
  try {
    await client.query(`
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

      CREATE TABLE IF NOT EXISTS user_ratings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bullet_rating INTEGER DEFAULT 1200,
        blitz_rating INTEGER DEFAULT 1200,
        rapid_rating INTEGER DEFAULT 1200,
        classical_rating INTEGER DEFAULT 1200
      );

      CREATE TABLE IF NOT EXISTS user_puzzle_ratings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER DEFAULT 1200,
        puzzles_solved INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        board_theme VARCHAR(50) DEFAULT 'classic',
        piece_set VARCHAR(50) DEFAULT 'classic',
        sound_enabled BOOLEAN DEFAULT true,
        auto_promote_queen BOOLEAN DEFAULT true
      );

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

      CREATE TABLE IF NOT EXISTS game_spectators (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS puzzles (
        id SERIAL PRIMARY KEY,
        fen TEXT NOT NULL,
        moves TEXT NOT NULL,
        rating INTEGER DEFAULT 1200,
        themes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_puzzles (
        id SERIAL PRIMARY KEY,
        puzzle_id INTEGER REFERENCES puzzles(id),
        date DATE UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS puzzle_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        puzzle_id INTEGER REFERENCES puzzles(id) ON DELETE CASCADE,
        solved BOOLEAN DEFAULT false,
        time_taken INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        category VARCHAR(50),
        requirement_type VARCHAR(50),
        requirement_value INTEGER
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      );

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

      CREATE TABLE IF NOT EXISTS tournament_participants (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score NUMERIC(4,1) DEFAULT 0,
        buchholz NUMERIC(6,2) DEFAULT 0,
        UNIQUE(tournament_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tournament_pairings (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        white_id INTEGER REFERENCES users(id),
        black_id INTEGER REFERENCES users(id),
        game_id INTEGER REFERENCES games(id),
        result VARCHAR(10)
      );

      CREATE TABLE IF NOT EXISTS fair_play_reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES users(id),
        reported_id INTEGER REFERENCES users(id),
        game_id INTEGER REFERENCES games(id),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS club_content (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS club_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS board_themes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        light_color VARCHAR(7) NOT NULL,
        dark_color VARCHAR(7) NOT NULL,
        is_premium BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS piece_sets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        is_premium BOOLEAN DEFAULT false
      );
    `);

    // Insert defaults
    await client.query(`
      INSERT INTO board_themes (name, light_color, dark_color) VALUES
        ('classic', '#f0d9b5', '#b58863'),
        ('blue', '#dee3e6', '#8ca2ad'),
        ('green', '#ffffdd', '#86a666')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO piece_sets (name) VALUES ('classic'), ('neo'), ('alpha')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value) VALUES
        ('First Win', 'Win your first game', '🏆', 'games', 'wins', 1),
        ('10 Wins', 'Win 10 games', '🎯', 'games', 'wins', 10),
        ('Puzzle Solver', 'Solve 10 puzzles', '🧩', 'puzzles', 'puzzles_solved', 10),
        ('Streak Master', 'Get a 5 puzzle streak', '🔥', 'puzzles', 'puzzle_streak', 5)
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { initDatabase, pool };
