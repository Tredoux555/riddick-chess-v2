import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';

const GameAnalysis = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [game, setGame] = useState(new Chess());
  const [autoPlay, setAutoPlay] = useState(false);

  const classifications = {
    brilliant: { icon: '✨', color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Brilliant!' },
    great: { icon: '⭐', color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Great Move' },
    good: { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/20', label: 'Good' },
    inaccuracy: { icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Inaccuracy' },
    mistake: { icon: '❌', color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Mistake' },
    blunder: { icon: '💀', color: 'text-red-400', bg: 'bg-red-500/20', label: 'Blunder!' }
  };

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/analysis/${analysisId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'completed') { setAnalysis(data); setLoading(false); }
      else if (data.status === 'analyzing' || data.status === 'pending') { setTimeout(fetchAnalysis, 2000); }
      else if (data.status === 'failed') { setError('Analysis failed. Please try again.'); setLoading(false); }
    } catch (err) { console.error('Failed to fetch analysis:', err); setError('Failed to load analysis'); setLoading(false); }
  }, [analysisId, token]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  useEffect(() => {
    if (!analysis?.moves) return;
    const chess = new Chess();
    for (let i = 0; i < currentMoveIndex; i++) {
      if (analysis.moves[i]) { try { chess.move(analysis.moves[i].move_played, { sloppy: true }); } catch (e) {} }
    }
    setGame(chess);
  }, [currentMoveIndex, analysis]);

  useEffect(() => {
    if (!autoPlay || !analysis?.moves) return;
    const interval = setInterval(() => {
      setCurrentMoveIndex(prev => { if (prev >= analysis.moves.length) { setAutoPlay(false); return prev; } return prev + 1; });
    }, 1500);
    return () => clearInterval(interval);
  }, [autoPlay, analysis]);

  const goToStart = () => setCurrentMoveIndex(0);
  const goBack = () => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1));
  const goForward = () => setCurrentMoveIndex(Math.min(analysis?.moves?.length || 0, currentMoveIndex + 1));
  const goToEnd = () => setCurrentMoveIndex(analysis?.moves?.length || 0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goBack();
      if (e.key === 'ArrowRight') goForward();
      if (e.key === ' ') { e.preventDefault(); setAutoPlay(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMoveIndex, analysis]);

  const getAccuracyColor = (accuracy) => {
    const acc = parseFloat(accuracy);
    if (acc >= 90) return 'text-green-400';
    if (acc >= 80) return 'text-yellow-400';
    if (acc >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-6 animate-pulse">🤖</div>
        <div className="text-white text-2xl mb-3">Analyzing your game...</div>
        <div className="text-gray-400 mb-6">This may take a minute</div>
        <div className="flex justify-center gap-2">{[0,1,2].map(i => <div key={i} className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay:`${i*0.2}s`}}/>)}</div>
      </div>
    </div>
  );

  if (error) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4">❌</div><div className="text-white text-xl mb-4">{error}</div><button onClick={() => navigate(-1)} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold">Go Back</button></div></div>;
  if (!analysis) return null;

  const currentMove = analysis.moves[currentMoveIndex - 1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6"><h1 className="text-4xl font-bold text-white mb-2">🤖 AI Game Analysis</h1><p className="text-gray-400">See how well you played!</p></div>
        <div className="grid grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
          <div className="bg-gray-800 rounded-2xl p-5 text-center border border-gray-700"><div className="text-3xl mb-2">⬜</div><div className={`text-4xl font-bold ${getAccuracyColor(analysis.whiteAccuracy)}`}>{analysis.whiteAccuracy}%</div><div className="text-gray-400 text-sm mt-1">White Accuracy</div></div>
          <div className="bg-gray-800 rounded-2xl p-5 text-center border border-gray-700"><div className="text-3xl mb-2">⬛</div><div className={`text-4xl font-bold ${getAccuracyColor(analysis.blackAccuracy)}`}>{analysis.blackAccuracy}%</div><div className="text-gray-400 text-sm mt-1">Black Accuracy</div></div>
        </div>
        {analysis.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
            {['white','black'].map(color => (
              <div key={color} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
                <div className="text-center mb-4"><span className="text-2xl mr-2">{color==='white'?'⬜':'⬛'}</span><span className="text-white font-bold capitalize">{color}</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(analysis.summary[color]||{}).map(([type,count]) => {
                    const config = classifications[type];
                    if (!config || count === 0) return null;
                    return <div key={type} className={`${config.bg} rounded-xl p-2 text-center`}><div className="text-xl">{config.icon}</div><div className={`font-bold ${config.color}`}>{count}</div><div className="text-xs text-gray-400">{type}</div></div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className={`rounded-t-2xl p-4 ${currentMove ? classifications[currentMove.classification]?.bg || 'bg-gray-800' : 'bg-gray-800'}`}>
              {currentMove ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><span className="text-3xl">{classifications[currentMove.classification]?.icon || '•'}</span><div><span className="text-white font-bold text-lg">{currentMove.move_number}.{currentMove.color==='black'?'..':''} {currentMove.move_played}</span><span className={`ml-3 ${classifications[currentMove.classification]?.color}`}>{classifications[currentMove.classification]?.label}</span></div></div>
                    <div className="text-right"><div className="text-gray-400 text-sm">Evaluation</div><div className={`font-bold ${parseFloat(currentMove.eval_after)>0?'text-white':'text-gray-400'}`}>{parseFloat(currentMove.eval_after)>0?'+':''}{currentMove.eval_after}</div></div>
                  </div>
                  {currentMove.best_move && currentMove.best_move !== currentMove.move_played && <div className="mt-2 text-sm text-gray-400 bg-black/20 rounded-lg px-3 py-2">💡 Best move was: <span className="text-green-400 font-mono font-bold">{currentMove.best_move}</span></div>}
                </div>
              ) : <div className="text-gray-400 text-center">Starting position • Use arrows to navigate</div>}
            </div>
            <div className="bg-gray-700 p-3"><Chessboard position={game.fen()} boardOrientation="white" arePiecesDraggable={false} animationDuration={200}/></div>
            <div className="bg-gray-800 rounded-b-2xl p-4">
              <div className="flex items-center justify-center gap-3">
                <button onClick={goToStart} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-xl">⏮️</button>
                <button onClick={goBack} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-xl">◀️</button>
                <button onClick={() => setAutoPlay(!autoPlay)} className={`px-6 py-3 rounded-xl text-white text-xl ${autoPlay ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}>{autoPlay ? '⏸️' : '▶️'}</button>
                <button onClick={goForward} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-xl">▶️</button>
                <button onClick={goToEnd} className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white text-xl">⏭️</button>
              </div>
              <div className="mt-4"><div className="flex justify-between text-sm text-gray-400 mb-1"><span>Move {currentMoveIndex}</span><span>{analysis.moves.length} total</span></div><div className="h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300" style={{width:`${(currentMoveIndex/analysis.moves.length)*100}%`}}/></div></div>
              <div className="text-center text-gray-500 text-xs mt-3">⌨️ Use ← → arrows • Space for autoplay</div>
            </div>
          </div>
          <div className="lg:w-80">
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 h-full max-h-[700px] overflow-hidden flex flex-col">
              <h3 className="text-white font-bold mb-3">📜 All Moves</h3>
              <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                <div onClick={() => setCurrentMoveIndex(0)} className={`p-2 rounded-lg cursor-pointer transition-all ${currentMoveIndex===0?'bg-purple-500/30 ring-2 ring-purple-500':'hover:bg-gray-700/50'}`}><span className="text-gray-400">Start</span></div>
                {analysis.moves.map((move, idx) => {
                  const config = classifications[move.classification];
                  const isSelected = idx === currentMoveIndex - 1;
                  return <div key={idx} onClick={() => setCurrentMoveIndex(idx+1)} className={`p-2 rounded-lg cursor-pointer transition-all ${isSelected?'ring-2 ring-purple-500':''} ${config?.bg||'bg-gray-700/30'} hover:scale-[1.02]`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-lg">{config?.icon||'•'}</span><span className="text-white font-mono text-sm">{move.move_number}.{move.color==='black'?'..':''} {move.move_played}</span></div><span className={`text-xs font-bold ${config?.color||'text-gray-400'}`}>{parseFloat(move.eval_change)>0?'+':''}{move.eval_change}</span></div></div>;
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-8"><button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors text-lg">← Back</button></div>
      </div>
    </div>
  );
};

export default GameAnalysis;
