const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');
const stockfishAnalysis = require('../services/stockfishAnalysis');

router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { gameId, gameType = 'pvp', pgn } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Must be logged in' });
    
    let gamePgn = pgn;
    if (gameId && !pgn) {
      const table = gameType === 'bot' ? 'bot_games' : 'games';
      const result = await pool.query(`SELECT pgn, moves FROM ${table} WHERE id = $1`, [gameId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Game not found' });
      
      // If no PGN but has moves, reconstruct PGN from moves array
      if (!result.rows[0].pgn && result.rows[0].moves && result.rows[0].moves.length > 0) {
        const { Chess } = require('chess.js');
        const chess = new Chess();
        for (const m of result.rows[0].moves) {
          chess.move(m, { sloppy: true });
        }
        gamePgn = chess.pgn();
      } else {
        gamePgn = result.rows[0].pgn;
      }
      
      if (!gamePgn || gamePgn.trim() === '') {
        return res.status(400).json({ error: 'No moves to analyze - play some moves first!' });
      }
    }
    
    if (!gamePgn) return res.status(400).json({ error: 'PGN required' });

    // Check for existing completed analysis
    const existingAnalysis = await pool.query(
      `SELECT * FROM game_analyses WHERE user_id = $1 AND pgn = $2 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      [userId, gamePgn]
    );
    if (existingAnalysis.rows.length > 0) {
      return res.json({ analysisId: existingAnalysis.rows[0].id, status: 'completed', cached: true });
    }
    
    // Create new analysis record
    const analysisResult = await pool.query(
      `INSERT INTO game_analyses (game_id, game_type, user_id, pgn, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [gameId, gameType, userId, gamePgn]
    );
    const analysisId = analysisResult.rows[0].id;
    
    // Process analysis in background — errors are caught and persisted to DB
    processAnalysis(analysisId, gamePgn, pool).catch(async (err) => {
      console.error(`Analysis ${analysisId} background error:`, err);
      try {
        await pool.query(`UPDATE game_analyses SET status = 'failed' WHERE id = $1`, [analysisId]);
      } catch (dbErr) {
        console.error(`Failed to mark analysis ${analysisId} as failed:`, dbErr);
      }
    });
    
    res.json({ analysisId, status: 'pending', message: 'Analysis started!' });
  } catch (err) {
    console.error('Error requesting analysis:', err);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

async function processAnalysis(analysisId, pgn, pool) {
  try {
    console.log(`Starting analysis ${analysisId}...`);
    await pool.query(`UPDATE game_analyses SET status = 'analyzing' WHERE id = $1`, [analysisId]);
    
    const analysis = await stockfishAnalysis.analyzeGame(pgn);
    console.log(`Analysis ${analysisId} computed, ${analysis.moves.length} moves`);
    
    for (const move of analysis.moves) {
      await pool.query(
        `INSERT INTO move_evaluations (analysis_id, move_number, color, move_played, best_move, eval_before, eval_after, eval_change, classification) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [analysisId, move.moveNumber, move.color, move.move, move.bestMove, move.evalBefore, move.evalAfter, move.evalChange, move.classification]
      );
    }
    
    await pool.query(
      `UPDATE game_analyses SET status = 'completed', white_accuracy = $2, black_accuracy = $3, analysis_data = $4, completed_at = NOW() WHERE id = $1`,
      [analysisId, analysis.whiteAccuracy, analysis.blackAccuracy, JSON.stringify(analysis)]
    );
    console.log(`Analysis ${analysisId} completed!`);
  } catch (err) {
    console.error(`Analysis ${analysisId} failed:`, err);
    await pool.query(`UPDATE game_analyses SET status = 'failed' WHERE id = $1`, [analysisId]);
  }
}

router.get('/:analysisId', authenticateToken, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user?.id;
    const result = await pool.query(`SELECT * FROM game_analyses WHERE id = $1 AND user_id = $2`, [analysisId, userId]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Analysis not found' });
    
    const analysis = result.rows[0];
    
    if (analysis.status !== 'completed') {
      return res.json({ 
        analysisId: analysis.id, 
        status: analysis.status, 
        message: analysis.status === 'analyzing' ? 'Analysis in progress...' : 
                 analysis.status === 'failed' ? 'Analysis failed. Please try again.' : 
                 'Analysis pending...' 
      });
    }
    
    const movesResult = await pool.query(
      `SELECT * FROM move_evaluations WHERE analysis_id = $1 ORDER BY move_number, CASE WHEN color = 'white' THEN 0 ELSE 1 END`,
      [analysisId]
    );
    
    res.json({ 
      analysisId: analysis.id, 
      status: 'completed', 
      whiteAccuracy: analysis.white_accuracy, 
      blackAccuracy: analysis.black_accuracy, 
      summary: analysis.analysis_data?.summary, 
      moves: movesResult.rows, 
      completedAt: analysis.completed_at 
    });
  } catch (err) {
    console.error('Error fetching analysis:', err);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

router.post('/position', authenticateToken, async (req, res) => {
  try {
    const { fen } = req.body;
    if (!fen) return res.status(400).json({ error: 'FEN required' });
    const result = await stockfishAnalysis.evaluatePosition(fen, 15);
    res.json({ fen, evaluation: result.score, bestMove: result.bestMove, pv: result.pv });
  } catch (err) {
    console.error('Error analyzing position:', err);
    res.status(500).json({ error: 'Failed to analyze position' });
  }
});

router.get('/history/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;
    if (!userId) return res.status(401).json({ error: 'Must be logged in' });
    const result = await pool.query(
      `SELECT id, game_type, white_accuracy, black_accuracy, status, created_at, completed_at FROM game_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
