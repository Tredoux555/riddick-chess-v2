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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-6xl animate-pulse">♟️</div>
    </div>
  );

  if (!gameData) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <div className="text-white text-xl mb-4">Game not found</div>
        <button onClick={() => navigate('/bots')} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold">Back to Bots</button>
      </div>
    </div>
  );

  const getResultText = () => {
    if (!result) return '';
    if (result === '1/2-1/2') return 'Draw!';
    const youWon = (gameData.userColor === 'white' && result === '1-0') || (gameData.userColor === 'black' && result === '0-1');
    return youWon ? 'You Won!' : `${gameData.bot.name} Wins!`;
  };

  return (
    <div className="min-h-screen bg-[#312e2b] py-4 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Board Section */}
          <div className="w-full lg:w-auto">
            {/* Opponent Info Bar */}
            <div className="bg-[#262421] rounded-t-lg px-4 py-2 flex items-center gap-3">
              <span className="text-2xl">{gameData.bot.emoji}</span>
              <div>
                <div className="text-white font-semibold">{gameData.bot.name}</div>
                <div className="text-gray-400 text-xs">{gameData.bot.elo} ELO</div>
              </div>
              {thinking && (
                <div className="ml-auto flex items-center gap-2 text-yellow-400 text-sm">
                  <span className="animate-pulse">●</span> Thinking...
                </div>
              )}
            </div>
            
            {/* Chess Board - Fixed size */}
            <div className="bg-[#262421]" style={{ width: '480px', maxWidth: '100vw' }}>
              <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop} 
                boardOrientation={gameData.userColor} 
                customSquareStyles={customSquareStyles} 
                animationDuration={200}
                boardWidth={480}
                customDarkSquareStyle={{ backgroundColor: '#779556' }}
                customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
              />
            </div>
            
            {/* Player Info Bar */}
            <div className="bg-[#262421] rounded-b-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {gameData.userColor === 'white' ? 'W' : 'B'}
                </div>
                <div>
                  <div className="text-white font-semibold">You</div>
                  <div className="text-gray-400 text-xs capitalize">{gameData.userColor}</div>
                </div>
              </div>
              {!gameOver && game.turn() === gameData.userColor[0] && (
                <div className="text-green-400 text-sm font-medium">Your turn</div>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-full lg:w-72 space-y-3">
            {/* Game Over Banner */}
            {gameOver && (
              <div className="bg-[#262421] rounded-lg p-4 text-center border border-gray-600">
                <div className="text-2xl font-bold text-white mb-1">{getResultText()}</div>
                <div className="text-gray-400 text-sm mb-4">vs {gameData.bot.name}</div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate('/bots')} className="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold text-sm">
                    New Game
                  </button>
                  <button onClick={handleAnalyze} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold text-sm">
                    Analyze Game
                  </button>
                </div>
              </div>
            )}

            {/* Move History */}
            <div className="bg-[#262421] rounded-lg p-3">
              <h3 className="text-white font-semibold text-sm mb-2">Moves</h3>
              <div className="max-h-48 overflow-y-auto bg-[#1e1c1a] rounded p-2">
                {moveHistory.length === 0 ? (
                  <div className="text-gray-500 text-xs text-center py-2">No moves yet</div>
                ) : (
                  <div className="text-xs font-mono">
                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                      <div key={i} className="flex gap-2 py-0.5">
                        <span className="text-gray-500 w-6">{i + 1}.</span>
                        <span className="text-white w-14">{moveHistory[i * 2] || ''}</span>
                        <span className="text-gray-300 w-14">{moveHistory[i * 2 + 1] || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Resign Button */}
            {!gameOver && (
              <button onClick={handleResign} className="w-full py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white font-semibold text-sm">
                Resign
              </button>
            )}

            {/* Back Link */}
            <button onClick={() => navigate('/bots')} className="w-full text-gray-400 hover:text-white text-sm py-2">
              ← Back to Bots
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotGame;
