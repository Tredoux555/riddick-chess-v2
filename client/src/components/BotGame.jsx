import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';

// Chess.com style piece images
const pieceTheme = (piece) => {
  const pieceMap = {
    wK: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png',
    wQ: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png',
    wR: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png',
    wB: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png',
    wN: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png',
    wP: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png',
    bK: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png',
    bQ: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png',
    bR: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png',
    bB: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png',
    bN: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png',
    bP: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png',
  };
  return pieceMap[piece];
};

const customPieces = () => {
  const pieces = {};
  ['wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP'].forEach(p => {
    pieces[p] = ({ squareWidth }) => (
      <img src={pieceTheme(p)} alt={p} style={{ width: squareWidth, height: squareWidth }} />
    );
  });
  return pieces;
};

const BotGame = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [game, setGame] = useState(new Chess());
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/game/${gameId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) { console.error(data.error); return; }
      setGameData(data);
      const chess = new Chess(data.fen);
      setGame(chess);
      setMoveHistory(data.moves || []);
      if (data.status === 'completed') { setGameOver(true); setResult(data.result); }
      if (data.moves && data.moves.length > 0) {
        const lastMoveUci = data.moves[data.moves.length - 1];
        setLastMove({ from: lastMoveUci.substring(0, 2), to: lastMoveUci.substring(2, 4) });
      }
    } catch (err) { console.error('Failed to fetch game:', err); }
    finally { setLoading(false); }
  }, [gameId, token]);

  useEffect(() => { fetchGame(); }, [fetchGame]);

  const onDrop = async (sourceSquare, targetSquare) => {
    if (gameOver || thinking) return false;
    const isWhiteTurn = game.turn() === 'w';
    const isYourTurn = (gameData.userColor === 'white' && isWhiteTurn) || (gameData.userColor === 'black' && !isWhiteTurn);
    if (!isYourTurn) return false;
    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) return false;
    setGame(gameCopy);
    setLastMove({ from: sourceSquare, to: targetSquare });
    setThinking(true);
    try {
      const res = await fetch('/api/bots/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gameId, move: sourceSquare + targetSquare + (move.promotion || '') })
      });
      const data = await res.json();
      if (data.error) { setGame(new Chess(game.fen())); setThinking(false); return false; }
      const newGame = new Chess(data.fen);
      setGame(newGame);
      setMoveHistory(data.moves);
      if (data.botMove) setLastMove({ from: data.botMove.substring(0, 2), to: data.botMove.substring(2, 4) });
      if (data.isGameOver) { setGameOver(true); setResult(data.result); }
    } catch (err) { console.error('Move failed:', err); setGame(new Chess(game.fen())); }
    finally { setThinking(false); }
    return true;
  };

  const handleResign = async () => {
    if (gameOver) return;
    if (!window.confirm('Are you sure you want to resign?')) return;
    try {
      const res = await fetch(`/api/bots/resign/${gameId}`, { 
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) { setGameOver(true); setResult(data.result); }
    } catch (err) { console.error('Resign failed:', err); }
  };

  const handleAnalyze = async () => {
    try {
      const res = await fetch('/api/analysis/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gameId: parseInt(gameId), gameType: 'bot' })
      });
      const data = await res.json();
      if (data.analysisId) navigate(`/analysis/${data.analysisId}`);
    } catch (err) { console.error('Analysis request failed:', err); }
  };

  const customSquareStyles = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#312e2b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '64px' }}>♟️</div>
    </div>
  );

  if (!gameData) return (
    <div style={{ minHeight: '100vh', background: '#312e2b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
        <div style={{ fontSize: '20px', marginBottom: '16px' }}>Game not found</div>
        <button onClick={() => navigate('/bots')} style={{ padding: '12px 24px', background: '#81b64c', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Back to Bots</button>
      </div>
    </div>
  );

  const getResultText = () => {
    if (!result) return '';
    if (result === '1/2-1/2') return 'Draw!';
    const youWon = (gameData.userColor === 'white' && result === '1-0') || (gameData.userColor === 'black' && result === '0-1');
    return youWon ? '🎉 You Won!' : `${gameData.bot.name} Wins!`;
  };

  const styles = {
    container: { minHeight: '100vh', background: '#312e2b', padding: '20px' },
    wrapper: { maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' },
    boardSection: { background: '#262421', borderRadius: '8px', overflow: 'hidden' },
    playerBar: { padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#1e1c1a' },
    playerName: { color: 'white', fontWeight: 'bold', fontSize: '14px' },
    playerElo: { color: '#999', fontSize: '12px' },
    emoji: { fontSize: '28px' },
    thinking: { marginLeft: 'auto', color: '#f0c36d', fontSize: '13px' },
    sidebar: { width: '280px', display: 'flex', flexDirection: 'column', gap: '12px' },
    panel: { background: '#262421', borderRadius: '8px', padding: '16px' },
    panelTitle: { color: 'white', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' },
    moveList: { background: '#1e1c1a', borderRadius: '4px', padding: '8px', maxHeight: '200px', overflowY: 'auto' },
    moveRow: { display: 'flex', gap: '8px', padding: '2px 0', fontFamily: 'monospace', fontSize: '13px' },
    moveNum: { color: '#666', width: '24px' },
    moveWhite: { color: 'white', width: '60px' },
    moveBlack: { color: '#ccc', width: '60px' },
    button: { width: '100%', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
    btnGreen: { background: '#81b64c', color: 'white' },
    btnBlue: { background: '#5d9cec', color: 'white' },
    btnRed: { background: '#e74c3c', color: 'white' },
    btnGray: { background: 'transparent', color: '#999', border: 'none' },
    resultBanner: { background: 'linear-gradient(135deg, #81b64c, #5d9cec)', borderRadius: '8px', padding: '20px', textAlign: 'center' },
    resultText: { color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' },
    resultSub: { color: 'rgba(255,255,255,0.8)', marginBottom: '16px' },
    yourTurn: { marginLeft: 'auto', color: '#81b64c', fontSize: '13px', fontWeight: 'bold' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Board Section */}
        <div style={styles.boardSection}>
          {/* Opponent Bar */}
          <div style={styles.playerBar}>
            <span style={styles.emoji}>{gameData.bot.emoji}</span>
            <div>
              <div style={styles.playerName}>{gameData.bot.name}</div>
              <div style={styles.playerElo}>{gameData.bot.elo} ELO</div>
            </div>
            {thinking && <div style={styles.thinking}>🤔 Thinking...</div>}
          </div>
          
          {/* Chess Board */}
          <Chessboard 
            position={game.fen()} 
            onPieceDrop={onDrop} 
            boardOrientation={gameData.userColor} 
            customSquareStyles={customSquareStyles} 
            animationDuration={200}
            boardWidth={480}
            customDarkSquareStyle={{ backgroundColor: '#779556' }}
            customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            customPieces={customPieces()}
          />
          
          {/* Player Bar */}
          <div style={styles.playerBar}>
            <div style={{ width: '28px', height: '28px', background: '#81b64c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
              You
            </div>
            <div>
              <div style={styles.playerName}>You</div>
              <div style={styles.playerElo}>{gameData.userColor}</div>
            </div>
            {!gameOver && game.turn() === gameData.userColor[0] && <div style={styles.yourTurn}>Your turn</div>}
          </div>
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Game Over Banner */}
          {gameOver && (
            <div style={styles.resultBanner}>
              <div style={styles.resultText}>{getResultText()}</div>
              <div style={styles.resultSub}>vs {gameData.bot.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => navigate('/bots')} style={{ ...styles.button, ...styles.btnGreen }}>🎮 New Game</button>
                <button onClick={handleAnalyze} style={{ ...styles.button, ...styles.btnBlue }}>🤖 Analyze Game</button>
              </div>
            </div>
          )}

          {/* Move History */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>📜 Moves</div>
            <div style={styles.moveList}>
              {moveHistory.length === 0 ? (
                <div style={{ color: '#666', textAlign: 'center', padding: '10px' }}>No moves yet</div>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                  <div key={i} style={styles.moveRow}>
                    <span style={styles.moveNum}>{i + 1}.</span>
                    <span style={styles.moveWhite}>{moveHistory[i * 2] || ''}</span>
                    <span style={styles.moveBlack}>{moveHistory[i * 2 + 1] || ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resign Button */}
          {!gameOver && (
            <button onClick={handleResign} style={{ ...styles.button, ...styles.btnRed }}>🏳️ Resign</button>
          )}

          {/* Back Link */}
          <button onClick={() => navigate('/bots')} style={{ ...styles.button, ...styles.btnGray }}>← Back to Bots</button>
        </div>
      </div>
    </div>
  );
};

export default BotGame;
