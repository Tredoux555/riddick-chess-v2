// Seed script for sample puzzles
// Run: node utils/seedPuzzles.js

const pool = require('./db');

const samplePuzzles = [
  // Mate in 1 puzzles (rating ~800-1000)
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', moves: 'h5f7', rating: 800, themes: ['mate', 'mateIn1', 'short'], plays: 1000, successes: 850 },
  { fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', moves: 'e1e8', rating: 850, themes: ['mate', 'mateIn1', 'backRankMate'], plays: 900, successes: 720 },
  { fen: 'r1b1kb1r/pppp1ppp/2n2n2/4N2Q/2B1P3/8/PPPP1PPP/RNB1K2R w KQkq - 4 4', moves: 'h5f7', rating: 900, themes: ['mate', 'mateIn1', 'short'], plays: 800, successes: 600 },
  
  // Fork puzzles (rating ~1000-1200)
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3', moves: 'f3g5 d8g5 c4f7', rating: 1000, themes: ['fork', 'middlegame'], plays: 500, successes: 350 },
  { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5', moves: 'c4f7 e8f7 f3g5', rating: 1100, themes: ['fork', 'sacrifice'], plays: 600, successes: 400 },
  { fen: 'r1bqkbnr/pppp1ppp/8/4N3/2BnP3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5', moves: 'e5f7 e8f7 c4d5', rating: 1150, themes: ['fork', 'sacrifice', 'middlegame'], plays: 450, successes: 280 },
  
  // Pin puzzles (rating ~1100-1300)
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', moves: 'b5c6 d7c6', rating: 1100, themes: ['pin', 'advantage'], plays: 700, successes: 490 },
  { fen: 'r2qkb1r/ppp2ppp/2np1n2/1B2p1B1/4P3/2N2N2/PPPP1PPP/R2QK2R w KQkq - 4 6', moves: 'g5f6 d8f6 b5c6', rating: 1200, themes: ['pin', 'deflection'], plays: 550, successes: 330 },
  { fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4', moves: 'f3g5 O-O c4f7', rating: 1250, themes: ['pin', 'attack'], plays: 480, successes: 270 },
  
  // Discovered attack (rating ~1200-1400)
  { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 4', moves: 'f3e5 c6e5 d2d4', rating: 1200, themes: ['discoveredAttack', 'middlegame'], plays: 650, successes: 390 },
  { fen: 'r1b1kb1r/pppp1ppp/2n2n2/4N2q/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 5', moves: 'e5f7 h5e2 f7h8', rating: 1300, themes: ['discoveredAttack', 'sacrifice'], plays: 500, successes: 275 },
  
  // Mate in 2 puzzles (rating ~1300-1500)
  { fen: '6k1/5ppp/8/8/8/2B5/5PPP/4R1K1 w - - 0 1', moves: 'c3g7 h8g7 e1e8', rating: 1300, themes: ['mate', 'mateIn2', 'backRankMate'], plays: 600, successes: 300 },
  { fen: 'r1bqk2r/pppp1Bpp/2n2n2/2b1p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4', moves: 'e8f7 d1d8 c6d8 f1c4', rating: 1400, themes: ['mate', 'mateIn2', 'smotheredMate'], plays: 400, successes: 180 },
  { fen: '2r3k1/5ppp/8/8/8/2B5/5PPP/R5K1 w - - 0 1', moves: 'a1a8 c8a8 c3g7', rating: 1350, themes: ['mate', 'mateIn2', 'sacrifice'], plays: 520, successes: 260 },
  
  // Complex tactics (rating ~1400-1600)
  { fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7', moves: 'c4f7 f8f7 f3g5 f7f8 g5e6', rating: 1400, themes: ['sacrifice', 'attack', 'advantage'], plays: 350, successes: 150 },
  { fen: 'r2qkb1r/ppp2ppp/2n1bn2/3Np3/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 6', moves: 'd5f6 g7f6 c4e6 f7e6 d1h5', rating: 1500, themes: ['sacrifice', 'deflection', 'advantage'], plays: 300, successes: 120 },
  { fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4', moves: 'e1g1 b4c3 d2c3 f6e4 d1d5', rating: 1550, themes: ['sacrifice', 'opening', 'development'], plays: 280, successes: 100 },
  
  // Endgame puzzles (rating ~1500-1700)
  { fen: '8/8/8/3k4/8/8/3K1P2/8 w - - 0 1', moves: 'f2f4 d5e4 d2e2 e4f4 e2f2', rating: 1500, themes: ['endgame', 'pawnEndgame', 'opposition'], plays: 400, successes: 200 },
  { fen: '8/8/8/8/3k4/8/3KP3/8 w - - 0 1', moves: 'e2e4 d4e4 d2e2 e4f4 e2f2', rating: 1600, themes: ['endgame', 'pawnEndgame', 'zugzwang'], plays: 350, successes: 160 },
  { fen: '8/5k2/8/8/8/3K4/4P3/8 w - - 0 1', moves: 'd3e4 f7e6 e4f4 e6e7 f4f5', rating: 1650, themes: ['endgame', 'pawnEndgame', 'keySquares'], plays: 320, successes: 140 },
  
  // Advanced tactics (rating ~1600-1800)
  { fen: 'r2qk2r/ppp1bppp/2n1bn2/3pp3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 6', moves: 'f3e5 c6e5 c4e6 f7e6 d1h5', rating: 1700, themes: ['sacrifice', 'attack', 'kingAttack'], plays: 250, successes: 90 },
  { fen: 'r1bqr1k1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 6 9', moves: 'c4f7 f8f7 f3g5 f7g8 g5e6', rating: 1750, themes: ['sacrifice', 'zwischenzug', 'advantage'], plays: 220, successes: 70 },
  { fen: 'r2q1rk1/ppp1bppp/2n1bn2/3pp3/2B1P3/2N2N2/PPPP1PPP/R1BQ1RK1 w - - 6 8', moves: 'e4d5 e6d5 c4d5 d8d5 c3d5 f6d5', rating: 1800, themes: ['exchange', 'simplification', 'advantage'], plays: 200, successes: 60 },
];

async function seedPuzzles() {
  console.log('Seeding puzzles...');
  
  try {
    // Check if puzzles already exist
    const existing = await pool.query('SELECT COUNT(*) FROM puzzles');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Puzzles already exist. Skipping seed.');
      return;
    }

    for (const puzzle of samplePuzzles) {
      await pool.query(`
        INSERT INTO puzzles (fen, moves, rating, rating_deviation, themes, plays, successes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        puzzle.fen,
        puzzle.moves,
        puzzle.rating,
        100, // default RD
        puzzle.themes,
        puzzle.plays,
        puzzle.successes
      ]);
    }

    console.log(`Seeded ${samplePuzzles.length} puzzles successfully!`);
  } catch (error) {
    console.error('Failed to seed puzzles:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedPuzzles();
}

module.exports = { seedPuzzles, samplePuzzles };
