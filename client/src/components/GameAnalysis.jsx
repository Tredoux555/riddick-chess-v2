import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';

const BOARD_THEMES = {
  classic: { light: '#f0d9b5', dark: '#b58863' },
  blue: { light: '#dee3e6', dark: '#8ca2ad' },
  green: { light: '#eeeed2', dark: '#769656' },
  purple: { light: '#e8e0f0', dark: '#7b61a8' },
  wood: { light: '#e8d0aa', dark: '#a87c50' }
};

const PIECE_URLS = {
  neo: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150',
  cburnett: 'https://lichess1.org/assets/piece/cburnett',
  merida: 'https://lichess1.org/assets/piece/merida',
  alpha: 'https://lichess1.org/assets/piece/alpha',
  classic: 'https://lichess1.org/assets/piece/maestro'
};

const createPieces = (pieceSet) => {
  const baseUrl = PIECE_URLS[pieceSet] || PIECE_URLS.cburnett;
  const isChessCom = baseUrl.includes('chesscomfiles');
  const pieces = {};
  const pieceMap = {
    wK: isChessCom ? 'wk.png' : 'wK.svg', wQ: isChessCom ? 'wq.png' : 'wQ.svg',
    wR: isChessCom ? 'wr.png' : 'wR.svg', wB: isChessCom ? 'wb.png' : 'wB.svg',
    wN: isChessCom ? 'wn.png' : 'wN.svg', wP: isChessCom ? 'wp.png' : 'wP.svg',
    bK: isChessCom ? 'bk.png' : 'bK.svg', bQ: isChessCom ? 'bq.png' : 'bQ.svg',
    bR: isChessCom ? 'br.png' : 'bR.svg', bB: isChessCom ? 'bb.png' : 'bB.svg',
    bN: isChessCom ? 'bn.png' : 'bN.svg', bP: isChessCom ? 'bp.png' : 'bP.svg',
  };
  Object.entries(pieceMap).forEach(([piece, file]) => {
    pieces[piece] = ({ squareWidth }) => (
      <img src={`${baseUrl}/${file}`} alt={piece} style={{ width: squareWidth, height: squareWidth }} />
    );
  });
  return pieces;
};

