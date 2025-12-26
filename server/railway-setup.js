/**
 * Railway Setup Script
 * Run this after Railway creates the database
 * Usage: node server/railway-setup.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setup() {
  console.log('🚀 Setting up database for Railway...\n');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database');
    client.release();
    
    // Run migration - migrate.js runs itself when required
    // We need to spawn it as a child process since it calls process.exit()
    console.log('📦 Running migrations...');
    const { spawn } = require('child_process');
    const migrate = spawn('node', ['utils/migrate.js'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env
    });
    
    migrate.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Railway setup complete!');
        process.exit(0);
      } else {
        console.error('\n❌ Migration failed with code:', code);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setup();

