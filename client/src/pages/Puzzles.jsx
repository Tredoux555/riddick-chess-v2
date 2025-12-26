import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaLightbulb, FaRedo, FaFire, FaCheck, FaTimes } from 'react-icons/fa';
import { useBoardSettings } from '../contexts/BoardSettingsContext';

const Puzzles = () => {
  const { customPieces, currentTheme } = useBoardSettings();
  const [puzzle, setPuzzle] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('w');
  const [moveIndex, setMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [hintSquare, setHintSquare] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadPuzzle();
    loadStats();
  }, []);

  const loadPuzzle = async () => {
    setLoading(true);
    setSolved(false);
    setFailed(false);
    setMoveIndex(0);
    setShowHint(false);
    setHintSquare(null);

    try {
      const response = await axios.get('/api/puzzles/next');
      const puzzleData = response.data;
      console.log('Puzzle loaded:', puzzleData);
      setPuzzle(puzzleData);

      const chess = new Chess(puzzleData.fen);
      setGame(chess);
      
      // Player plays whoever's turn it is in the position
      const currentTurn = chess.turn();
      console.log('Current turn:', currentTurn);
      setPlayerColor(currentTurn);
      
      // For puzzles with setup moves (opponent moves first), make that move
      // For direct puzzles (like mate-in-1), player moves immediately
      if (puzzleData.movesCount && puzzleData.movesCount > 1) {
        // Has setup move - make opponent's first move
        setTimeout(() => {
          makeOpponentMove(chess, puzzleData.id, 0);
        }, 500);
      } else {
        // Direct puzzle - player moves first, moveIndex starts at 0
        setMoveIndex(0);
      }

      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      toast.error('Failed to load puzzle');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/puzzles/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const makeOpponentMove = async (chess, puzzleId, currentMoveIndex) => {
    try {
      const response = await axios.get(`/api/puzzles/${puzzleId}/solution`);
      const moves = response.data.moves.split(' ');
      
      if (currentMoveIndex < moves.length) {
        const moveUci = moves[currentMoveIndex];
        const move = chess.move({
          from: moveUci.slice(0, 2),
          to: moveUci.slice(2, 4),
          promotion: moveUci[4] || undefined
        });
        
        if (move) {
          setGame(new Chess(chess.fen()));
          setMoveIndex(currentMoveIndex + 1);
        }
      }
    } catch (error) {
      console.error('Failed to get solution:', error);
    }
  };

  const onDrop = useCallback(async (sourceSquare, targetSquare, piece) => {
    console.log('onDrop called:', { sourceSquare, targetSquare, piece, solved, failed, loading, turn: game.turn(), playerColor });
    
    if (solved || failed || loading) {
      console.log('Blocked: solved/failed/loading');
      return false;
    }
    if (game.turn() !== playerColor) {
      console.log('Blocked: not your turn', game.turn(), playerColor);
      return false;
    }

    const move = sourceSquare + targetSquare + (piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : '');

    try {
      const response = await axios.post(`/api/puzzles/${puzzle.id}/move`, {
        move,
        moveIndex
      });

      if (response.data.correct) {
        // Make the move on the board
        const newGame = new Chess(game.fen());
        newGame.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: move[4] || undefined
        });
        setGame(newGame);

        if (response.data.completed) {
          // Puzzle solved!
          setSolved(true);
          const timeTaken = Math.floor((Date.now() - startTime) / 1000);
          
          await axios.post(`/api/puzzles/${puzzle.id}/complete`, {
            solved: true,
            timeTaken
          });
          
          toast.success('Correct! 🎉');
          loadStats();
        } else {
          // Make opponent's response
          if (response.data.opponentMove) {
            setTimeout(() => {
              const oppGame = new Chess(newGame.fen());
              oppGame.move({
                from: response.data.opponentMove.uci.slice(0, 2),
                to: response.data.opponentMove.uci.slice(2, 4),
                promotion: response.data.opponentMove.uci[4] || undefined
              });
              setGame(oppGame);
              setMoveIndex(prev => prev + 2);
            }, 300);
          }
        }
        return true;
      } else {
        // Wrong move
        setFailed(true);
        
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        await axios.post(`/api/puzzles/${puzzle.id}/complete`, {
          solved: false,
          timeTaken
        });
        
        // Show hint
        if (response.data.hint) {
          setHintSquare(response.data.hint.from);
        }
        
        toast.error('Incorrect. Try the next puzzle!');
        loadStats();
        return false;
      }
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  }, [game, puzzle, playerColor, moveIndex, solved, failed, loading, startTime]);

  const handleHint = async () => {
    if (showHint || !puzzle) return;
    
    try {
      // Get hint from solution directly
      const solutionRes = await axios.get(`/api/puzzles/${puzzle.id}/solution`);
      const moves = solutionRes.data.moves.split(' ');
      const currentMove = moves[moveIndex];
      
      if (currentMove) {
        setHintSquare(currentMove.slice(0, 2));
        setShowHint(true);
        toast('Hint: Look at the highlighted square', { icon: '💡' });
      }
    } catch (error) {
      console.error('Failed to get hint:', error);
      toast.error('Could not load hint');
    }
  };

  const customSquareStyles = {};
  if (hintSquare) {
    customSquareStyles[hintSquare] = {
      backgroundColor: 'rgba(255, 255, 0, 0.5)'
    };
  }

  if (loading && !puzzle) {
    return (
      <div className="loading-screen">
        <div className="chess-loader">
          <div className="piece">🧩</div>
          <p>Loading puzzle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="puzzles-page">
      <div className="page-header">
        <h1 className="page-title">Puzzles</h1>
        <p className="page-subtitle">Improve your tactics one puzzle at a time</p>
      </div>

      <div className="puzzle-container">
        <div className="board-section">
          <div className="puzzle-turn-indicator">
            {playerColor === 'w' ? 'White' : 'Black'} to move
          </div>
          
          <div className="board-container" style={{ maxWidth: '500px' }}>
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={playerColor === 'b' ? 'black' : 'white'}
              arePiecesDraggable={!solved && !failed && !loading}
              customPieces={customPieces}
              customSquareStyles={customSquareStyles}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
              }}
              customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
              customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
            />
          </div>

          {/* Status indicator */}
          {solved && (
            <div className="puzzle-status success">
              <FaCheck /> Correct!
            </div>
          )}
          {failed && (
            <div className="puzzle-status failed">
              <FaTimes /> Incorrect
            </div>
          )}

          <div className="puzzle-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleHint}
              disabled={showHint || solved || failed}
            >
              <FaLightbulb /> Hint
            </button>
            <button 
              className="btn btn-primary"
              onClick={loadPuzzle}
            >
              <FaRedo /> {solved || failed ? 'Next Puzzle' : 'Skip'}
            </button>
          </div>
        </div>

        <div className="puzzle-sidebar">
          <div className="puzzle-info card">
            <h3>Puzzle Rating</h3>
            <div className="puzzle-rating">{puzzle?.rating || '—'}</div>
            
            {puzzle?.themes && (
              <>
                <h4>Themes</h4>
                <div className="puzzle-themes">
                  {(Array.isArray(puzzle.themes) ? puzzle.themes : (puzzle.themes || '').split(',')).filter(t => t).map(theme => (
                    <span key={theme} className="theme-tag">{theme.trim()}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {stats && (
            <div className="card">
              <h3>Your Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{stats.rating || 1500}</div>
                  <div className="stat-label">Rating</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.puzzles_solved || 0}</div>
                  <div className="stat-label">Solved</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.current_streak || 0}</div>
                  <div className="stat-label">Streak</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{stats.best_streak || 0}</div>
                  <div className="stat-label">Best</div>
                </div>
              </div>
            </div>
          )}

          <Link to="/puzzle-rush" className="puzzle-rush-card">
            <FaFire className="fire-icon" />
            <div>
              <h3>Puzzle Rush</h3>
              <p>Solve as many as you can!</p>
            </div>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .puzzles-page {
          max-width: 1000px;
          margin: 0 auto;
        }
        .board-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .puzzle-turn-indicator {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .puzzle-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 1.1rem;
        }
        .puzzle-status.success {
          background: rgba(16, 185, 129, 0.2);
          color: var(--accent-success);
        }
        .puzzle-status.failed {
          background: rgba(239, 68, 68, 0.2);
          color: var(--accent-danger);
        }
        .puzzle-actions {
          display: flex;
          gap: 12px;
        }
        .puzzle-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .puzzle-info {
          text-align: center;
        }
        .puzzle-info h3 {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 8px;
        }
        .puzzle-info h4 {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin: 16px 0 8px;
        }
        .puzzle-rating {
          font-size: 2.5rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 16px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .stat-label {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .puzzle-rush-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          border-radius: var(--radius-lg);
          color: white;
          transition: transform 0.2s;
        }
        .puzzle-rush-card:hover {
          transform: scale(1.02);
        }
        .puzzle-rush-card .fire-icon {
          font-size: 2rem;
        }
        .puzzle-rush-card h3 {
          margin: 0;
        }
        .puzzle-rush-card p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

export default Puzzles;
