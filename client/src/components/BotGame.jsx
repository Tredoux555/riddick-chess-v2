import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../contexts/AuthContext';

// Board theme colors
const BOARD_THEMES = {
  classic: { light: '#f0d9b5', dark: '#b58863' },
  blue: { light: '#dee3e6', dark: '#8ca2ad' },
  green: { light: '#eeeed2', dark: '#769656' },
  purple: { light: '#e8e0f0', dark: '#7b61a8' },
  wood: { light: '#e8d0aa', dark: '#a87c50' }
};

// Piece set URLs (using lichess CDN - open source)
const PIECE_URLS = {
  neo: 'https://images.chesscomfiles.com/chess-themes/pieces/neo/150',
  cburnett: 'https://lichess1.org/assets/piece/cburnett',
  merida: 'https://lichess1.org/assets/piece/merida',
  alpha: 'https://lichess1.org/assets/piece/alpha',
  classic: 'https://lichess1.org/assets/piece/maestro'
};

// Create custom pieces from piece set
const createPieces = (pieceSet) => {
  const baseUrl = PIECE_URLS[pieceSet] || PIECE_URLS.cburnett;
  const isChessCom = baseUrl.includes('chesscomfiles');
  const pieces = {};
  
  const pieceMap = {
    wK: isChessCom ? 'wk.png' : 'wK.svg',
    wQ: isChessCom ? 'wq.png' : 'wQ.svg',
    wR: isChessCom ? 'wr.png' : 'wR.svg',
    wB: isChessCom ? 'wb.png' : 'wB.svg',
    wN: isChessCom ? 'wn.png' : 'wN.svg',
    wP: isChessCom ? 'wp.png' : 'wP.svg',
    bK: isChessCom ? 'bk.png' : 'bK.svg',
    bQ: isChessCom ? 'bq.png' : 'bQ.svg',
    bR: isChessCom ? 'br.png' : 'bR.svg',
    bB: isChessCom ? 'bb.png' : 'bB.svg',
    bN: isChessCom ? 'bn.png' : 'bN.svg',
    bP: isChessCom ? 'bp.png' : 'bP.svg',
  };
  
  Object.entries(pieceMap).forEach(([piece, file]) => {
    pieces[piece] = ({ squareWidth }) => (
      <img 
        src={`${baseUrl}/${file}`} 
        alt={piece} 
        style={{ width: squareWidth, height: squareWidth }} 
      />
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
  const [preferences, setPreferences] = useState({ board_theme: 'green', piece_set: 'neo' });

  // Fetch user preferences
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/customization/preferences', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPreferences({
            board_theme: data.board_theme || 'green',
            piece_set: data.piece_set || 'neo'
          });
        }
      } catch (err) { console.log('Using default preferences'); }
    };
    if (token) fetchPrefs();
  }, [token]);

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

  // Format moves for display (pair them up)
  const formatMoves = () => {
    const pairs = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moveHistory[i] || '',
        black: moveHistory[i + 1] || ''
      });
    }
    return pairs;
  };

  // Get board colors from theme
  const boardTheme = BOARD_THEMES[preferences.board_theme] || BOARD_THEMES.green;
  const customPieces = createPieces(preferences.piece_set);

  // Highlight squares for last move
  const customSquareStyles = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    customSquareStyles[lastMove.to] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading game...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Game not found</h2>
          <button style={styles.button} onClick={() => navigate('/bots')}>Back to Bots</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.gameArea}>
        {/* Left side - Board */}
        <div style={styles.boardSection}>
          {/* Opponent info (bot) */}
          <div style={styles.playerInfo}>
            <span style={styles.botEmoji}>{gameData.bot?.emoji || '🤖'}</span>
            <span style={styles.playerName}>{gameData.bot?.name || 'Bot'}</span>
            <span style={styles.elo}>({gameData.bot?.elo || '?'})</span>
            {thinking && <span style={styles.thinkingIndicator}>Thinking...</span>}
          </div>

          {/* Chess board */}
          <div style={styles.boardWrapper}>
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={gameData.userColor || 'white'}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
              customLightSquareStyle={{ backgroundColor: boardTheme.light }}
              customDarkSquareStyle={{ backgroundColor: boardTheme.dark }}
              customSquareStyles={customSquareStyles}
              customPieces={customPieces}
              arePiecesDraggable={!gameOver && !thinking}
            />
          </div>

          {/* Your info */}
          <div style={styles.playerInfo}>
            <span style={styles.playerName}>You</span>
            <span style={styles.colorBadge}>({gameData.userColor})</span>
          </div>
        </div>

        {/* Right side - Sidebar */}
        <div style={styles.sidebar}>
          {/* Game status */}
          {gameOver && (
            <div style={styles.gameOverBanner}>
              <h3 style={styles.gameOverTitle}>Game Over</h3>
              <p style={styles.resultText}>
                {result === 'white' ? 'White wins!' : 
                 result === 'black' ? 'Black wins!' : 
                 'Draw!'}
              </p>
            </div>
          )}

          {/* Move history */}
          <div style={styles.moveHistorySection}>
            <h3 style={styles.sectionTitle}>Moves</h3>
            <div style={styles.moveList}>
              {formatMoves().map((pair) => (
                <div key={pair.number} style={styles.movePair}>
                  <span style={styles.moveNumber}>{pair.number}.</span>
                  <span style={styles.moveWhite}>{pair.white}</span>
                  <span style={styles.moveBlack}>{pair.black}</span>
                </div>
              ))}
              {moveHistory.length === 0 && (
                <p style={styles.noMoves}>No moves yet</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={styles.actions}>
            {!gameOver && (
              <button style={styles.resignButton} onClick={handleResign}>
                🏳️ Resign
              </button>
            )}
            {gameOver && (
              <button style={styles.analyzeButton} onClick={handleAnalyze}>
                📊 Analyze Game
              </button>
            )}
            <button style={styles.backButton} onClick={() => navigate('/bots')}>
              ← Back to Bots
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  loading: {
    color: '#fff',
    fontSize: '1.5rem',
    marginTop: '100px'
  },
  error: {
    color: '#fff',
    textAlign: 'center',
    marginTop: '100px'
  },
  gameArea: {
    display: 'flex',
    gap: '30px',
    maxWidth: '1000px',
    width: '100%'
  },
  boardSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  boardWrapper: {
    width: '500px',
    height: '500px'
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    backgroundColor: '#16213e',
    borderRadius: '8px',
    color: '#fff'
  },
  botEmoji: {
    fontSize: '1.5rem'
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  elo: {
    color: '#888',
    fontSize: '0.9rem'
  },
  colorBadge: {
    color: '#888',
    fontSize: '0.9rem'
  },
  thinkingIndicator: {
    marginLeft: 'auto',
    color: '#ffc107',
    animation: 'pulse 1s infinite'
  },
  sidebar: {
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  gameOverBanner: {
    backgroundColor: '#0f3460',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  gameOverTitle: {
    color: '#e94560',
    margin: '0 0 5px 0',
    fontSize: '1.3rem'
  },
  resultText: {
    color: '#fff',
    margin: 0,
    fontSize: '1.1rem'
  },
  moveHistorySection: {
    backgroundColor: '#16213e',
    borderRadius: '8px',
    padding: '15px',
    flex: 1,
    maxHeight: '350px',
    display: 'flex',
    flexDirection: 'column'
  },
  sectionTitle: {
    color: '#fff',
    margin: '0 0 10px 0',
    fontSize: '1rem',
    borderBottom: '1px solid #333',
    paddingBottom: '8px'
  },
  moveList: {
    overflowY: 'auto',
    flex: 1
  },
  movePair: {
    display: 'grid',
    gridTemplateColumns: '30px 1fr 1fr',
    gap: '5px',
    padding: '4px 0',
    color: '#ccc',
    fontSize: '0.95rem'
  },
  moveNumber: {
    color: '#888'
  },
  moveWhite: {
    color: '#fff'
  },
  moveBlack: {
    color: '#aaa'
  },
  noMoves: {
    color: '#666',
    fontStyle: 'italic',
    margin: 0
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  button: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  resignButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    backgroundColor: '#dc3545',
    color: '#fff'
  },
  analyzeButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    backgroundColor: '#28a745',
    color: '#fff'
  },
  backButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    backgroundColor: '#6c757d',
    color: '#fff'
  }
};

export default BotGame;
