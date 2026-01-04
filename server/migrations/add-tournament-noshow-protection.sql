-- Tournament No-Show Protection Migration
-- Adds fields to handle inactive players and prevent tournament deadlock

-- Add new columns to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMP;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_end TIMESTAMP;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_end TIMESTAMP;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS forfeit_hours INTEGER DEFAULT 24;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 5;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS increment INTEGER DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_description TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'swiss';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_arena BOOLEAN DEFAULT FALSE;

-- Add new columns to tournament_participants table
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS games_forfeited INTEGER DEFAULT 0;
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT FALSE;
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT NOW();
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS opponents INTEGER[] DEFAULT '{}';
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS has_bye BOOLEAN DEFAULT FALSE;
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

-- Add new columns to tournament_pairings table
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE;
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS white_player_id INTEGER REFERENCES users(id);
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS black_player_id INTEGER REFERENCES users(id);
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS forfeit_deadline TIMESTAMP;
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS is_forfeited BOOLEAN DEFAULT FALSE;
ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS forfeited_by INTEGER REFERENCES users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournament_participants_activity ON tournament_participants(tournament_id, last_activity);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_active ON tournament_participants(tournament_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tournament_pairings_deadline ON tournament_pairings(forfeit_deadline) WHERE result IS NULL;
