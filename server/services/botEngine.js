const { Chess } = require('chess.js');

class BotEngine {
  constructor() {
    this.pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    this.positionBonus = {
      p: [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]],
      n: [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]],
      b: [[-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]],
      r: [[0,0,0,0,0,0,0,0],[5,10,10,10,10,10,10,5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[0,0,0,5,5,0,0,0]],
      q: [[-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],[0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]],
      k: [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
    };
  }

  evaluateBoard(chess) {
    if (chess.isCheckmate()) return chess.turn() === 'w' ? -99999 : 99999;
    if (chess.isDraw()) return 0;
    let score = 0;
    const board = chess.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          let value = this.pieceValues[piece.type];
          const posTable = this.positionBonus[piece.type];
          if (posTable) {
            const posRow = piece.color === 'w' ? row : 7 - row;
            value += posTable[posRow][col];
          }
          score += piece.color === 'w' ? value : -value;
        }
      }
    }
    return score;
  }

  minimax(chess, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || chess.isGameOver()) return this.evaluateBoard(chess);
    const moves = chess.moves();
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const eval_ = this.minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const eval_ = this.minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  getBestMove(fen, skillLevel, depth = 3) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;
    if (skillLevel <= 2 && Math.random() < 0.7) return moves[Math.floor(Math.random() * moves.length)].lan;
    if (skillLevel <= 5 && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)].lan;
    const actualDepth = Math.min(Math.max(1, Math.floor(skillLevel / 4)), depth);
    const isMaximizing = chess.turn() === 'w';
    let bestMove = moves[0];
    let bestValue = isMaximizing ? -Infinity : Infinity;
    const randomFactor = Math.max(0, (10 - skillLevel) * 50);
    for (const move of moves) {
      chess.move(move);
      let value = this.minimax(chess, actualDepth - 1, -Infinity, Infinity, !isMaximizing);
      value += (Math.random() - 0.5) * randomFactor;
      chess.undo();
      if (isMaximizing) { if (value > bestValue) { bestValue = value; bestMove = move; } }
      else { if (value < bestValue) { bestValue = value; bestMove = move; } }
    }
    return bestMove.lan;
  }

  analyzePosition(fen, depth = 4) {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return { evaluation: 0, bestMove: null };
    const isMaximizing = chess.turn() === 'w';
    let bestMove = moves[0];
    let bestValue = isMaximizing ? -Infinity : Infinity;
    for (const move of moves) {
      chess.move(move);
      const value = this.minimax(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
      chess.undo();
      if (isMaximizing) { if (value > bestValue) { bestValue = value; bestMove = move; } }
      else { if (value < bestValue) { bestValue = value; bestMove = move; } }
    }
    return { evaluation: Math.max(-99, Math.min(99, bestValue / 100)), bestMove: bestMove.lan };
  }

  async analyzeGame(pgn) {
    const chess = new Chess();
    chess.loadPgn(pgn);
    const history = chess.history({ verbose: true });
    chess.reset();
    const analysis = { moves: [], whiteAccuracy: 0, blackAccuracy: 0, summary: { white: { brilliant: 0, best: 0, great: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, black: { brilliant: 0, best: 0, great: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 } } };
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const isWhite = i % 2 === 0;
      const beforeAnalysis = this.analyzePosition(chess.fen(), 4);
      const evalBefore = isWhite ? beforeAnalysis.evaluation : -beforeAnalysis.evaluation;
      chess.move(move.san);
      const afterAnalysis = this.analyzePosition(chess.fen(), 4);
      const evalAfter = isWhite ? -afterAnalysis.evaluation : afterAnalysis.evaluation;
      const evalChange = evalAfter - evalBefore;
      const classification = this.classifyMove(evalChange, beforeAnalysis.bestMove, move.lan, move);
      analysis.moves.push({ moveNumber: Math.floor(i / 2) + 1, color: isWhite ? 'white' : 'black', move: move.san, moveLan: move.lan, bestMove: beforeAnalysis.bestMove, evalBefore: evalBefore.toFixed(2), evalAfter: evalAfter.toFixed(2), evalChange: evalChange.toFixed(2), classification });
      analysis.summary[isWhite ? 'white' : 'black'][classification]++;
    }
    analysis.whiteAccuracy = this.calculateAccuracy(analysis.moves.filter(m => m.color === 'white'));
    analysis.blackAccuracy = this.calculateAccuracy(analysis.moves.filter(m => m.color === 'black'));
    return analysis;
  }

  classifyMove(evalChange, bestMove, playedMove, move) {
    // Check for checkmate - it's best, not brilliant
    if (move && move.san && move.san.includes('#')) return 'best';
    
    if (bestMove === playedMove || evalChange >= 0.1) {
      // Brilliant should be very rare - only for huge unexpected improvements
      if (evalChange >= 2.0) return 'brilliant';
      if (evalChange >= 0.5) return 'best';
      if (evalChange >= 0.2) return 'great';
      return 'good';
    }
    if (evalChange > -0.3) return 'good';
    if (evalChange > -0.7) return 'inaccuracy';
    if (evalChange > -1.5) return 'mistake';
    return 'blunder';
  }

  calculateAccuracy(moves) {
    if (moves.length === 0) return 100;
    let totalScore = 0;
    for (const move of moves) {
      const evalChange = parseFloat(move.evalChange);
      totalScore += Math.max(0, Math.min(100, 100 + (evalChange * 20)));
    }
    return (totalScore / moves.length).toFixed(1);
  }
}

const botEngine = new BotEngine();
module.exports = { botEngine, BotEngine };
