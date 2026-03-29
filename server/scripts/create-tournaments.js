/**
 * Create tournaments script
 * Run this on the server to seed tournaments.
 * Usage: DATABASE_URL=<your_db_url> node server/scripts/create-tournaments.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTournaments() {
  console.log('🏆 Creating tournaments...\n');

  // Ensure entry_fee column exists
  await pool.query(`
    ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee INTEGER DEFAULT 0;
  `);

  // Get admin user (first admin found)
  const admin = await pool.query(`SELECT id, username FROM users WHERE is_admin = TRUE LIMIT 1`);
  if (admin.rows.length === 0) {
    console.error('❌ No admin user found! Create an admin user first.');
    process.exit(1);
  }
  const adminId = admin.rows[0].id;
  console.log(`Using admin: ${admin.rows[0].username} (id: ${adminId})`);

  // ---- 1. QUICK TEST TOURNAMENT ----
  console.log('\n📋 Creating Quick Test Tournament...');
  const testResult = await pool.query(`
    INSERT INTO tournaments (
      name, description, type, time_control, increment, max_players, total_rounds,
      status, current_round, start_time, forfeit_hours, is_arena, created_by, entry_fee
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING id
  `, [
    'Quick Test Tournament',
    '⚡ A quick test tournament to make sure everything works!\n\n• 3 minute games\n• 2 rounds\n• Free entry\n• Just for testing!',
    'swiss',
    180,    // 3 minutes
    0,      // no increment
    8,      // max 8 players
    2,      // 2 rounds
    'upcoming',
    0,
    new Date(Date.now() + 60 * 60 * 1000).toISOString(), // starts 1 hour from now
    2,      // 2 hour forfeit window
    false,
    adminId,
    0       // FREE
  ]);
  console.log(`✅ Test tournament created! ID: ${testResult.rows[0].id}`);

  // ---- 2. REAL TOURNAMENT ----
  console.log('\n📋 Creating Riddick Chess Open Tournament...');
  const realResult = await pool.query(`
    INSERT INTO tournaments (
      name, description, type, time_control, increment, max_players, total_rounds,
      status, current_round, start_time, forfeit_hours, is_arena, created_by, entry_fee
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING id
  `, [
    'Riddick Chess Open — April 2026',
    '🏆 The Riddick Chess Open!\n\n📅 Sign up now, tournament starts April 5th\n⏱️ 5+0 blitz games (5 minutes per player)\n🔄 Swiss system — 4 rounds\n👥 Open to everyone!\n\n🆓 FREE entry — just sign up and play!\n\nCome compete and climb the leaderboard!',
    'swiss',
    300,    // 5 minutes
    0,      // no increment
    32,     // max 32 players
    4,      // 4 rounds
    'upcoming',
    0,
    '2026-04-05T12:00:00Z', // April 5, 2026 at noon UTC
    8,      // 8 hour forfeit window
    false,
    adminId,
    0       // FREE
  ]);
  console.log(`✅ Real tournament created! ID: ${realResult.rows[0].id}`);

  console.log('\n🎉 Done! Tournaments created successfully.');
  console.log(`\nView them at:`);
  console.log(`  Test: /tournament/${testResult.rows[0].id}`);
  console.log(`  Real: /tournament/${realResult.rows[0].id}`);

  await pool.end();
}

createTournaments().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
