import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const BotGame = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
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
      const res = await fetch(`/api/bots/game/${gameId}`, { credentials: 'include' });
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
  }, [gameId]);

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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
    if (!confirm('Are you sure you want to resign? 🏳️')) return;
    try {
      const res = await fetch(`/api/bots/resign/${gameId}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) { setGameOver(true); setResult(data.result); }
    } catch (err) { console.error('Resign failed:', err); }
  };

  const handleAnalyze = async () => {
    try {
      const res = await fetch('/api/analysis/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-6xl mb-4 animate-pulse">♟️</div></div>;
  if (!gameData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4">❌</div><div className="text-white text-xl mb-4">Game not found</div><button onClick={() => navigate('/bots')} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold">Back to Bots</button></div></div>;

  const getResultText = () => {
    if (!result) return '';
    if (result === '1/2-1/2') return '🤝 Draw!';
    const youWon = (gameData.userColor === 'white' && result === '1-0') || (gameData.userColor === 'black' && result === '0-1');
    return youWon ? '🎉 You Won!' : `💀 ${gameData.bot.name} Wins!`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-4 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-gray-800 rounded-t-2xl p-4 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-3"><span className="text-4xl">{gameData.bot.emoji}</span><div><div className="text-white font-bold text-lg">{gameData.bot.name}</div><div className="text-gray-400 text-sm">⭐ {gameData.bot.elo} ELO</div></div></div>
              {thinking && <div className="flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full"><span className="animate-bounce">🤔</span><span className="text-yellow-400 font-medium">Thinking...</span></div>}
            </div>
            <div className="bg-gray-700 p-3">
              <Chessboard position={game.fen()} onPieceDrop={onDrop} boardOrientation={gameData.userColor} customSquareStyles={customSquareStyles} animationDuration={200} />
            </div>
            <div className="bg-gray-800 rounded-b-2xl p-4 flex items-center justify-between border-t border-gray-700">
              <div className="flex items-center gap-3"><span className="text-4xl">😎</span><div><div className="text-white font-bold text-lg">You</div><div className="text-gray-400 text-sm capitalize">Playing {gameData.userColor}</div></div></div>
              {!gameOver && game.turn() === gameData.userColor[0] && <div className="bg-green-500/20 px-4 py-2 rounded-full"><span className="text-green-400 font-bold">✨ Your turn!</span></div>}
            </div>
          </div>
          <div className="lg:w-80 space-y-4">
            {gameOver && (
              <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 rounded-2xl p-6 text-center shadow-xl">
                <div className="text-4xl font-bold text-white mb-2">{getResultText()}</div>
                <div className="text-white/80 mb-6">vs {gameData.bot.name} {gameData.bot.emoji}</div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => navigate('/bots')} className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-bold transition-colors">🎮 New Game</button>
                  <button onClick={handleAnalyze} className="w-full px-4 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-100 transition-colors">🤖 Analyze with AI</button>
                </div>
              </div>
            )}
            <div className="bg-gray-800 rounded-2xl p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">📜 Move History</h3>
              <div className="max-h-64 overflow-y-auto">
                {moveHistory.length === 0 ? <div className="text-gray-500 text-sm text-center py-4">No moves yet</div> : (
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {moveHistory.map((move, idx) => (
                      <div key={idx} className={`px-3 py-2 rounded-lg font-mono ${idx === moveHistory.length - 1 ? 'bg-yellow-500/20 text-yellow-300' : idx % 2 === 0 ? 'bg-gray-700/80 text-gray-300' : 'bg-gray-700/40 text-gray-400'}`}>
                        {idx % 2 === 0 && <span className="text-gray-500 mr-1">{Math.floor(idx / 2) + 1}.</span>}{move}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {!gameOver && <div className="bg-gray-800 rounded-2xl p-4"><button onClick={handleResign} className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-2">🏳️ Resign</button></div>}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 border border-gray-700">
              <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">💡 Chess Tips</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>• Control the center with your pawns</li>
                <li>• Develop your knights and bishops early</li>
                <li>• Castle to protect your king</li>
                <li>• Think about your opponent's threats!</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="text-center mt-8"><button onClick={() => navigate('/bots')} className="text-gray-400 hover:text-white transition-colors">← Back to Bot Selection</button></div>
      </div>
    </div>
  );
};

export default BotGame;
