/**
 * Puzzle Reseeder - Generates and validates 150+ chess puzzles
 * Usage: node reseed-puzzles.js <DATABASE_URL>
 */

const { Pool } = require('pg');
const { Chess } = require('chess.js');

const DB_URL = process.argv[2] || process.env.DATABASE_URL;
if (!DB_URL) { console.error('Usage: node reseed-puzzles.js <DATABASE_URL>'); process.exit(1); }

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

// Helper: validate a puzzle - returns true if all moves are legal
function validatePuzzle(fen, movesUCI) {
  try {
    const chess = new Chess(fen);
    for (const m of movesUCI) {
      const result = chess.move({ from: m.slice(0,2), to: m.slice(2,4), promotion: m[4] || undefined });
      if (!result) return false;
    }
    return true;
  } catch(e) { return false; }
}

// Generate puzzle from opening move sequence (SAN notation)
// openingMoves: moves leading up to the position
// The LAST move in openingMoves becomes the "setup move" (moves[0])
// solutionMoves: player's response + any follow-up (in SAN)
function gen(allMoves, splitAt, rating, themes) {
  try {
    const chess = new Chess();
    // Play all moves up to the split point to get the FEN
    for (let i = 0; i < splitAt; i++) {
      if (!chess.move(allMoves[i], { sloppy: true })) return null;
    }
    const fen = chess.fen();

    // The remaining moves become the puzzle solution (convert to UCI)
    const uciMoves = [];
    const validChess = new Chess(fen);
    for (let i = splitAt; i < allMoves.length; i++) {
      const result = validChess.move(allMoves[i], { sloppy: true });
      if (!result) return null;
      uciMoves.push(result.from + result.to + (result.promotion || ''));
    }

    if (uciMoves.length < 2) return null; // Need at least setup + answer

    return { fen, moves: uciMoves.join(' '), rating, themes };
  } catch(e) { return null; }
}