// Chess.com style classifications
const CLASSIFICATIONS = {
  brilliant: { icon: '!!', color: '#1baca6', bg: '#1baca620', label: 'Brilliant' },
  best: { icon: '★', color: '#96bc4b', bg: '#96bc4b20', label: 'Best' },
  excellent: { icon: '!', color: '#96bc4b', bg: '#96bc4b20', label: 'Excellent' },
  good: { icon: '●', color: '#95af8a', bg: '#95af8a20', label: 'Good' },
  book: { icon: '📖', color: '#a88865', bg: '#a8886520', label: 'Book' },
  inaccuracy: { icon: '?!', color: '#f7c631', bg: '#f7c63120', label: 'Inaccuracy' },
  mistake: { icon: '?', color: '#e6912c', bg: '#e6912c20', label: 'Mistake' },
  blunder: { icon: '??', color: '#ca3431', bg: '#ca343120', label: 'Blunder' },
  forced: { icon: '→', color: '#888888', bg: '#88888820', label: 'Forced' },
  great: { icon: '!', color: '#96bc4b', bg: '#96bc4b20', label: 'Great' }
};

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
  const [preferences, setPreferences] = useState({ board_theme: 'green', piece_set: 'neo' });
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/customization/preferences', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPreferences({ board_theme: data.board_theme || 'green', piece_set: data.piece_set || 'neo' });
        }
      } catch (err) { console.log('Using default preferences'); }
    };
    if (token) fetchPrefs();
  }, [token]);

  const boardTheme = BOARD_THEMES[preferences.board_theme] || BOARD_THEMES.green;
  const customPieces = createPieces(preferences.piece_set);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/analysis/${analysisId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'completed') { setAnalysis(data); setLoading(false); }
      else if (data.status === 'analyzing' || data.status === 'pending') { setTimeout(fetchAnalysis, 2000); }
      else if (data.status === 'failed') { setError('Analysis failed'); setLoading(false); }
    } catch (err) { setError('Failed to load'); setLoading(false); }
  }, [analysisId, token]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  useEffect(() => {
    if (!analysis?.moves) return;
    const chess = new Chess();
    for (let i = 0; i < currentMoveIndex; i++) {
      if (analysis.moves[i]) { 
        try { chess.move(analysis.moves[i].move_played || analysis.moves[i].move, { sloppy: true }); } catch (e) {} 
      }
    }
    setGame(chess);
  }, [currentMoveIndex, analysis]);

  useEffect(() => {
    if (!autoPlay || !analysis?.moves) return;
    const interval = setInterval(() => {
      setCurrentMoveIndex(prev => { if (prev >= analysis.moves.length) { setAutoPlay(false); return prev; } return prev + 1; });
    }, 1200);
    return () => clearInterval(interval);
  }, [autoPlay, analysis]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') setCurrentMoveIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setCurrentMoveIndex(prev => Math.min(analysis?.moves?.length || 0, prev + 1));
      if (e.key === ' ') { e.preventDefault(); setAutoPlay(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [analysis]);

  // Get current evaluation for the eval bar
  const getCurrentEval = () => {
    if (currentMoveIndex === 0) return 0.2;
    const move = analysis?.moves[currentMoveIndex - 1];
    if (!move) return 0;
    return parseFloat(move.eval_after || move.evalAfter || 0);
  };

  // Convert eval to percentage for the bar (white's perspective)
  const evalToPercent = (evalScore) => {
    if (typeof evalScore === 'string' && evalScore.includes('M')) {
      return evalScore.includes('-') ? 0 : 100;
    }
    const e = parseFloat(evalScore) || 0;
    // Sigmoid-like function: 50 + 50 * tanh(eval / 4)
    const percent = 50 + 50 * Math.tanh(e / 4);
    return Math.max(0, Math.min(100, percent));
  };

  const formatEval = (evalScore) => {
    if (!evalScore) return '0.0';
    if (typeof evalScore === 'string' && evalScore.includes('M')) return evalScore;
    const e = parseFloat(evalScore);
    if (isNaN(e)) return '0.0';
    return e > 0 ? `+${e.toFixed(1)}` : e.toFixed(1);
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingBox}>
        <div style={styles.spinner}></div>
        <h2 style={{ color: '#fff', margin: '20px 0 10px' }}>Analyzing your game...</h2>
        <p style={{ color: '#888' }}>This may take a minute</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={styles.loadingContainer}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <p style={{ color: '#fff', marginBottom: '20px' }}>{error}</p>
        <button onClick={() => navigate(-1)} style={styles.backButton}>Go Back</button>
      </div>
    </div>
  );

  if (!analysis) return null;

  const currentMove = analysis.moves[currentMoveIndex - 1];
  const currentEval = getCurrentEval();
  const evalPercent = evalToPercent(currentEval);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backLink}>← Back</button>
        <h1 style={styles.title}>Game Review</h1>
        <button onClick={() => setFlipped(!flipped)} style={styles.flipButton}>🔄 Flip</button>
      </div>

      <div style={styles.mainContent}>
        {/* Left: Accuracy Cards */}
        <div style={styles.leftPanel}>
          {/* Accuracy Cards */}
          <div style={styles.accuracyCard}>
            <div style={styles.accuracyHeader}>
              <span style={styles.playerIcon}>⬜</span>
              <span style={styles.playerName}>White</span>
            </div>
            <div style={{...styles.accuracyValue, color: getAccuracyColor(analysis.whiteAccuracy)}}>
              {analysis.whiteAccuracy}%
            </div>
            <div style={styles.accuracyLabel}>Accuracy</div>
            <div style={styles.moveBreakdown}>
              {Object.entries(analysis.summary?.white || {}).map(([type, count]) => {
                if (count === 0 || !CLASSIFICATIONS[type]) return null;
                return (
                  <div key={type} style={styles.breakdownItem}>
                    <span style={{...styles.classIcon, color: CLASSIFICATIONS[type].color}}>
                      {CLASSIFICATIONS[type].icon}
                    </span>
                    <span style={styles.breakdownCount}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.accuracyCard}>
            <div style={styles.accuracyHeader}>
              <span style={styles.playerIcon}>⬛</span>
              <span style={styles.playerName}>Black</span>
            </div>
            <div style={{...styles.accuracyValue, color: getAccuracyColor(analysis.blackAccuracy)}}>
              {analysis.blackAccuracy}%
            </div>
            <div style={styles.accuracyLabel}>Accuracy</div>
            <div style={styles.moveBreakdown}>
              {Object.entries(analysis.summary?.black || {}).map(([type, count]) => {
                if (count === 0 || !CLASSIFICATIONS[type]) return null;
                return (
                  <div key={type} style={styles.breakdownItem}>
                    <span style={{...styles.classIcon, color: CLASSIFICATIONS[type].color}}>
                      {CLASSIFICATIONS[type].icon}
                    </span>
                    <span style={styles.breakdownCount}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Board with Eval Bar */}
        <div style={styles.centerPanel}>
          {/* Move Info Bar */}
          <div style={{
            ...styles.moveInfoBar,
            background: currentMove ? (CLASSIFICATIONS[currentMove.classification]?.bg || '#333') : '#333',
            borderLeft: currentMove ? `4px solid ${CLASSIFICATIONS[currentMove.classification]?.color || '#666'}` : '4px solid #666'
          }}>
            {currentMove ? (
              <div style={styles.moveInfoContent}>
                <span style={{...styles.classificationIcon, color: CLASSIFICATIONS[currentMove.classification]?.color}}>
                  {CLASSIFICATIONS[currentMove.classification]?.icon}
                </span>
                <span style={styles.moveText}>
                  {currentMove.move_number || currentMove.moveNumber}.
                  {currentMove.color === 'black' ? '..' : ''} 
                  {currentMove.move_played || currentMove.move}
                </span>
                <span style={{...styles.classificationLabel, color: CLASSIFICATIONS[currentMove.classification]?.color}}>
                  {CLASSIFICATIONS[currentMove.classification]?.label}
                </span>
                {currentMove.best_move && currentMove.best_move !== (currentMove.move_played || currentMove.move) && (
                  <span style={styles.bestMoveHint}>
                    Best: <span style={{color: '#96bc4b'}}>{currentMove.best_move}</span>
                  </span>
                )}
              </div>
            ) : (
              <span style={{color: '#888'}}>Starting position</span>
            )}
          </div>

          <div style={styles.boardWrapper}>
            {/* Eval Bar */}
            <div style={styles.evalBar}>
              <div style={{...styles.evalBarWhite, height: `${evalPercent}%`}}></div>
              <div style={styles.evalText}>{formatEval(currentEval)}</div>
            </div>
            
            {/* Board */}
            <div style={styles.boardContainer}>
              <Chessboard 
                position={game.fen()} 
                boardOrientation={flipped ? 'black' : 'white'}
                arePiecesDraggable={false} 
                animationDuration={150}
                customLightSquareStyle={{ backgroundColor: boardTheme.light }}
                customDarkSquareStyle={{ backgroundColor: boardTheme.dark }}
                customPieces={customPieces}
                customSquareStyles={currentMove ? {
                  [currentMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                  [currentMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
                } : {}}
              />
            </div>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <button onClick={() => setCurrentMoveIndex(0)} style={styles.controlBtn}>⏮</button>
            <button onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))} style={styles.controlBtn}>◀</button>
            <button onClick={() => setAutoPlay(!autoPlay)} style={{...styles.controlBtn, ...styles.playBtn, background: autoPlay ? '#96bc4b' : '#444'}}>
              {autoPlay ? '⏸' : '▶'}
            </button>
            <button onClick={() => setCurrentMoveIndex(Math.min(analysis.moves.length, currentMoveIndex + 1))} style={styles.controlBtn}>▶</button>
            <button onClick={() => setCurrentMoveIndex(analysis.moves.length)} style={styles.controlBtn}>⏭</button>
          </div>

          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${(currentMoveIndex / analysis.moves.length) * 100}%`}}></div>
          </div>
          <div style={styles.moveCounter}>{currentMoveIndex} / {analysis.moves.length}</div>
        </div>

        {/* Right: Move List */}
        <div style={styles.rightPanel}>
          <h3 style={styles.movesTitle}>Moves</h3>
          <div style={styles.movesList}>
            <div 
              onClick={() => setCurrentMoveIndex(0)}
              style={{...styles.moveItem, background: currentMoveIndex === 0 ? '#444' : 'transparent'}}
            >
              <span style={{color: '#888'}}>Start</span>
            </div>
            {analysis.moves.map((move, idx) => {
              const config = CLASSIFICATIONS[move.classification] || CLASSIFICATIONS.good;
              const isSelected = idx === currentMoveIndex - 1;
              const moveNum = move.move_number || move.moveNumber;
              const moveSan = move.move_played || move.move;
              
              return (
                <div 
                  key={idx}
                  onClick={() => setCurrentMoveIndex(idx + 1)}
                  style={{
                    ...styles.moveItem,
                    background: isSelected ? '#444' : 'transparent',
                    borderLeft: `3px solid ${config.color}`
                  }}
                >
                  <span style={{...styles.moveClassIcon, color: config.color}}>{config.icon}</span>
                  <span style={styles.moveNumber}>{moveNum}.{move.color === 'black' ? '..' : ''}</span>
                  <span style={styles.moveSan}>{moveSan}</span>
                  <span style={{...styles.moveEval, color: parseFloat(move.eval_after || move.evalAfter) > 0 ? '#fff' : '#888'}}>
                    {formatEval(move.eval_after || move.evalAfter)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const getAccuracyColor = (acc) => {
  const a = parseFloat(acc);
  if (a >= 90) return '#96bc4b';
  if (a >= 80) return '#f7c631';
  if (a >= 70) return '#e6912c';
  return '#ca3431';
};

const styles = {
  container: { minHeight: '100vh', background: '#262522', padding: '16px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', maxWidth: '1400px', margin: '0 auto 16px' },
  backLink: { background: 'none', border: 'none', color: '#81b64c', cursor: 'pointer', fontSize: '14px' },
  title: { color: '#fff', fontSize: '20px', fontWeight: '600', margin: 0 },
  flipButton: { background: '#333', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' },
  mainContent: { display: 'flex', gap: '16px', maxWidth: '1400px', margin: '0 auto', alignItems: 'flex-start' },
  leftPanel: { width: '200px', display: 'flex', flexDirection: 'column', gap: '12px' },
  centerPanel: { flex: 1, maxWidth: '600px' },
  rightPanel: { width: '280px', background: '#302e2b', borderRadius: '8px', overflow: 'hidden' },
  accuracyCard: { background: '#302e2b', borderRadius: '8px', padding: '16px', textAlign: 'center' },
  accuracyHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' },
  playerIcon: { fontSize: '20px' },
  playerName: { color: '#fff', fontWeight: '600' },
  accuracyValue: { fontSize: '32px', fontWeight: '700' },
  accuracyLabel: { color: '#888', fontSize: '12px', marginTop: '4px' },
  moveBreakdown: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', marginTop: '12px' },
  breakdownItem: { display: 'flex', alignItems: 'center', gap: '4px' },
  classIcon: { fontSize: '14px', fontWeight: '700' },
  breakdownCount: { color: '#fff', fontSize: '14px' },
  moveInfoBar: { padding: '12px 16px', borderRadius: '8px 8px 0 0', marginBottom: '0' },
  moveInfoContent: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  classificationIcon: { fontSize: '18px', fontWeight: '700' },
  moveText: { color: '#fff', fontWeight: '600', fontSize: '16px' },
  classificationLabel: { fontSize: '14px', fontWeight: '600' },
  bestMoveHint: { color: '#888', fontSize: '13px', marginLeft: 'auto' },
  boardWrapper: { display: 'flex', gap: '0' },
  evalBar: { width: '24px', background: '#000', borderRadius: '4px 0 0 4px', position: 'relative', overflow: 'hidden' },
  evalBarWhite: { position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', transition: 'height 0.3s ease' },
  evalText: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', color: '#888', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' },
  boardContainer: { flex: 1 },
  controls: { display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' },
  controlBtn: { background: '#444', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' },
  playBtn: { width: '60px' },
  progressBar: { height: '4px', background: '#444', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#81b64c', transition: 'width 0.2s' },
  moveCounter: { textAlign: 'center', color: '#888', fontSize: '12px', marginTop: '8px' },
  movesTitle: { color: '#fff', padding: '12px 16px', margin: 0, borderBottom: '1px solid #444', fontSize: '14px' },
  movesList: { maxHeight: '500px', overflowY: 'auto' },
  moveItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #3a3835' },
  moveClassIcon: { width: '20px', textAlign: 'center', fontWeight: '700', fontSize: '12px' },
  moveNumber: { color: '#888', fontSize: '12px', width: '32px' },
  moveSan: { color: '#fff', fontSize: '14px', fontWeight: '500', flex: 1 },
  moveEval: { fontSize: '12px', fontFamily: 'monospace' },
  loadingContainer: { minHeight: '100vh', background: '#262522', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { textAlign: 'center' },
  spinner: { width: '50px', height: '50px', border: '3px solid #444', borderTop: '3px solid #81b64c', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' },
  backButton: { background: '#81b64c', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }
};

// Add keyframe animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(styleSheet);

export default GameAnalysis;
