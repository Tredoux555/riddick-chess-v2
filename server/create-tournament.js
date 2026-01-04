/**
 * Create Official Back-to-School Tournament
 * Run: node create-tournament.js
 * Or in Railway console: node server/create-tournament.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

async function createTournament() {
  const client = await pool.connect();
  
  try {
    // First, run the migrations to add new columns
    console.log('📦 Adding tournament protection columns...');
    
    await client.query(`
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_start TIMESTAMP;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS registration_end TIMESTAMP;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_end TIMESTAMP;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS forfeit_hours INTEGER DEFAULT 24;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 5;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS increment INTEGER DEFAULT 0;
      ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_arena BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS games_forfeited INTEGER DEFAULT 0;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS is_withdrawn BOOLEAN DEFAULT FALSE;
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS forfeit_deadline TIMESTAMP;
      ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS is_forfeited BOOLEAN DEFAULT FALSE;
      ALTER TABLE tournament_pairings ADD COLUMN IF NOT EXISTS forfeited_by INTEGER;
    `);
    console.log('✅ Columns added');

    // Get admin user
    const adminResult = await client.query(`SELECT id FROM users WHERE is_admin = true LIMIT 1`);
    const adminId = adminResult.rows[0]?.id || 1;
    
    console.log('🏆 Creating tournament...');
    
    const result = await client.query(`
      INSERT INTO tournaments (
        name, description, type, time_control, increment, max_players, total_rounds,
        status, current_round, start_time, registration_start, registration_end,
        tournament_end, forfeit_hours, is_arena, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING id, name, status, start_time
    `, [
      "Riddick from G5-1's Official Tournament",
      `The schoolwide official back-to-school tournament to have fun. Anyone can join!

返校官方锦标赛，欢乐至上。欢迎所有人参加！

📅 SCHEDULE / 时间安排:
• Registration / 报名: Mon Jan 5th - Fri Jan 9th 5PM
• Tournament / 比赛: Fri Jan 9th 5PM - Sun Jan 11th 6PM  
• Finals / 决赛: Mon Jan 12th at Recess (in person! / 当面对决！)

⚠️ RULES / 规则:
• You have 24 hours to play each game or you forfeit
• 每场比赛必须在24小时内完成，否则判负
• 2 forfeits = automatic withdrawal
• 两次弃权将被自动退出比赛
• Top 2 players play finals in person!
• 前两名选手将进行现场决赛！`,
      'swiss',
      600,    // 10 minutes
      0,      // no increment
      1500,   // max players
      9,      // rounds
      'upcoming',
      0,
      '2026-01-09T09:00:00Z',  // Fri Jan 9 5PM Beijing = 9AM UTC
      '2026-01-04T16:00:00Z',  // Mon Jan 5 midnight Beijing = Jan 4 4PM UTC
      '2026-01-09T09:00:00Z',  // Registration ends when tournament starts
      '2026-01-11T10:00:00Z',  // Sun Jan 11 6PM Beijing = 10AM UTC
      24,     // forfeit hours
      false,  // not arena
      adminId
    ]);

    const tournament = result.rows[0];
    console.log('');
    console.log('🎉 TOURNAMENT CREATED SUCCESSFULLY!');
    console.log('================================');
    console.log(`ID: ${tournament.id}`);
    console.log(`Name: ${tournament.name}`);
    console.log(`Status: ${tournament.status}`);
    console.log(`Start: ${tournament.start_time}`);
    console.log('');
    console.log(`View at: https://riddickchess.site/tournament/${tournament.id}`);
    console.log(`Share link: https://riddickchess.site/tournaments`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Check if tournament already exists
    if (error.message.includes('duplicate')) {
      console.log('Tournament may already exist. Checking...');
      const existing = await client.query(`SELECT id, name FROM tournaments WHERE name LIKE '%Official Tournament%' ORDER BY id DESC LIMIT 1`);
      if (existing.rows[0]) {
        console.log(`Found existing: ID ${existing.rows[0].id} - ${existing.rows[0].name}`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

createTournament();
