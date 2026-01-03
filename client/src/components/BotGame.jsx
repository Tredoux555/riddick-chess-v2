import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';

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
      if (data.error) { console.error(data.error); setLoading(false); return; }
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

  const squareStyles = {};
  if (lastMove) {
    squareStyles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    squareStyles[lastMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#312e2b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '48px' }}>♟️ Loading...</div>
    </div>
  );

  if (!gameData) return (
    <div style={{ minHeight: '100vh', background: '#312e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div>Game not found</div>
        <button onClick={() => navigate('/bots')} style={{ marginTop: '16px', padding: '12px 24px', background: '#81b64c', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>Back to Bots</button>
      </div>
    </div>
  );

  const resultText = result === '1/2-1/2' ? 'Draw!' : 
    ((gameData.userColor === 'white' && result === '1-0') || (gameData.userColor === 'black' && result === '0-1')) ? '🎉 You Won!' : `${gameData.bot.name} Wins!`;

  return (
    <div style={{ minHeight: '100vh', background: '#312e2b', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Board */}
          <div>
            <div style={{ background: '#262421', padding: '10px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{gameData.bot.emoji}</span>
              <div>
                <div style={{ color: 'white', fontWeight: 'bold' }}>{gameData.bot.name}</div>
                <div style={{ color: '#999', fontSize: '12px' }}>{gameData.bot.elo} ELO</div>
              </div>
              {thinking && <span style={{ marginLeft: 'auto', color: '#f0c36d' }}>🤔 Thinking...</span>}
            </div>
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={gameData.userColor}
              customSquareStyles={squareStyles}
              boardWidth={Math.min(480, window.innerWidth - 40)}
              customDarkSquareStyle={{ backgroundColor: '#779556' }}
              customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
            />
            <div style={{ background: '#262421', padding: '10px 16px', borderRadius: '0 0 8px 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', background: '#81b64c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>You</div>
              <div>
                <div style={{ color: 'white', fontWeight: 'bold' }}>You</div>
                <div style={{ color: '#999', fontSize: '12px', textTransform: 'capitalize' }}>{gameData.userColor}</div>
              </div>
              {!gameOver && game.turn() === gameData.userColor[0] && <span style={{ marginLeft: 'auto', color: '#81b64c', fontWeight: 'bold' }}>Your turn</span>}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: '260px' }}>
            {gameOver && (
              <div style={{ background: 'linear-gradient(135deg, #81b64c, #5d9cec)', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>{resultText}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>vs {gameData.bot.name}</div>
                <button onClick={() => navigate('/bots')} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' }}>🎮 New Game</button>
                <button onClick={handleAnalyze} style={{ width: '100%', padding: '10px', background: 'white', border: 'none', borderRadius: '6px', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}>🤖 Analyze</button>
              </div>
            )}
            <div style={{ background: '#262421', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>📜 Moves</div>
              <div style={{ background: '#1e1c1a', borderRadius: '4px', padding: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {moveHistory.length === 0 ? (
                  <div style={{ color: '#666', textAlign: 'center' }}>No moves yet</div>
                ) : (
                  Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', fontFamily: 'monospace', fontSize: '13px', padding: '2px 0' }}>
                      <span style={{ color: '#666', width: '24px' }}>{i + 1}.</span>
                      <span style={{ color: 'white', width: '50px' }}>{moveHistory[i * 2]}</span>
                      <span style={{ color: '#aaa', width: '50px' }}>{moveHistory[i * 2 + 1] || ''}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {!gameOver && <button onClick={handleResign} style={{ width: '100%', padding: '12px', background: '#c0392b', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px' }}>🏳️ Resign</button>}
            <button onClick={() => navigate('/bots')} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}>← Back to Bots</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotGame;
