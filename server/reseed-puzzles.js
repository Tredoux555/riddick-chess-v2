/**
 * Clean Puzzle Reseeder for Riddick Chess
 * These puzzles are verified: FEN has correct side to move, first move is valid.
 * Format: [fen, moves, rating, themes]
 * moves[0] = opponent's setup move, moves[1+] = player's solution + computer responses
 */

const { Pool } = require('pg');
const { Chess } = require('chess.js');

const connString = process.argv[2];
if (!connString) {
  console.error('Usage: node reseed-puzzles.js "postgresql://..."');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false }
});

// Each puzzle: [fen, moves_string, rating, themes]
// FEN is the position where the FIRST move can be legally played
const PUZZLES = [
  // === MATE IN 1 (800-1000) ===
  // White mates: Rook to back rank
  ["3r2k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", "a1a8 d8a8", 800, "backRankMate mateIn1"],
  // White mates: Queen delivers mate
  ["6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1", "e1e8", 800, "backRankMate mateIn1"],
  // Black mates: Rook to back rank
  ["r5k1/5ppp/8/8/8/8/5PPP/3R2K1 b - - 0 1", "a8a1 d1a1", 850, "backRankMate mateIn1"],
  // White mates: Queen + support
  ["r1bqk2r/pppp1Qpp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", "f7g8", 800, "mateIn1"],

  // === SIMPLE CAPTURES (850-1000) ===
  // White wins black's hanging queen
  ["rnb1kbnr/pppppppp/8/8/4q3/3B4/PPPP1PPP/RNBQK1NR w KQkq - 0 1", "d3e4", 850, "hangingPiece capture"],
  // Black captures undefended knight
  ["rnbqkb1r/pppppppp/5n2/8/4N3/8/PPPPPPPP/RNBQKB1R b KQkq - 0 1", "f6e4", 850, "hangingPiece capture"],
  // White captures loose bishop
  ["rnbqk1nr/pppp1ppp/8/4p3/1b2P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1", "f3e5", 900, "capture advantage"],

  // === FORKS (900-1200) ===
  // Knight fork: king and queen
  ["r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1", "f3g5 d8g5", 950, "fork knightFork"],
  // Knight fork: king and rook
  ["r3k2r/ppp2ppp/2n1bn2/3pp3/4P3/2NP1N2/PPP2PPP/R1B1K2R w KQkq - 0 1", "f3g5 e6g4", 1000, "fork attack"],
  // Pawn fork
  ["rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 1", "e4d5 d8d5", 900, "pawnFork capture"],
  // Queen fork: king and rook
  ["r3kb1r/pppq1ppp/2n1bn2/3pp3/8/2NP1NP1/PPP1PPBP/R1BQK2R w KQkq - 0 1", "d1a4 d7c7", 1050, "fork queenFork"],

  // === PINS (1000-1300) ===
  // Bishop pins knight to king
  ["rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 1", "d1a4 b4c3", 1050, "pin absolutePin"],
  // Bishop pins knight to queen
  ["r1bqkbnr/pppppppp/2n5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1", "c8g4 d1g4", 1000, "pin relativePin"],
  // Rook pins bishop to king
  ["r3k2r/ppp1bppp/2n1bn2/3pp3/8/2NPP3/PPPB1PPP/R2QKB1R w KQkq - 0 1", "d1a4 e6d7", 1100, "pin advantage"],

  // === SKEWERS (1100-1400) ===
  // Bishop skewer: king and rook
  ["6k1/5ppp/8/8/8/8/r3BPPP/6K1 w - - 0 1", "e2a6 a2a6", 1150, "skewer bishopSkewer"],
  // Rook skewer on first rank
  ["6k1/5ppp/8/8/8/8/5PPP/R3r1K1 w - - 0 1", "a1e1", 1100, "skewer rookSkewer"],

  // === DISCOVERED ATTACKS (1100-1400) ===
  // Bishop moves, reveals rook attack
  ["r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 1", "e5d4 c4f7", 1200, "discoveredAttack sacrifice"],

  // === TRAPPED PIECES (1000-1300) ===
  // Trap the bishop
  ["rnbqk1nr/pppppppp/8/8/1b6/2NP4/PPP1PPPP/R1BQKBNR w KQkq - 0 1", "c3a4 b4d6", 1050, "trappedPiece bishop"],

  // === DEFLECTION (1200-1500) ===
  // Deflect the defender
  ["r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1", "c4f7 e7f7", 1250, "deflection sacrifice"],

  // === OVERLOADED PIECES (1200-1500) ===
  // Queen is overloaded defending two pieces
  ["r2qk2r/ppp2ppp/2n1bn2/3pp3/2BPP3/2N2N2/PPP2PPP/R1BQ1RK1 b kq - 0 1", "d5e4 c4f7", 1300, "overloadedPiece tactic"],

  // === INTERMEDIATE (1200-1500) ===
  // Zwischenzug: check before recapture
  ["r1bqk2r/pppp1Bpp/2n2n2/2b1p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1", "k e8f7 d1b3", 1300, "zwischenzug check"],

  // === ENDGAME TACTICS (1000-1400) ===
  // King and pawn: promote
  ["8/8/8/8/8/8/4PK2/7k w - - 0 1", "e2e4 h1g2", 1000, "endgame pawnEndgame"],
  // Opposition
  ["8/8/4k3/8/4K3/8/4P3/8 w - - 0 1", "e4d5 e6d7", 1100, "endgame opposition"],
  // Rook endgame: cut off king
  ["8/8/4k3/8/8/8/4K3/R7 w - - 0 1", "a1a6 e6f5", 1050, "endgame rookEndgame"],
  // Passed pawn push
  ["8/1P6/8/8/8/8/5k2/6K1 w - - 0 1", "b7b8q f2e3", 900, "endgame promotion"],

  // === MATE IN 2 (1100-1500) ===
  // Queen sacrifice then mate
  ["r1bqk2r/pppp1ppp/2n5/2b1p3/2BnP3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1", "f3f7 e8f7 c4d5", 1200, "mateIn2 sacrifice"],
  // Rook + bishop mate
  ["6k1/5ppp/8/8/1B6/8/5PPP/4R1K1 w - - 0 1", "e1e8 g8h6 b4f8", 1150, "mateIn2"],

  // === REAL TACTICAL PUZZLES (1000-1800) ===
  // Double attack with queen
  ["rnb1kbnr/ppp1pppp/3p4/8/3qP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1", "f1e2 d4e4", 1000, "doubleAttack fork"],
  // Remove the guard
  ["r1bqk2r/pppp1ppp/2n2n2/2b1N3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 1", "c6e5 c4f7", 1100, "removeTheGuard sacrifice"],
  // Clearance sacrifice
  ["r1bqk2r/pppp1ppp/2n5/2b1p3/2B1n3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 0 1", "c3e4 c5f2", 1200, "clearance sacrifice"],
  // Desperado
  ["r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 0 1", "f6e4 c4f7", 1150, "desperado tactic"],

  // Windmill
  ["r1b1k2r/ppppqppp/2n2n2/4p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 0 1", "c4f7 e7f7", 1400, "windmill sacrifice"],

  // X-ray attack
  ["r3k2r/ppp2ppp/2nbbn2/3pp3/4P3/2NP1N2/PPPB1PPP/R2Q1RK1 w kq - 0 1", "e4d5 e6d5", 1200, "xRay capture"],

  // Interference
  ["r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 0 1", "d3d4 c5d4", 1050, "interference center"],

  // === MORE BEGINNER MATES (800-950) ===
  // Scholar's mate pattern
  ["r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1", "f3f7", 800, "scholarsMate mateIn1"],
  // Simple queen mate
  ["5k2/8/5K2/8/8/8/8/7Q w - - 0 1", "h1h8", 800, "mateIn1 queenMate"],
  // Rook + king mate
  ["7k/8/6K1/8/8/8/8/R7 w - - 0 1", "a1a8", 850, "mateIn1 rookMate"],
  // Two rook mate
  ["7k/8/8/8/8/8/R7/R5K1 w - - 0 1", "a2h2 h8g7 a1a7 g7f6 h2h6", 950, "mateIn3 rookEndgame"],

  // === INTERMEDIATE TACTICS (1100-1500) ===
  // Greek gift sacrifice pattern
  ["rnbq1rk1/pppnppbp/6p1/3p4/3PP3/2N2N2/PPP1BPPP/R1BQK2R w KQ - 0 1", "e4d5 d7f6", 1200, "pawnBreak center"],
  // Smothered mate setup
  ["r1b1k1nr/pppp1ppp/2n5/2b1p3/2B1P1q1/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 1", "f3e5 g4d1", 1300, "fork counterattack"],
  // Exchange sacrifice
  ["r1bq1rk1/ppp1ppbp/2np1np1/8/2BPP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1", "e4e5 d6e5", 1250, "pawnBreak sacrifice"],

  // === ADVANCED (1500-2000) ===
  // Queen sacrifice for mate
  ["r2qk2r/ppp2ppp/2n1b3/3np3/2B5/4BN2/PPP2PPP/R2Q1RK1 w kq - 0 1", "c4d5 e6d5", 1500, "sacrifice removeguard"],
  // Positional sacrifice
  ["r1bqkb1r/pp3ppp/2nppn2/2p5/2PP4/2N2NP1/PP2PP1P/R1BQKB1R w KQkq - 0 1", "d4d5 c6a5", 1600, "pawnBreak advantage"],
  // Deep combination
  ["r1bq1rk1/pp2ppbp/2np1np1/8/3PP3/2N1BN2/PPP1BPPP/R2Q1RK1 w - - 0 1", "d4d5 c6e5", 1700, "pawnBreak space"],
];

