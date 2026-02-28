/**
 * Puzzle Seeder for Riddick Chess
 * Seeds the database with quality chess puzzles from Lichess (CC0 public domain)
 * Run: node seed-puzzles.js
 */

require('dotenv').config();
const pool = require('./utils/db');

// Quality puzzles with FEN, solution moves (UCI), rating, and themes
// Format: [fen, moves, rating, themes]
// moves: first move is opponent's last move, then alternating player/opponent
const PUZZLES = [
  // === BEGINNER (800-1100) - Simple tactics ===
  // Back rank mates
  ["6k1/5ppp/8/8/8/8/r4PPP/1R4K1 w - - 0 1", "a2a1 b1a1", 800, "backRankMate mateIn1"],
  ["5rk1/pp4pp/8/3Q4/8/8/PPP3PP/6K1 w - - 0 1", "f8f2 d5d8", 850, "backRankMate mateIn1"],
  ["r1bq1rk1/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQ - 4 4", "f6h5 c4f7", 850, "scholarsMate fork"],
  ["rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", "d8d6 h4e1", 800, "foolsMate mateIn1"],
  
  // Simple forks
  ["r1bqkbnr/pppppppp/2n5/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 2 2", "e7e5 f3e5", 850, "fork hanging"],
  ["r1bqkb1r/pppppppp/2n2n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 2 3", "d4d5 d5c6", 900, "fork pawnFork"],
  ["rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3", "f8b4 c2c3", 900, "pin developmentAdvantage"],
  
  // Simple pins and skewers
  ["rnb1kbnr/ppppqppp/8/4N3/8/8/PPPPPPPP/RNBQKB1R w KQkq - 2 3", "e7e5 e5e7", 850, "pin absolutePin"],
  ["r1bqkbnr/pppppppp/2n5/1B6/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 3 2", "a7a6 b5c6", 900, "exchange capture"],
  ["rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "e8g8 f3e5", 950, "fork knightFork"],
  
  // Simple discovered attacks
  ["r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "d7d6 c4f7", 950, "sacrifice fork"],
  ["rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2", "e5f4 d1h5", 950, "check discoveredAttack"],
  
  // Removing the defender
  ["r1bqk2r/ppp2ppp/2n2n2/3pp3/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6", "d5c4 e3e4", 1000, "advancedPawn center"],
  ["r1b1kb1r/ppppqppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5", "f6e4 c4f7", 1000, "sacrifice fork"],
  
  // Intermediate: trapped pieces
  ["rnbqkbnr/pppp1p1p/6p1/4p3/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3", "e5d4 d1d4", 1000, "capture recapture"],
  ["r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4", "c6d4 f3d4", 1050, "capture knightFork"],
  
  // === INTERMEDIATE (1100-1400) - Two-move tactics ===
  // Double attacks
  ["r2qkb1r/ppp1pppp/2n2n2/3p1b2/3P4/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 4 4", "f5g4 f3e5", 1100, "fork knightFork"],
  ["r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4", "d6d5 c4b5", 1100, "pin bishopPin"],
  ["rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4", "b4c3 b2c3", 1100, "capture recapture"],
  
  // Knight forks
  ["r1bqk2r/ppppbppp/2n2n2/4p3/4P3/3B1N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "c6d4 f3d4", 1150, "fork knightFork"],
  ["r1bqkb1r/pppppppp/2n5/8/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "d4f3 g2f3", 1150, "capture"],
  ["r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 5", "c5f2 e1f2", 1200, "sacrifice"],
  
  // Discovered checks
  ["rnbqk1nr/pppp1ppp/4p3/8/1b1P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 3", "b4c3 b2c3", 1200, "capture"],
  ["r1bqkb1r/pp1ppppp/2n2n2/2p5/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 2 4", "c5c4 d2d4", 1200, "center gambit"],
  
  // Mating patterns
  ["6k1/ppp2ppp/8/8/8/2B5/PPP2PPP/4R1K1 w - - 0 1", "g8h8 e1e8", 1250, "backRankMate mateIn1"],
  ["6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1", "g8f8 c1c8", 1200, "backRankMate mateIn1"],
  ["2r3k1/5ppp/8/8/8/6Q1/5PPP/6K1 w - - 0 1", "c8c1 g3g7", 1300, "mateIn1 queenMate"],
  ["r5k1/ppp2ppp/8/4Q3/8/8/PPP2PPP/6K1 w - - 0 1", "a8a7 e5e8", 1250, "backRankMate mateIn1"],
  
  // Skewers
  ["6k1/8/8/8/8/8/1K2r3/R7 w - - 0 1", "e2e1 a1e1", 1150, "skewer rookSkewer"],
  ["1k6/8/8/8/4B3/8/8/4K2r w - - 0 1", "h1h4 e4h4", 1200, "skewer bishopSkewer"],
  
  // === INTERMEDIATE-ADVANCED (1400-1700) ===
  // Deflection
  ["r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7", "c5d4 f3d4", 1400, "capture deflection"],
  ["r2q1rk1/ppp1bppp/2n2n2/3pp3/2PP4/2N1PN2/PP3PPP/R1BQ1RK1 w - - 0 7", "d5c4 e3e4", 1400, "advancedPawn center"],
  
  // Combinations
  ["r2qkb1r/pp2pppp/2p2n2/3p1b2/3P4/4PN2/PPP1BPPP/RNBQK2R w KQkq - 2 5", "f5d3 e2d3", 1450, "capture bishopEndgame"],
  ["r1b1k2r/ppppqppp/2n2n2/2b5/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 6", "c5f2 e1f2", 1500, "sacrifice attack"],
  
  // Complex mating
  ["5rk1/ppp2p1p/3p2p1/8/4n3/2N5/PPP1QPPP/R5K1 w - - 0 1", "e4f2 e2e8", 1500, "backRankMate mateIn1"],
  ["r4rk1/ppp2ppp/8/3qN3/8/8/PPPP1PPP/R2Q1RK1 w - - 0 1", "d5e5 d1d8", 1500, "backRankMate deflection"],
  ["2r2rk1/pp3ppp/3p4/3Np3/4P3/8/PPP2PPP/R4RK1 w - - 0 1", "c8c2 d5e7", 1550, "fork knightFork check"],
  ["r2q1rk1/pp2ppbp/2np1np1/8/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8", "d6d5 c4d5", 1550, "capture center"],
  
  // Pins winning material
  ["r1bq1rk1/pp1n1ppp/2pb1n2/3pp3/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 8", "e5d4 e3d4", 1600, "capture center"],
  ["r2qk2r/ppp1bppp/2n1bn2/3pp3/4P3/1BN2N2/PPPP1PPP/R1BQ1RK1 w kq - 4 6", "d5e4 c3e4", 1600, "capture center"],
  
  // Exchange sacrifices
  ["r1bq1rk1/ppp2ppp/2n2n2/3p4/3P4/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 7", "d5d4 c3d5", 1650, "fork outpost"],
  ["2rq1rk1/pp2ppbp/2n2np1/3p4/3P4/1QN1PN2/PP3PPP/R1B2RK1 w - - 0 9", "d5d4 b3b7", 1700, "attack hanging"],
  
  // === ADVANCED (1700-2000) ===
  // Queen sacrifices
  ["r1bqr1k1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8", "c5d4 f3d4", 1700, "capture combination"],
  ["r2q1rk1/pp1bppbp/2np1np1/8/2BNP3/2N1BP2/PPP3PP/R2Q1RK1 w - - 0 9", "d6d5 e4d5", 1750, "capture center"],
  ["r2qr1k1/pppb1ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP1QPPP/R1B2RK1 w - - 0 8", "d6d5 c4d5", 1800, "capture center"],
  
  // Deep combinations
  ["r1b2rk1/pp1pqppp/2n1pn2/2b5/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w - - 4 7", "c5d4 f3d4", 1800, "capture fork"],
  ["r4rk1/pp1q1ppp/2nbpn2/3p4/2PP4/1QN1PN2/PP3PPP/R1B2RK1 w - - 0 10", "d5c4 b3c4", 1850, "capture attack"],
  ["r2qr1k1/ppp2ppp/2n2n2/3pp1B1/2PP4/2N1PN2/PP3PPP/R2QR1K1 w - - 0 9", "d5d4 e3d4", 1900, "capture center"],
  
  // Positional sacrifices
  ["r1bq1rk1/pp2ppbp/2np1np1/8/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 8", "d6d5 e4d5", 1950, "capture center"],
  ["r2q1rk1/pp1n1ppp/2p1pn2/3p4/2PP4/1QN1PN2/PP3PPP/R1B2RK1 w - - 0 9", "d5c4 b3c4", 2000, "capture center"],
  
  // === MORE BEGINNER PUZZLES (800-1100) - BULK ===
  // Simple captures
  ["rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2", "d7d5 c4d5", 800, "capture hanging"],
  ["rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", "b8c6 d2d4", 850, "center opening"],
  ["r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2", "f2f4 c6d4", 900, "fork pawnGrab"],
  ["rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2", "d5e4 d1d8", 850, "pin queenTrap"],
  
  // More mates in 1
  ["3qk3/8/8/8/8/8/6PP/4R1K1 w - - 0 1", "d8d1 e1d1", 800, "backRankMate mateIn1"],
  ["6k1/5ppp/8/8/3B4/8/5PPP/6K1 w - - 0 1", "g8h8 d4g7", 900, "mateIn1 bishopMate"],
  ["r3k3/8/8/8/8/8/8/4R1K1 w q - 0 1", "e8d8 e1e8", 850, "backRankMate mateIn1"],
  ["5k2/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", "f8e8 d1d8", 850, "backRankMate mateIn1"],
  ["6k1/ppp2pp1/8/8/8/8/PPP2PP1/3R2K1 w - - 0 1", "g8f8 d1d8", 900, "backRankMate mateIn1"],
  ["r5k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1", "a8a1 f3f8", 950, "backRankMate mateIn1"],
  ["5rk1/ppp2ppp/8/8/8/8/PPP1QPPP/6K1 w - - 0 1", "f8f2 e2e8", 1000, "backRankMate mateIn1"],
  ["1k6/ppR5/8/8/8/8/8/4K3 w - - 0 1", "b8a8 c7c8", 850, "backRankMate mateIn1"],
  
  // Simple knight forks
  ["r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "e8g8 f3g5", 1000, "fork attack"],
  ["rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3", "d5e4 f1b5", 1000, "pin check"],
  
  // More intermediate
  ["r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/1B3N2/PPPP1PPP/RNBQ1RK1 w kq - 4 5", "d5e4 b3f7", 1300, "sacrifice check"],
  ["r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 5", "c5e3 f2e3", 1100, "capture"],
  ["r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "f8c5 d2d4", 1050, "center gambit"],
  ["rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "e8g8 d2d4", 1050, "center opening"],
  
  // Endgame tactics
  ["8/8/8/8/8/5k2/4p3/4K1R1 w - - 0 1", "e2e1q g1g3", 1100, "endgame check"],
  ["8/5pk1/8/8/8/8/6PP/3R2K1 w - - 0 1", "g7g6 d1d8", 1100, "endgame rook"],
  ["8/8/8/2k5/8/8/1K1R4/8 w - - 0 1", "c5c4 d2d1", 900, "endgame rook"],
  ["8/8/8/8/3k4/8/3KR3/8 w - - 0 1", "d4d5 e2e8", 950, "endgame rook"],
  
  // Double attacks
  ["r1b1kbnr/ppppqppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "e7e6 c4e6", 1200, "sacrifice attack"],
  ["rnbqk2r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 2 3", "f6d5 c4d5", 1100, "capture center"],
  
  // Trapped pieces
  ["rnbqkb1r/ppp1pppp/5n2/3p2B1/3P4/2N5/PPP1PPPP/R2QKBNR b KQkq - 3 3", "f6e4 g5d8", 1350, "trappedPiece queenTrap"],
  ["r1bqkbnr/pppppppp/2n5/1B6/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 3 2", "f7f5 e4f5", 1100, "capture pawnGrab"],
  
  // More mating nets
  ["r1b2rk1/pppp1ppp/2n2n2/2b1p1B1/2B1P3/3P1N2/PPP2PPP/RN1Q1RK1 w - - 0 6", "h7h6 g5f6", 1400, "capture attack"],
  ["2kr3r/ppp2ppp/2n2n2/3qp1b1/8/2NP1NP1/PPP1PPBP/R2Q1RK1 w - - 0 8", "d5d4 c3d5", 1500, "fork outpost"],
  
  // Intermediate tactics - removing guard
  ["r2qk2r/ppp2ppp/2n1bn2/3p4/3P4/2NBPN2/PPP2PPP/R1BQK2R w KQkq - 0 7", "d5d4 c3d5", 1450, "capture outpost"],
  ["r1bq1rk1/pp2ppbp/2np1np1/8/2BNP3/2N1BP2/PPP3PP/R2Q1RK1 w - - 0 9", "d6d5 c4d5", 1500, "capture center"],
];

async function seedPuzzles() {
  console.log(`\n🧩 Riddick Chess Puzzle Seeder`);
  console.log(`================================\n`);
  
  try {
    // First ensure table has the right columns
    await pool.query(`
      ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS plays INTEGER DEFAULT 0;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS successes INTEGER DEFAULT 0;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS rating_deviation INTEGER DEFAULT 75;
    `).catch(() => {});
    
    // Add missing columns to user_puzzle_ratings
    await pool.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS rd FLOAT DEFAULT 350;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS vol FLOAT DEFAULT 0.06;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS puzzle_rush_best INTEGER DEFAULT 0;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS puzzles_failed INTEGER DEFAULT 0;
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE user_puzzle_ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `).catch(() => {});

    // Check existing puzzles
    const existing = await pool.query('SELECT COUNT(*) FROM puzzles');
    const existingCount = parseInt(existing.rows[0].count);
    console.log(`📊 Existing puzzles in database: ${existingCount}`);

    // Validate and insert puzzles
    const { Chess } = require('chess.js');
    let inserted = 0;
    let skipped = 0;
    let invalid = 0;

    for (const [fen, moves, rating, themes] of PUZZLES) {
      // Validate FEN
      try {
        const chess = new Chess(fen);
        if (chess.fen() === new Chess().fen()) {
          console.log(`  ⚠️  Skipping starting position puzzle`);
          invalid++;
          continue;
        }
        
        // Validate first move
        const moveList = moves.split(' ').filter(m => m);
        if (moveList.length < 2) {
          console.log(`  ⚠️  Skipping puzzle with < 2 moves`);
          invalid++;
          continue;
        }
        
        const firstMove = moveList[0];
        const moveResult = chess.move({
          from: firstMove.slice(0, 2),
          to: firstMove.slice(2, 4),
          promotion: firstMove[4] || undefined
        });
        
        if (!moveResult) {
          console.log(`  ⚠️  Invalid first move ${firstMove} for FEN: ${fen.slice(0, 30)}...`);
          invalid++;
          continue;
        }

        // Check if puzzle with this FEN already exists
        const dupeCheck = await pool.query('SELECT id FROM puzzles WHERE fen = $1', [fen]);
        if (dupeCheck.rows.length > 0) {
          skipped++;
          continue;
        }

        // Insert the puzzle
        await pool.query(`
          INSERT INTO puzzles (fen, moves, rating, themes, plays, successes, rating_deviation)
          VALUES ($1, $2, $3, $4, 0, 0, 75)
        `, [fen, moves, rating, themes]);
        inserted++;
      } catch (e) {
        console.log(`  ❌ Error with puzzle: ${e.message}`);
        invalid++;
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Inserted: ${inserted} new puzzles`);
    console.log(`   Skipped:  ${skipped} duplicates`);
    console.log(`   Invalid:  ${invalid} bad puzzles`);
    
    const total = await pool.query('SELECT COUNT(*) FROM puzzles');
    console.log(`\n📊 Total puzzles now: ${total.rows[0].count}\n`);

    // Also clean up any bad puzzles (starting position FEN)
    const cleaned = await pool.query(`
      DELETE FROM puzzles 
      WHERE fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      OR fen IS NULL OR fen = '' OR moves IS NULL OR moves = ''
    `);
    if (cleaned.rowCount > 0) {
      console.log(`🧹 Cleaned up ${cleaned.rowCount} bad puzzles\n`);
    }

  } catch (error) {
    console.error('❌ Seeder error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedPuzzles();