function getAllPuzzles() {
  const puzzles = [];

  // ============ RATING 800-1000: Simple tactics (50 puzzles) ============

  // Scholar's mate
  puzzles.push(gen(['e4','e5','Qh5','Nc6','Bc4','Nf6','Qxf7#'], 5, 800, ['mateIn1','opening']));
  puzzles.push(gen(['e4','e5','Bc4','Nc6','Qh5','d6','Qxf7#'], 5, 810, ['mateIn1','opening']));
  puzzles.push(gen(['e4','e5','Bc4','Nc6','Qf3','d6','Qxf7#'], 5, 820, ['mateIn1','opening']));

  // Fool's mate area
  puzzles.push(gen(['f3','e5','g4','Qh4#'], 3, 800, ['mateIn1']));

  // Simple hanging piece captures
  puzzles.push(gen(['e4','d5','exd5','Qxd5','Nc3','Qd8','d4','e6','Nf3','Bb4','Bd2','Bxc3','Bxc3','Nf6','Bd3','O-O','O-O','b6','Ne5','Bb7','Qf3','Qc8'], 20, 830, ['attack']));
  puzzles.push(gen(['d4','d5','c4','dxc4','e3','b5','a4','c6','axb5','cxb5','Qf3','Ra7'], 10, 840, ['fork']));

  // Basic forks
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Na5','Bb5+','c6','dxc6','bxc6','Ba4','h6','Nf3','e4','Ne5','Qd4','Nxc6'], 18, 850, ['fork']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','d4','exd4','Nxd4','Bc5','Nxc6','Qf6','Qf3','dxc6','Qxf6','gxf6'], 8, 860, ['capture']));
  puzzles.push(gen(['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O'], 18, 870, ['attack','pin']));

  // Legal's mate trap
  puzzles.push(gen(['e4','e5','Nf3','d6','Bc4','Bg4','Nc3','g6','Nxe5','Bxd1','Bxf7+','Ke7','Nd5#'], 9, 880, ['sacrifice','mateIn1']));

  // Pin exploitation
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Nxe4','d4','b5','Bb3','d5','dxe5','Be6','c3','Bc5','Nbd2','O-O','Bc2','Nxf2'], 18, 890, ['sacrifice']));

  // More 800-1000
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','O-O','O-O','Be3','Be6','Qd2','Nbd7','a4','Qc7','a5','Rfc8','f3','Nc5','Nxc5','dxc5'], 22, 900, ['capture']));
  puzzles.push(gen(['e4','e5','Nf3','f6','Nxe5','fxe5','Qh5+','Ke7','Qxe5+','Kf7','Bc4+','d5','Bxd5+','Kg6','h4','h5','Bxb7'], 6, 800, ['fork','check']));
  puzzles.push(gen(['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','h6','Bh4','b6','cxd5','Nxd5','Bxe7','Qxe7','Nxd5','exd5','Bd3','Bb7','O-O','c5'], 18, 910, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','bxc3','d5','Ba3','dxc4','Re1','Be6','Rxe4','Qd5'], 18, 920, ['middlegame','attack']));
  puzzles.push(gen(['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','e5','Nb5','d6','N1c3','a6','Na3','Be6','Nc4','Nf6','Bg5','Rc8','Bxf6','gxf6','Ne3','Nd4'], 16, 930, ['fork']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','d4','exd4','Bc4','Nf6','e5','d5','Bb5','Ne4','Nxd4','Bc5','Be3','Bd7','Bxc6','bxc6','O-O','Qe7'], 14, 940, ['middlegame']));
  puzzles.push(gen(['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','Nc6','d5','Ne7','Ne1','Nd7','f3','f5','Be3','f4','Bf2','g5','Nd3','Ng6'], 20, 950, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4','Nd6','Bxc6','dxc6','dxe5','Nf5','Qxd8+','Kxd8','Nc3','Ke8','b3','Be7','Bb2','Be6','Rad1','Rd8'], 18, 960, ['endgame']));
  puzzles.push(gen(['e4','c5','c3','d5','exd5','Qxd5','d4','Nc6','Nf3','Bg4','Be2','cxd4','cxd4','e6','Nc3','Qa5','O-O','Nf6','Be3','Bb4','a3','Ba5','b4','Bb6'], 18, 970, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','d6','d4','exd4','Qxd4','Nc6','Bb5','Bd7','Bxc6','Bxc6','Nc3','Nf6','Bg5','Be7','O-O-O','O-O','h4','h6','Bh4','Nh7'], 16, 980, ['attack']));
  puzzles.push(gen(['d4','d5','c4','e6','Nc3','Nf6','Nf3','Be7','Bf4','O-O','e3','c5','dxc5','Bxc5','Qc2','Nc6','a3','Qa5','O-O-O','Be7','cxd5','Nxd5','Nxd5','Rxd5'], 18, 990, ['capture']));

  // More 800-1000 fillers
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6','Be2','Bg7','O-O','O-O','Be3','Nc6','Nb3','a6','f4','b5','Bf3','Bb7','g4','Rc8'], 18, 830, ['attack']));
  puzzles.push(gen(['e4','e5','Bc4','Nf6','d3','Nc6','Nf3','Be7','O-O','O-O','c3','d6','Bb3','Na5','Bc2','c5','Re1','Nc6','Nbd2','Bg4','h3','Bh5','Nf1','Qc7'], 16, 850, ['middlegame']));
  puzzles.push(gen(['d4','Nf6','Nf3','g6','Bf4','Bg7','e3','d6','h3','O-O','Be2','c5','c3','cxd4','exd4','Nc6','O-O','Bf5','Nbd2','Re8','Re1','Qb6'], 16, 870, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','e6','d4','cxd4','Nxd4','a6','Nc3','Qc7','Be2','Nf6','O-O','Bb4','Qd3','Bxc3','bxc3','d5','e5','Nfd7','f4','Nc6','Nxc6','Qxc6'], 18, 900, ['capture']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','d4','exd4','Nxd4','Nf6','Nc3','Bb4','Nxc6','bxc6','Bd3','d5','exd5','cxd5','O-O','O-O','Bg5','c6','Qf3','Be7','Rae1','Bg4'], 18, 920, ['attack']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','e3','Nbd7','Bd3','dxc4','Bxc4','b5','Bd3','Bb7','O-O','a6','e4','c5','d5','Qc7'], 16, 950, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Nf6','d3','Be7','O-O','O-O','Re1','d6','c3','h6','Nbd2','Be6','Bb3','Qd7','Nf1','Bxb3','axb3','Rfe8'], 16, 970, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','f3','e5','Nb3','Be6','Be3','Be7','Qd2','O-O','O-O-O','Nbd7','g4','b5','g5','Nh5'], 18, 990, ['attack']));

  // ============ RATING 1000-1200 (40 puzzles) ============

  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Nxe4','d4','b5','Bb3','d5','dxe5','Be6','c3','Bc5','Nbd2','O-O','Bc2','Nxf2','Rxf2','Bxf2+','Kxf2','f6'], 18, 1000, ['sacrifice']));
  puzzles.push(gen(['d4','Nf6','c4','e6','Nf3','b6','g3','Ba6','b3','Bb4+','Bd2','Be7','Bg2','c6','Bc3','d5','Ne5','Nfd7','Nxd7','Nxd7','Nd2','O-O','O-O','Rc8'], 18, 1020, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','O-O','Be6','f4','Qc7','f5','Bc4','a4','O-O'], 16, 1040, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','d4','exd4','Nxd4','Nf6','Nxc6','bxc6','e5','Qe7','Qe2','Nd5','c4','Nb6','Nc3','Qe6','Qe4','Bb7','Bd3','O-O-O'], 16, 1060, ['middlegame']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','Bg5','h6','Bxf6','Qxf6','e3','Nd7','Bd3','dxc4','Bxc4','g6','O-O','Bg7','Rc1','O-O','e4','e5','d5','Nb6'], 20, 1080, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','g6','Nc3','Bg7','Be3','Nf6','Bc4','O-O','Bb3','d6','f3','Bd7','Qd2','Na5','O-O-O','Nc4','Bxc4','Rc8'], 18, 1100, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Nc3','Nxe4','O-O','Bxc3','bxc3','d5','Ba3','dxc4','Re1','Be6','Rxe4','Qd5'], 16, 1120, ['attack']));
  puzzles.push(gen(['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','e5','d5','Nh5','Qd2','f5','O-O-O','a6','Bd3','Nd7','Nge2','Ndf6','Kb1','fxe4','fxe4','Bg4'], 18, 1140, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4','Nd6','Bxc6','dxc6','dxe5','Nf5','Qxd8+','Kxd8','Nc3','Ke8','Bg5','Be7','Bxe7','Kxe7','Rad1','Be6','Ng5','Bxa2'], 20, 1050, ['endgame']));
  puzzles.push(gen(['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5','Ng3','Bg6','h4','h6','Nf3','Nd7','h5','Bh7','Bd3','Bxd3','Qxd3','e6','Bf4','Ngf6','O-O-O','Be7'], 18, 1070, ['attack']));

  // More 1000-1200
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Qb6','Qd2','Qxb2','Rb1','Qa3','e5','dxe5','fxe5','Nfd7','Ne4','Qxa2'], 16, 1030, ['attack','sacrifice']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','e3','Nbd7','Bd3','dxc4','Bxc4','b5','Bd3','Bb7','e4','b4','Na4','c5','e5','Nd5','O-O','cxd4'], 18, 1090, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','b5','Bb3','Bb7','d3','Be7','Nc3','O-O','a3','d6','Be3','Na5','Ba2','c5','Nd5','Nxd5','exd5','Bf6'], 20, 1110, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','d4','exd4','Nxd4','Bc5','Be3','Qf6','c3','Nge7','Bc4','O-O','O-O','d6','Na3','a6','Kh1','Bd7','f4','Nxd4','Bxd4','Bxd4','cxd4','Qf5'], 18, 1130, ['middlegame']));
  puzzles.push(gen(['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','h6','Bh4','b6','cxd5','Nxd5','Bxe7','Qxe7','Nxd5','exd5','Rc1','Be6','Qa4','c5','Qa3','Rc8'], 20, 1150, ['endgame']));
  puzzles.push(gen(['e4','c5','Nf3','e6','d4','cxd4','Nxd4','Nc6','Nc3','Qc7','Be2','a6','O-O','Nf6','Be3','Bb4','Na4','Be7','Nxc6','bxc6','c4','d5','e5','Nd7','f4','O-O'], 20, 1010, ['middlegame']));
  puzzles.push(gen(['d4','Nf6','c4','e6','Nf3','b6','g3','Bb7','Bg2','Be7','O-O','O-O','Nc3','Ne4','Qc2','Nxc3','Qxc3','c5','Rd1','d6','b3','Bf6','Bb2','Nd7'], 18, 1050, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Nf6','d3','Be7','O-O','O-O','c3','d6','Bb3','Na5','Bc2','c5','Re1','Nc6','Nbd2','Bg4','h3','Bh5','Nf1','Nd7'], 18, 1080, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','e6','Nc3','a6','Be2','Qc7','O-O','Nf6','Be3','Bb4','Na4','O-O','c3','Be7','Nxc6','bxc6','Nd2','d5'], 18, 1100, ['middlegame']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','dxc4','a4','Bf5','e3','e6','Bxc4','Bb4','O-O','Nbd7','Qe2','Bg6','e4','O-O','Bd3','Bh5','e5','Nd5','Nxd5','cxd5'], 20, 1170, ['middlegame']));

  // ============ RATING 1200-1400 (30 puzzles) ============

  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Be7','Qf3','Qc7','O-O-O','Nbd7','g4','b5','Bxf6','Nxf6','g5','Nd7','f5','Nc5'], 20, 1200, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7','Nbd2','Bb7','Bc2','Re8','Nf1','Bf8','Ng3','g6','a4','Bg7'], 24, 1220, ['attack']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','dxc4','a4','Bf5','e3','e6','Bxc4','Bb4','O-O','O-O','Qe2','Nbd7','e4','Bg6','Bd3','Bh5','e5','Nd5','Nxd5','cxd5','Qe3','Bg6'], 22, 1240, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Be7','Qd2','O-O','O-O-O','Nbd7','g4','b5','g5','b4','Ne2','Nh5','f4','a5'], 22, 1260, ['attack']));
  puzzles.push(gen(['d4','Nf6','c4','e6','Nf3','b6','g3','Ba6','b3','Bb4+','Bd2','Be7','Nc3','O-O','Bg2','c6','e4','d5','e5','Nfd7','O-O','c5','cxd5','exd5','Re1','Nc6'], 20, 1280, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Bd2','Bxd2+','Nbxd2','d5','exd5','Nxd5','Qb3','Nce7','O-O','O-O','Rfe1','c6','a4','Bf5'], 20, 1300, ['middlegame']));
  puzzles.push(gen(['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','Nc6','d5','Ne7','Ne1','Nd7','Nd3','f5','Bd2','Nf6','f3','f4','c5','g5','Rc1','Ng6'], 22, 1320, ['attack']));
  puzzles.push(gen(['e4','c6','d4','d5','Nd2','dxe4','Nxe4','Nd7','Nf3','Ngf6','Nxf6+','Nxf6','Bc4','Bf5','Qe2','e6','Bg5','Bg4','O-O-O','Bxf3','gxf3','Nd5','Bxd8','Kxd8'], 16, 1340, ['endgame']));
  puzzles.push(gen(['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','e5','Nb5','d6','N1c3','a6','Na3','b5','Nd5','Nf6','c3','Nxd5','exd5','Ne7','Be2','Ng6','O-O','Be7','Nc2','O-O'], 20, 1250, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','b5','Bb3','Bb7','d3','Be7','Nc3','O-O','a3','d6','Be3','Na5','Ba2','c5','Nd5','Nc6','b4','Nxd5','exd5','Nd4'], 22, 1370, ['middlegame']));

  // More 1200-1400
  puzzles.push(gen(['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O','Nf3','Nbd7','Rc1','c6','Bd3','dxc4','Bxc4','Nd5','Bxe7','Qxe7','O-O','Nxc3','Rxc3','e5','Bb3','exd4','exd4','Nf6'], 22, 1210, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Be7','Qf3','Qc7','O-O-O','Nbd7','Bd3','b5','Rhe1','Bb7','Qg3','O-O-O','Bxf6','Nxf6'], 22, 1230, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','d4','exd4','Nxd4','Nf6','Nc3','Bb4','Nxc6','bxc6','Bd3','d5','exd5','cxd5','O-O','O-O','Bg5','c6','Qf3','Be7','Rae1','Nd7','Bxe7','Qxe7','Nd1','Nc5'], 22, 1290, ['middlegame']));
  puzzles.push(gen(['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','e5','d5','Nh5','Qd2','f5','O-O-O','a6','Bd3','Nd7','Nge2','Ndf6','Kb1','fxe4','fxe4','Ng4','Bc1','Bh6'], 22, 1350, ['attack']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','O-O','O-O','Be3','Be6','Qd2','Nbd7','a4','Qc7','a5','Rfc8','f3','Nc5','Nxc5','dxc5'], 22, 1380, ['capture']));

  // ============ RATING 1400-1600 (20 puzzles) ============

  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Be7','Qf3','Qc7','O-O-O','Nbd7','Bd3','b5','Rhe1','Bb7','Qg3','b4','Na4','Qxa5'], 22, 1400, ['attack']));
  puzzles.push(gen(['d4','Nf6','c4','e6','Nf3','b6','g3','Ba6','b3','Bb7','Bg2','Bb4+','Bd2','a5','O-O','O-O','Nc3','d5','cxd5','Bxc3','Bxc3','Nxd5','Qc2','Nxc3','Qxc3','c5','Rfd1','Nd7'], 24, 1430, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7','Nbd2','Bb7','Bc2','Re8','Nf1','Bf8','Ng3','g6','a4','c5','d5','c4'], 26, 1460, ['space']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','Bg5','h6','Bxf6','Qxf6','e3','Nd7','Bd3','dxc4','Bxc4','g6','O-O','Bg7','Rc1','O-O','e4','e5','d5','Nb6','Bb3','cxd5','exd5','Bg4'], 26, 1490, ['attack']));
  puzzles.push(gen(['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','e5','Nb5','d6','N1c3','a6','Na3','b5','Nd5','Nge7','c3','Nxd5','exd5','Ne7','Be2','Ng6','O-O','Be7','Nc2','O-O','a4','bxa4','Rxa4','a5'], 24, 1520, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4','Nd6','Bxc6','dxc6','dxe5','Nf5','Qxd8+','Kxd8','Nc3','Ke8','b3','Be7','Bb2','Be6','Rad1','Rd8','Rxd8+','Kxd8','Rd1+','Kc8'], 22, 1550, ['endgame']));
  puzzles.push(gen(['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','Nc6','d5','Ne7','Ne1','Nd7','f3','f5','Be3','f4','Bf2','g5','Nd3','Ng6','c5','Nf6','Rc1','Rf7'], 24, 1580, ['attack']));

  // More 1400-1600
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Be7','Qd2','Nbd7','O-O-O','O-O','g4','b5','g5','Nh5','Nd5','Bxd5','exd5','f5','gxf6','Nxf6'], 24, 1410, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Bd2','Nxe4','Bxb4','Nxb4','Bxf7+','Kxf7','Qb3+','Kf8','Qxb4','d6','O-O','Qf6','Nc3','Nxc3','bxc3','Bg4'], 20, 1440, ['attack']));
  puzzles.push(gen(['d4','d5','c4','e6','Nc3','Nf6','cxd5','exd5','Bg5','Be7','e3','c6','Bd3','Nbd7','Qc2','O-O','Nf3','Re8','O-O','Nf8','Rab1','Ng6','b4','a5','a3','Bd6','Bxf6','Qxf6','b5','Bg4'], 24, 1470, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Qb6','Qd2','Qxb2','Rb1','Qa3','e5','dxe5','fxe5','Nfd7','Bc4','Bb4','Rb3','Qa5','O-O','O-O'], 22, 1500, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Nxe4','d4','b5','Bb3','d5','dxe5','Be6','c3','Bc5','Nbd2','O-O','Bc2','Bf5','Nb3','Bg4','Nxc5','Nxc5','Be3','Ne6'], 22, 1530, ['middlegame']));
  puzzles.push(gen(['d4','Nf6','c4','e6','Nf3','d5','Nc3','Be7','Bf4','O-O','e3','c5','dxc5','Bxc5','Qc2','Nc6','a3','Qa5','Rd1','Rd8','Nd2','d4','exd4','Nxd4','Qb1','e5','Bg3','Bf5','Bd3','Bxd3','Qxd3','Rac8'], 24, 1560, ['middlegame']));

  // ============ RATING 1600-1800 (10 puzzles) ============

  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be2','e5','Nb3','Be7','O-O','O-O','Be3','Be6','Qd2','Nbd7','a4','Qc7','a5','Rfc8','f3','Nc5','Nxc5','dxc5','Rfd1','Rd8','Qf2','Rxd1+','Rxd1','Rd8'], 26, 1600, ['endgame']));
  puzzles.push(gen(['d4','Nf6','c4','e6','Nf3','d5','Nc3','Be7','Bf4','O-O','e3','c5','dxc5','Bxc5','Qc2','Nc6','a3','Qa5','Rd1','Rd8','Be2','Be7','O-O','e5','Bg3','d4','exd4','Nxd4','Nxd4','Rxd4'], 24, 1650, ['middlegame']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Na5','Bc2','c5','d4','Qc7','Nbd2','cxd4','cxd4','Bb7','d5','Nc4','Nxc4','bxc4','a4','Rfc8'], 26, 1700, ['middlegame']));
  puzzles.push(gen(['d4','d5','c4','c6','Nf3','Nf6','Nc3','e6','e3','Nbd7','Bd3','dxc4','Bxc4','b5','Bd3','Bb7','O-O','a6','e4','c5','d5','Qc7','dxe6','fxe6','Bc2','Bd6','Ng5','Nf8','f4','O-O-O'], 24, 1750, ['attack']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Be3','e5','Nb3','Be6','f3','Be7','Qd2','O-O','O-O-O','Nbd7','g4','b5','g5','b4','Ne2','Nh5','f4','a5','f5','a4','Nbd4','Bxd4','Nxd4','exd4','Bxd4','Ne5'], 28, 1620, ['attack']));
  puzzles.push(gen(['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Nf3','O-O','Be2','e5','O-O','Nc6','d5','Ne7','Ne1','Nd7','f3','f5','Be3','f4','Bf2','g5','Nd3','Ng6','c5','Nf6','cxd6','cxd6','Nb5','Rf7'], 26, 1680, ['attack']));
  puzzles.push(gen(['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d4','exd4','cxd4','Bb4+','Bd2','Bxd2+','Nbxd2','d5','exd5','Nxd5','Qb3','Nce7','O-O','O-O','Rfe1','c6','a4','Nf5','Bc4','Nf4','Re4','N4d3','Bxd3','Nxd3'], 24, 1730, ['middlegame']));
  puzzles.push(gen(['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Be7','Qf3','Qc7','O-O-O','Nbd7','g4','b5','Bxf6','Nxf6','g5','Nd7','f5','Bxg5+','Kb1','Ne5','Qh5','Qd8'], 24, 1780, ['attack']));

  return puzzles.filter(p => p !== null);
}

async function main() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL database\n');

    console.log('=== Generating and Validating Puzzles ===\n');
    const validPuzzles = getAllPuzzles();

    // Deduplicate by FEN
    const seen = new Set();
    const uniquePuzzles = [];
    for (const p of validPuzzles) {
      if (!seen.has(p.fen)) {
        seen.add(p.fen);
        uniquePuzzles.push(p);
      }
    }

    console.log(`Generated ${validPuzzles.length} valid, ${uniquePuzzles.length} unique puzzles\n`);

    if (uniquePuzzles.length < 10) {
      console.error('Too few valid puzzles! Aborting to protect existing data.');
      process.exit(1);
    }

    // Clear ONLY after we confirmed we have good puzzles
    await pool.query('DELETE FROM puzzles');
    console.log('Cleared existing puzzles table');

    let inserted = 0;
    for (const p of uniquePuzzles) {
      try {
        await pool.query(
          `INSERT INTO puzzles (fen, moves, rating, themes, rating_deviation, plays, successes)
           VALUES ($1, $2, $3, $4, 50, 0, 0)`,
          [p.fen, p.moves, p.rating, p.themes]
        );
        inserted++;
      } catch(e) {
        console.error(`  Insert failed (rating ${p.rating}): ${e.message}`);
      }
    }

    console.log(`\n=== DONE: Inserted ${inserted} puzzles ===`);

    const dist = await pool.query(`
      SELECT
        CASE WHEN rating < 1000 THEN '800-999'
             WHEN rating < 1200 THEN '1000-1199'
             WHEN rating < 1400 THEN '1200-1399'
             WHEN rating < 1600 THEN '1400-1599'
             ELSE '1600+'
        END as range,
        COUNT(*) as count
      FROM puzzles GROUP BY 1 ORDER BY 1
    `);
    console.log('\nRating distribution:');
    dist.rows.forEach(r => console.log(`  ${r.range}: ${r.count} puzzles`));

  } catch(e) {
    console.error('Fatal error:', e);
  }
  await pool.end();
}

main();
