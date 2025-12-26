require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrate = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Riddick Chess v2 Migration...\n');

    // ============================================
    // CORE USER TABLES
    // ============================================
    console.log('📦 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        avatar VARCHAR(500),
        google_id VARCHAR(255) UNIQUE,
        is_admin BOOLEAN DEFAULT FALSE,
        is_club_member BOOLEAN DEFAULT FALSE,
        club_verified_at TIMESTAMP,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_reason TEXT,
        last_online TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // GLICKO-2 RATING SYSTEM
    // ============================================
    console.log('📊 Creating rating tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_ratings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        -- Bullet ratings (1-2 min)
        bullet_rating DECIMAL(7,2) DEFAULT 1500,
        bullet_rd DECIMAL(7,2) DEFAULT 350,
        bullet_vol DECIMAL(8,6) DEFAULT 0.06,
        bullet_games INTEGER DEFAULT 0,
        -- Blitz ratings (3-5 min)
        blitz_rating DECIMAL(7,2) DEFAULT 1500,
        blitz_rd DECIMAL(7,2) DEFAULT 350,
        blitz_vol DECIMAL(8,6) DEFAULT 0.06,
        blitz_games INTEGER DEFAULT 0,
        -- Rapid ratings (10-15 min)
        rapid_rating DECIMAL(7,2) DEFAULT 1500,
        rapid_rd DECIMAL(7,2) DEFAULT 350,
        rapid_vol DECIMAL(8,6) DEFAULT 0.06,
        rapid_games INTEGER DEFAULT 0,
        -- Classical ratings (30+ min)
        classical_rating DECIMAL(7,2) DEFAULT 1500,
        classical_rd DECIMAL(7,2) DEFAULT 350,
        classical_vol DECIMAL(8,6) DEFAULT 0.06,
        classical_games INTEGER DEFAULT 0,
        -- Aggregate stats
        total_games INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        total_losses INTEGER DEFAULT 0,
        total_draws INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // GAMES TABLE
    // ============================================
    console.log('♟️ Creating games table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        white_player_id UUID REFERENCES users(id),
        black_player_id UUID REFERENCES users(id),
        pgn TEXT DEFAULT '',
        fen VARCHAR(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves TEXT DEFAULT '',
        move_times TEXT DEFAULT '',
        time_control INTEGER DEFAULT 600,
        increment INTEGER DEFAULT 0,
        white_time_remaining INTEGER,
        black_time_remaining INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        result VARCHAR(20),
        result_reason VARCHAR(50),
        tournament_id UUID,
        rated BOOLEAN DEFAULT TRUE,
        white_rating_before INTEGER,
        black_rating_before INTEGER,
        white_rating_after INTEGER,
        black_rating_after INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);

    // ============================================
    // FRIENDSHIPS & SOCIAL
    // ============================================
    console.log('👥 Creating social tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, friend_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
        game_id UUID REFERENCES games(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TOURNAMENTS (SWISS SYSTEM)
    // ============================================
    console.log('🏆 Creating tournament tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by UUID REFERENCES users(id),
        type VARCHAR(50) DEFAULT 'swiss',
        time_control INTEGER DEFAULT 600,
        increment INTEGER DEFAULT 0,
        max_players INTEGER DEFAULT 32,
        total_rounds INTEGER DEFAULT 5,
        current_round INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'upcoming',
        prize_description TEXT,
        start_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        score DECIMAL(4,1) DEFAULT 0,
        buchholz DECIMAL(5,1) DEFAULT 0,
        sonneborn_berger DECIMAL(5,1) DEFAULT 0,
        opponents UUID[] DEFAULT '{}',
        colors CHAR(1)[] DEFAULT '{}',
        has_bye BOOLEAN DEFAULT FALSE,
        is_withdrawn BOOLEAN DEFAULT FALSE,
        registered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_pairings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
        round INTEGER NOT NULL,
        white_player_id UUID REFERENCES users(id),
        black_player_id UUID REFERENCES users(id),
        game_id UUID REFERENCES games(id),
        result VARCHAR(10),
        is_bye BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // PUZZLES & TACTICS
    // ============================================
    console.log('🧩 Creating puzzle tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS puzzles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fen VARCHAR(100) NOT NULL,
        moves TEXT NOT NULL,
        rating INTEGER DEFAULT 1500,
        rating_deviation INTEGER DEFAULT 350,
        themes TEXT[] DEFAULT '{}',
        opening_tags TEXT[] DEFAULT '{}',
        source_game_id UUID REFERENCES games(id),
        plays INTEGER DEFAULT 0,
        successes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS puzzle_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        puzzle_id UUID REFERENCES puzzles(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        solved BOOLEAN NOT NULL,
        time_taken INTEGER,
        moves_tried TEXT[],
        rating_before INTEGER,
        rating_after INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_puzzle_ratings (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER DEFAULT 1500,
        rd INTEGER DEFAULT 350,
        vol DECIMAL(8,6) DEFAULT 0.06,
        puzzles_solved INTEGER DEFAULT 0,
        puzzles_failed INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        puzzle_rush_best INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_puzzles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        puzzle_id UUID REFERENCES puzzles(id) ON DELETE CASCADE,
        date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // ACHIEVEMENTS & BADGES
    // ============================================
    console.log('🏅 Creating achievement tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        category VARCHAR(50),
        requirement_type VARCHAR(50),
        requirement_value INTEGER,
        points INTEGER DEFAULT 10,
        rarity VARCHAR(20) DEFAULT 'common'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        achievement_id VARCHAR(100) REFERENCES achievements(id),
        earned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )
    `);

    // Insert default achievements
    await client.query(`
      INSERT INTO achievements (id, name, description, icon, category, requirement_type, requirement_value, points, rarity)
      VALUES 
        ('first_win', 'First Victory', 'Win your first game', '🎉', 'games', 'wins', 1, 10, 'common'),
        ('ten_wins', 'Getting Started', 'Win 10 games', '⭐', 'games', 'wins', 10, 25, 'common'),
        ('fifty_wins', 'Experienced', 'Win 50 games', '🌟', 'games', 'wins', 50, 50, 'uncommon'),
        ('hundred_wins', 'Veteran', 'Win 100 games', '💫', 'games', 'wins', 100, 100, 'rare'),
        ('first_tournament', 'Tournament Debut', 'Participate in your first tournament', '🏆', 'tournaments', 'tournament_games', 1, 20, 'common'),
        ('tournament_winner', 'Champion', 'Win a tournament', '👑', 'tournaments', 'tournament_wins', 1, 100, 'rare'),
        ('puzzle_streak_10', 'Puzzle Solver', 'Get a 10 puzzle streak', '🧩', 'puzzles', 'puzzle_streak', 10, 25, 'common'),
        ('puzzle_streak_25', 'Puzzle Master', 'Get a 25 puzzle streak', '🎯', 'puzzles', 'puzzle_streak', 25, 50, 'uncommon'),
        ('puzzle_rush_20', 'Speed Demon', 'Score 20+ in Puzzle Rush', '⚡', 'puzzles', 'puzzle_rush', 20, 50, 'uncommon'),
        ('puzzle_rush_30', 'Lightning Fast', 'Score 30+ in Puzzle Rush', '🔥', 'puzzles', 'puzzle_rush', 30, 100, 'rare'),
        ('rating_1200', 'Advancing', 'Reach 1200 rating', '📈', 'rating', 'rating', 1200, 25, 'common'),
        ('rating_1400', 'Intermediate', 'Reach 1400 rating', '📊', 'rating', 'rating', 1400, 50, 'uncommon'),
        ('rating_1600', 'Advanced', 'Reach 1600 rating', '🚀', 'rating', 'rating', 1600, 100, 'rare'),
        ('rating_1800', 'Expert', 'Reach 1800 rating', '💎', 'rating', 'rating', 1800, 200, 'epic'),
        ('rating_2000', 'Master', 'Reach 2000 rating', '🏅', 'rating', 'rating', 2000, 500, 'legendary'),
        ('checkmate_scholar', 'Scholar''s Mate', 'Win with Scholar''s Mate', '📚', 'special', 'special', 1, 15, 'common'),
        ('checkmate_back_rank', 'Back Rank Specialist', 'Win with back rank mate', '🎭', 'special', 'special', 1, 20, 'common'),
        ('comeback_king', 'Comeback King', 'Win after being down material', '👊', 'special', 'special', 1, 30, 'uncommon'),
        ('club_member', 'Inner Circle', 'Become a verified club member', '🔐', 'social', 'club', 1, 50, 'uncommon'),
        ('friendly_player', 'Social Butterfly', 'Add 10 friends', '🤝', 'social', 'friends', 10, 25, 'common')
      ON CONFLICT (id) DO NOTHING
    `);

    // ============================================
    // LEADERBOARDS
    // ============================================
    console.log('📋 Creating leaderboard views...');
    await client.query(`
      CREATE OR REPLACE VIEW leaderboard_bullet AS
      SELECT u.id, u.username, u.avatar, 
             ur.bullet_rating as rating, ur.bullet_games as games,
             RANK() OVER (ORDER BY ur.bullet_rating DESC) as rank
      FROM users u
      JOIN user_ratings ur ON u.id = ur.user_id
      WHERE ur.bullet_games >= 10 AND u.is_banned = FALSE
      ORDER BY ur.bullet_rating DESC
      LIMIT 100
    `);

    await client.query(`
      CREATE OR REPLACE VIEW leaderboard_blitz AS
      SELECT u.id, u.username, u.avatar,
             ur.blitz_rating as rating, ur.blitz_games as games,
             RANK() OVER (ORDER BY ur.blitz_rating DESC) as rank
      FROM users u
      JOIN user_ratings ur ON u.id = ur.user_id
      WHERE ur.blitz_games >= 10 AND u.is_banned = FALSE
      ORDER BY ur.blitz_rating DESC
      LIMIT 100
    `);

    await client.query(`
      CREATE OR REPLACE VIEW leaderboard_rapid AS
      SELECT u.id, u.username, u.avatar,
             ur.rapid_rating as rating, ur.rapid_games as games,
             RANK() OVER (ORDER BY ur.rapid_rating DESC) as rank
      FROM users u
      JOIN user_ratings ur ON u.id = ur.user_id
      WHERE ur.rapid_games >= 10 AND u.is_banned = FALSE
      ORDER BY ur.rapid_rating DESC
      LIMIT 100
    `);

    await client.query(`
      CREATE OR REPLACE VIEW leaderboard_puzzles AS
      SELECT u.id, u.username, u.avatar,
             upr.rating, upr.puzzles_solved, upr.best_streak, upr.puzzle_rush_best,
             RANK() OVER (ORDER BY upr.rating DESC) as rank
      FROM users u
      JOIN user_puzzle_ratings upr ON u.id = upr.user_id
      WHERE upr.puzzles_solved >= 20 AND u.is_banned = FALSE
      ORDER BY upr.rating DESC
      LIMIT 100
    `);

    // ============================================
    // CLUB MEMBERS CONTENT
    // ============================================
    console.log('🔐 Creating club content tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS club_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        content_type VARCHAR(50),
        attachment_url VARCHAR(500),
        created_by UUID REFERENCES users(id),
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS club_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // SPECTATOR SYSTEM
    // ============================================
    console.log('👁️ Creating spectator tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_spectators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID REFERENCES games(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(game_id, user_id)
      )
    `);

    // ============================================
    // FAIR PLAY / REPORTS
    // ============================================
    console.log('⚖️ Creating fair play tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS fair_play_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID REFERENCES users(id),
        reported_user_id UUID REFERENCES users(id),
        game_id UUID REFERENCES games(id),
        reason VARCHAR(100) NOT NULL,
        details TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // CUSTOMIZATION (BOARDS & PIECES)
    // ============================================
    console.log('🎨 Creating customization tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS board_themes (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        light_color VARCHAR(7) NOT NULL,
        dark_color VARCHAR(7) NOT NULL,
        is_premium BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS piece_sets (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        style VARCHAR(50),
        is_premium BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        board_theme VARCHAR(50) DEFAULT 'classic',
        piece_set VARCHAR(50) DEFAULT 'cburnett',
        sound_enabled BOOLEAN DEFAULT TRUE,
        auto_promote_queen BOOLEAN DEFAULT TRUE,
        show_legal_moves BOOLEAN DEFAULT TRUE,
        confirm_resign BOOLEAN DEFAULT TRUE,
        animation_speed VARCHAR(20) DEFAULT 'normal'
      )
    `);

    // Insert default themes
    await client.query(`
      INSERT INTO board_themes (id, name, light_color, dark_color) VALUES
        ('classic', 'Classic', '#f0d9b5', '#b58863'),
        ('blue', 'Blue', '#dee3e6', '#8ca2ad'),
        ('green', 'Green', '#ffffdd', '#86a666'),
        ('wood', 'Wood', '#e8c87c', '#a17a4d'),
        ('purple', 'Purple', '#e8e0f0', '#957ab0'),
        ('grey', 'Grey', '#cccccc', '#888888'),
        ('ocean', 'Ocean', '#b5d3e7', '#5a8bb0'),
        ('candy', 'Candy', '#ffe4e1', '#ffb6c1')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO piece_sets (id, name, style) VALUES
        ('cburnett', 'Cburnett', 'classic'),
        ('merida', 'Merida', 'classic'),
        ('alpha', 'Alpha', 'modern'),
        ('chess7', 'Chess7', 'modern'),
        ('companion', 'Companion', 'classic'),
        ('fantasy', 'Fantasy', 'artistic'),
        ('spatial', 'Spatial', '3d'),
        ('shapes', 'Shapes', 'minimalist')
      ON CONFLICT (id) DO NOTHING
    `);

    // ============================================
    // INDEXES FOR PERFORMANCE
    // ============================================
    console.log('🔧 Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_white ON games(white_player_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_black ON games(black_player_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_tournament ON games(tournament_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tournament_participants ON tournament_participants(tournament_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tournament_pairings ON tournament_pairings(tournament_id, round)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles USING GIN(themes)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_user ON puzzle_attempts(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_achievements ON user_achievements(user_id)`);

    // ============================================
    // TRIGGERS FOR AUTO-UPDATES
    // ============================================
    console.log('⚡ Creating triggers...');
    
    // Auto-create ratings when user is created
    await client.query(`
      CREATE OR REPLACE FUNCTION create_user_ratings()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO user_ratings (user_id) VALUES (NEW.id);
        INSERT INTO user_puzzle_ratings (user_id) VALUES (NEW.id);
        INSERT INTO user_preferences (user_id) VALUES (NEW.id);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_create_user_ratings ON users;
      CREATE TRIGGER trigger_create_user_ratings
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_ratings();
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Tables created: users, user_ratings, games, friendships, messages,');
    console.log('   tournaments, tournament_participants, tournament_pairings,');
    console.log('   puzzles, puzzle_attempts, user_puzzle_ratings, daily_puzzles,');
    console.log('   achievements, user_achievements, club_content, club_events,');
    console.log('   game_spectators, fair_play_reports, board_themes, piece_sets,');
    console.log('   user_preferences');
    console.log('👁️ Views created: leaderboard_bullet, leaderboard_blitz,');
    console.log('   leaderboard_rapid, leaderboard_puzzles');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
