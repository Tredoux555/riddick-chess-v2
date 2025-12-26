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
        ('green', '#eeeed2', '#769656'),
        ('purple', '#e8e0f0', '#7b61a8'),
        ('wood', '#e8d0aa', '#a87c50')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO piece_sets (name) VALUES ('neo'), ('classic'), ('alpha'), ('merida'), ('cburnett')
      ON CONFLICT (name) DO NOTHING;

      INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value) VALUES
        ('First Win', 'Win your first game', '🏆', 'games', 'wins', 1),
        ('10 Wins', 'Win 10 games', '🎯', 'games', 'wins', 10),
        ('Puzzle Solver', 'Solve 10 puzzles', '🧩', 'puzzles', 'puzzles_solved', 10),
        ('Streak Master', 'Get a 5 puzzle streak', '🔥', 'puzzles', 'puzzle_streak', 5)
      ON CONFLICT DO NOTHING;
    `);

    // Insert sample puzzles (real Lichess puzzles)
    await client.query(`
      INSERT INTO puzzles (fen, moves, rating, themes) VALUES
        ('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 600, ARRAY['mate', 'mateIn1', 'short']),
        ('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'f3f7', 650, ARRAY['mate', 'mateIn1', 'short']),
        ('rnbqkb1r/pppp1ppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7', 700, ARRAY['mate', 'mateIn1', 'short']),
        ('r1b1kb1r/pppp1ppp/2n2n2/4N2Q/2B1q3/8/PPPP1PPP/RNB1K2R w KQkq - 0 7', 'h5f7', 750, ARRAY['mate', 'mateIn1', 'short']),
        ('r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', 'e8f7', 500, ARRAY['escape', 'short']),
        ('r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/2N2N2/PPPPBPPP/R1BQK2R w KQkq - 4 6', 'e4d5 e6d5 f3e5', 900, ARRAY['opening', 'advantage']),
        ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'f3g5 d8g5 d2d4', 950, ARRAY['opening', 'advantage']),
        ('rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3', 'c7c5 c2c3 b8c6', 850, ARRAY['opening', 'french']),
        ('r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', 'f6e4 e1g1 e4c3', 1000, ARRAY['opening', 'spanish']),
        ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4', 'f6g4 d1e2 c5f2', 1100, ARRAY['tactic', 'fork']),
        ('r2qk2r/ppp2ppp/2n1bn2/2bpp3/4P3/2PP1N2/PP3PPP/RNBQKB1R w KQkq - 0 6', 'e4d5 e6d5 f1b5', 1050, ARRAY['tactic', 'pin']),
        ('r1bqkb1r/ppppnppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7 e7f7 c4g8', 1200, ARRAY['tactic', 'sacrifice']),
        ('r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 5 6', 'c4f7 e7f7 f3g5', 1250, ARRAY['tactic', 'sacrifice', 'attack']),
        ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq d3 0 4', 'e5d4 e1g1 c5b4', 1150, ARRAY['opening', 'italian']),
        ('rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2', 'e7e6 b1c3 f8b4', 1000, ARRAY['opening', 'nimzo']),
        ('r1bqkb1r/pp1ppppp/2n2n2/2p5/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq c6 0 4', 'd4d5 f6e4 d1a4', 1300, ARRAY['opening', 'benoni']),
        ('rnbqk2r/pppp1ppp/4pn2/8/1bPP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 2 4', 'c1d2 b4d2 b1d2', 1100, ARRAY['opening', 'exchange']),
        ('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4', 'f6e4 d1e2 e4d6', 1350, ARRAY['tactic', 'defense']),
        ('r2qk2r/ppp1bppp/2n1bn2/3pp3/8/2NPBN2/PPPQPPPP/R3KB1R w KQkq - 4 7', 'f3e5 c6e5 d3e5', 1400, ARRAY['tactic', 'removal']),
        ('r1b1kb1r/ppppqppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 5', 'c4f7 e7f7 f3g5', 1450, ARRAY['tactic', 'attack', 'sacrifice'])
      ON CONFLICT DO NOTHING;
    `);

    // Add missing columns to puzzles table if they don't exist
    await client.query(`
      ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS plays INTEGER DEFAULT 0;
      ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS successes INTEGER DEFAULT 0;
      ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS rating_deviation INTEGER DEFAULT 75;
    `);

    // Add missing columns to user_puzzle_ratings
    await client.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS rd INTEGER DEFAULT 350;
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS vol NUMERIC(6,4) DEFAULT 0.06;
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS puzzles_failed INTEGER DEFAULT 0;
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS puzzle_rush_best INTEGER DEFAULT 0;
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // Add moves_tried and rating columns to puzzle_attempts
    await client.query(`
      ALTER TABLE puzzle_attempts ADD COLUMN IF NOT EXISTS moves_tried TEXT[];
      ALTER TABLE puzzle_attempts ADD COLUMN IF NOT EXISTS rating_before INTEGER;
      ALTER TABLE puzzle_attempts ADD COLUMN IF NOT EXISTS rating_after INTEGER;
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