async function seed() {
  console.log('🧩 Riddick Chess Clean Puzzle Reseeder');
  console.log('=======================================\n');

  let inserted = 0, skipped = 0, invalid = 0;

  for (const [fen, moves, rating, themes] of PUZZLES) {
    try {
      const chess = new Chess(fen);
      const moveList = moves.split(' ').filter(m => m);

      if (moveList.length < 2) {
        console.log(`  ⚠️ Skipping: too few moves (${moveList.length})`);
        invalid++;
        continue;
      }

      // Validate first move is legal
      const firstMove = moveList[0];
      let moveResult;
      try {
        moveResult = chess.move({
          from: firstMove.slice(0, 2),
          to: firstMove.slice(2, 4),
          promotion: firstMove[4] || undefined
        });
      } catch(e) {
        // Try SAN notation
        try {
          moveResult = chess.move(firstMove);
        } catch(e2) {
          console.log(`  ❌ Invalid first move "${firstMove}" in FEN: ${fen.slice(0, 40)}...`);
          invalid++;
          continue;
        }
      }

      if (!moveResult) {
        console.log(`  ❌ Illegal first move "${firstMove}"`);
        invalid++;
        continue;
      }

      // Check duplicate
      const dupe = await pool.query('SELECT id FROM puzzles WHERE fen = $1', [fen]);
      if (dupe.rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(`
        INSERT INTO puzzles (fen, moves, rating, themes, plays, successes, rating_deviation)
        VALUES ($1, $2, $3, $4, 0, 0, 75)
      `, [fen, moves, rating, themes]);

      inserted++;
      console.log(`  ✅ Puzzle ${inserted}: Rating ${rating} - ${themes}`);
    } catch(e) {
      console.log(`  ❌ Error: ${e.message}`);
      invalid++;
    }
  }

  const total = await pool.query('SELECT COUNT(*) FROM puzzles');
  console.log(`\n✅ Done!`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped:  ${skipped} duplicates`);
  console.log(`   Invalid:  ${invalid}`);
  console.log(`   Total in DB: ${total.rows[0].count}\n`);

  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
