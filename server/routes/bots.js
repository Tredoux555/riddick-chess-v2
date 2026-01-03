const pool = require('../utils/db');
const express = require('express');
const router = express.Router();
const { Chess } = require('chess.js');
const { botEngine } = require('../services/botEngine');

router.get('/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, elo, emoji, description, personality FROM bots ORDER BY elo ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bots:', err);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

router.post('/start', async (req, res) => {
  try {
    let { botId, userColor = 'white' } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Must be logged in to play bots' });
    if (userColor === 'random') userColor = Math.random() < 0.5 ? 'white' : 'black';
    const botResult = await pool.query('SELECT * FROM bots WHERE id = $1', [botId]);
    if (botResult.rows.length === 0) return res.status(404).json({ error: 'Bot not found' });
    const bot = botResult.rows[0];
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const gameResult = await pool.query(
      `INSERT INTO bot_games (user_id, bot_id, fen, user_color, moves, status) VALUES ($1, $2, $3, $4, $5, 'ongoing') RETURNING *`,
      [userId, botId, startingFen, userColor, []]
    );
    const game = gameResult.rows[0];
    let botMove = null;
    let currentFen = startingFen;
    if (userColor === 'black') {
      await new Promise(resolve => setTimeout(resolve, bot.think_time));
      botMove = botEngine.getBestMove(startingFen, bot.skill_level, bot.depth);
      const chess = new Chess();
      chess.move(botMove, { sloppy: true });
      currentFen = chess.fen();
      await pool.query(`UPDATE bot_games SET fen = $1, moves = array_append(moves, $2), updated_at = NOW() WHERE id = $3`, [currentFen, botMove, game.id]);
    }
    res.json({ gameId: game.id, bot: { id: bot.id, name: bot.name, elo: bot.elo, emoji: bot.emoji }, fen: currentFen, userColor, botMove, moves: botMove ? [botMove] : [] });
  } catch (err) {
    console.error('Error starting bot game:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

router.post('/move', async (req, res) => {
  try {
    const { gameId, move } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Must be logged in' });
    const gameResult = await pool.query(
      `SELECT bg.*, b.skill_level, b.depth, b.think_time, b.name as bot_name FROM bot_games bg JOIN bots b ON bg.bot_id = b.id WHERE bg.id = $1 AND bg.user_id = $2 AND bg.status = 'ongoing'`,
      [gameId, userId]
    );
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found or already finished' });
    const game = gameResult.rows[0];
    const chess = new Chess(game.fen);
    const userMove = chess.move(move, { sloppy: true });
    if (!userMove) return res.status(400).json({ error: 'Invalid move' });
    let result = null, botMove = null, status = 'ongoing';
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) result = game.user_color === 'white' ? '1-0' : '0-1';
      else result = '1/2-1/2';
      status = 'completed';
    } else {
      await new Promise(resolve => setTimeout(resolve, Math.min(game.think_time, 2000)));
      botMove = botEngine.getBestMove(chess.fen(), game.skill_level, game.depth);
      if (botMove) {
        chess.move(botMove, { sloppy: true });
        if (chess.isGameOver()) {
          if (chess.isCheckmate()) result = game.user_color === 'white' ? '0-1' : '1-0';
          else result = '1/2-1/2';
          status = 'completed';
        }
      }
    }
    const moves = [...(game.moves || []), move];
    if (botMove) moves.push(botMove);
    const pgnChess = new Chess();
    for (const m of moves) pgnChess.move(m, { sloppy: true });
    const pgn = pgnChess.pgn();
    await pool.query(`UPDATE bot_games SET fen = $1, moves = $2, status = $3, result = $4, pgn = $5, updated_at = NOW() WHERE id = $6`, [chess.fen(), moves, status, result, pgn, gameId]);
    res.json({ success: true, fen: chess.fen(), userMove: move, botMove, moves, isGameOver: status === 'completed', result, isCheck: chess.isCheck(), pgn: status === 'completed' ? pgn : null });
  } catch (err) {
    console.error('Error making move:', err);
    res.status(500).json({ error: 'Failed to make move' });
  }
});

router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT bg.*, b.name as bot_name, b.emoji as bot_emoji, b.elo as bot_elo FROM bot_games bg JOIN bots b ON bg.bot_id = b.id WHERE bg.id = $1 AND bg.user_id = $2`,
      [gameId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    const game = result.rows[0];
    const chess = new Chess(game.fen);
    res.json({ gameId: game.id, bot: { name: game.bot_name, emoji: game.bot_emoji, elo: game.bot_elo }, fen: game.fen, moves: game.moves || [], userColor: game.user_color, status: game.status, result: game.result, isCheck: chess.isCheck(), isGameOver: chess.isGameOver(), pgn: game.pgn });
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

router.post('/resign/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user?.id;
    const result = await pool.query(
      `UPDATE bot_games SET status = 'completed', result = CASE WHEN user_color = 'white' THEN '0-1' ELSE '1-0' END, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'ongoing' RETURNING *`,
      [gameId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Game not found or already finished' });
    res.json({ success: true, result: result.rows[0].result });
  } catch (err) {
    console.error('Error resigning:', err);
    res.status(500).json({ error: 'Failed to resign' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;
    if (!userId) return res.status(401).json({ error: 'Must be logged in' });
    const result = await pool.query(
      `SELECT bg.id, bg.result, bg.user_color, bg.status, bg.created_at, b.name as bot_name, b.emoji as bot_emoji, b.elo as bot_elo FROM bot_games bg JOIN bots b ON bg.bot_id = b.id WHERE bg.user_id = $1 ORDER BY bg.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
