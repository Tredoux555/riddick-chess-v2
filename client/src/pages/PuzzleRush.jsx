import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaHeart, FaClock, FaTrophy } from 'react-icons/fa';
import { useBoardSettings } from '../contexts/BoardSettingsContext';

const PuzzleRush = () => {
  const { customPieces, currentTheme } = useBoardSettings();
  const [mode, setMode] = useState(null); // 'survival' or 'timed'
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [puzzles, setPuzzles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('w');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [moveIndex, setMoveIndex] = useState(0);
  const [solutions, setSolutions] = useState({});
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    loadBestScore();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gameStarted || gameOver || mode !== 'timed') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameOver, mode]);

  const loadBestScore = async () => {
    try {
      const response = await axios.get('/api/puzzles/stats');
      setBestScore(response.data.puzzle_rush_best || 0);
    } catch (error) {
      console.error('Failed to load best score:', error);
    }
  };

  const startGame = async (selectedMode) => {
    setMode(selectedMode);
    setScore(0);
    setLives(selectedMode === 'survival' ? 3 : Infinity);
    setTimeLeft(300);
    setGameOver(false);
    setCurrentIndex(0);
    setMoveIndex(0);

    try {
      const response = await axios.post('/api/puzzles/rush/start', { mode: selectedMode });
      setPuzzles(response.data.puzzles);
      
      if (response.data.puzzles.length > 0) {
        loadPuzzle(response.data.puzzles[0]);
      }
      
      setGameStarted(true);
    } catch (error) {
      toast.error('Failed to start Puzzle Rush');
    }
  };

  const loadPuzzle = async (puzzleData) => {
    const chess = new Chess(puzzleData.fen);
    setGame(chess);
    
    const firstMoveColor = chess.turn();
    setPlayerColor(firstMoveColor === 'w' ? 'b' : 'w');
    setMoveIndex(0);

    // Get solution if we don't have it
    if (!solutions[puzzleData.id]) {
      try {
        const response = await axios.get(`/api/puzzles/${puzzleData.id}/solution`);
        setSolutions(prev => ({
          ...prev,
          [puzzleData.id]: response.data.moves.split(' ')
        }));

        // Make first move
        setTimeout(() => {
          const moves = response.data.moves.split(' ');
          if (moves[0]) {
            const newGame = new Chess(chess.fen());
            newGame.move({
              from: moves[0].slice(0, 2),
              to: moves[0].slice(2, 4),
              promotion: moves[0][4] || undefined
            });
            setGame(newGame);
            setMoveIndex(1);
          }
        }, 300);
      } catch (error) {
        console.error('Failed to get solution:', error);
      }
    }
  };

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (gameOver || !gameStarted) return false;
    if (game.turn() !== playerColor) return false;

    const currentPuzzle = puzzles[currentIndex];
    const solution = solutions[currentPuzzle.id];
    
    if (!solution) return false;

    const expectedMove = solution[moveIndex];
    const userMove = sourceSquare + targetSquare + (piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : '');

    if (userMove === expectedMove || userMove.slice(0, 4) === expectedMove?.slice(0, 4)) {
      // Correct move
      const newGame = new Chess(game.fen());
      newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: userMove[4] || undefined
      });
      setGame(newGame);

      // Check if puzzle is complete
      if (moveIndex + 1 >= solution.length - 1) {
        // Puzzle solved!
        setScore(prev => prev + 1);
        
        // Move to next puzzle
        if (currentIndex + 1 < puzzles.length) {
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            loadPuzzle(puzzles[currentIndex + 1]);
          }, 500);
        } else {
          // No more puzzles
          endGame();
        }
      } else {
        // Make opponent's move
        const nextMove = solution[moveIndex + 1];
        setTimeout(() => {
          const oppGame = new Chess(newGame.fen());
          oppGame.move({
            from: nextMove.slice(0, 2),
            to: nextMove.slice(2, 4),
            promotion: nextMove[4] || undefined
          });
          setGame(oppGame);
          setMoveIndex(prev => prev + 2);
        }, 200);
      }
      return true;
    } else {
      // Wrong move
      if (mode === 'survival') {
        const newLives = lives - 1;
        setLives(newLives);
        
        if (newLives <= 0) {
          endGame();
        } else {
          // Move to next puzzle
          if (currentIndex + 1 < puzzles.length) {
            setTimeout(() => {
              setCurrentIndex(prev => prev + 1);
              loadPuzzle(puzzles[currentIndex + 1]);
            }, 500);
          } else {
            endGame();
          }
        }
      } else {
        // Timed mode - just move to next puzzle
        if (currentIndex + 1 < puzzles.length) {
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1);
            loadPuzzle(puzzles[currentIndex + 1]);
          }, 500);
        } else {
          endGame();
        }
      }
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameOver, gameStarted, playerColor, puzzles, currentIndex, solutions, moveIndex, lives, mode]);

  const endGame = async () => {
    setGameOver(true);
    setGameStarted(false);

    try {
      await axios.post('/api/puzzles/rush/end', { score });
      if (score > bestScore) {
        setBestScore(score);
        toast.success('New personal best! 🎉');
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mode selection screen
  if (!gameStarted && !gameOver) {
    return (
      <div className="puzzle-rush-page">
        <div className="page-header">
          <h1 className="page-title">🔥 Puzzle Rush</h1>
          <p className="page-subtitle">Solve as many puzzles as you can!</p>
        </div>

        <div className="mode-selection">
          <div className="mode-card" onClick={() => startGame('survival')}>
            <div className="mode-icon"><FaHeart /></div>
            <h2>Survival</h2>
            <p>3 lives. One wrong move costs a life.</p>
            <p className="mode-hint">Best for: Accuracy practice</p>
          </div>

          <div className="mode-card" onClick={() => startGame('timed')}>
            <div className="mode-icon"><FaClock /></div>
            <h2>5 Minutes</h2>
            <p>Race against the clock. Wrong moves skip the puzzle.</p>
            <p className="mode-hint">Best for: Speed practice</p>
          </div>
        </div>

        {bestScore > 0 && (
          <div className="best-score">
            <FaTrophy /> Personal Best: {bestScore}
          </div>
        )}

        <style jsx>{`
          .puzzle-rush-page {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
          }
          .mode-selection {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin: 40px 0;
          }
          .mode-card {
            background: var(--bg-card);
            border: 2px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 40px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .mode-card:hover {
            border-color: var(--accent-primary);
            transform: translateY(-4px);
          }
          .mode-icon {
            font-size: 3rem;
            margin-bottom: 16px;
            color: var(--accent-primary);
          }
          .mode-card h2 {
            margin-bottom: 12px;
          }
          .mode-card p {
            color: var(--text-secondary);
          }
          .mode-hint {
            font-size: 0.85rem;
            margin-top: 16px;
            color: var(--text-muted);
          }
          .best-score {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 1.25rem;
            color: var(--accent-warning);
          }
        `}</style>
      </div>
    );
  }

  // Game over screen
  if (gameOver) {
    return (
      <div className="puzzle-rush-page">
        <div className="game-over-screen">
          <h1>Game Over!</h1>
          <div className="final-score">
            <span className="score-label">Score</span>
            <span className="score-value">{score}</span>
          </div>
          {score > bestScore - 1 && score === bestScore && (
            <div className="new-best">🎉 New Personal Best!</div>
          )}
          <div className="game-over-actions">
            <button className="btn btn-primary btn-lg" onClick={() => startGame(mode)}>
              Play Again
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => {
              setGameOver(false);
              setGameStarted(false);
            }}>
              Change Mode
            </button>
          </div>
        </div>

        <style jsx>{`
          .puzzle-rush-page {
            max-width: 600px;
            margin: 0 auto;
          }
          .game-over-screen {
            text-align: center;
            padding: 60px 40px;
            background: var(--bg-card);
            border-radius: var(--radius-lg);
          }
          .game-over-screen h1 {
            font-size: 2.5rem;
            margin-bottom: 32px;
          }
          .final-score {
            display: flex;
            flex-direction: column;
            margin-bottom: 24px;
          }
          .score-label {
            color: var(--text-muted);
            font-size: 1.1rem;
          }
          .score-value {
            font-size: 5rem;
            font-weight: 700;
            font-family: 'Space Grotesk', sans-serif;
            color: var(--accent-primary);
          }
          .new-best {
            font-size: 1.5rem;
            color: var(--accent-warning);
            margin-bottom: 32px;
          }
          .game-over-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
          }
        `}</style>
      </div>
    );
  }

  // Game screen
  const currentPuzzle = puzzles[currentIndex];

  return (
    <div className="puzzle-rush-game">
      <div className="rush-header">
        {mode === 'survival' ? (
          <div className="lives">
            {[1, 2, 3].map(i => (
              <FaHeart key={i} className={`life ${i <= lives ? 'active' : ''}`} />
            ))}
          </div>
        ) : (
          <div className={`timer ${timeLeft < 30 ? 'low' : ''}`}>
            {formatTime(timeLeft)}
          </div>
        )}
        
        <div className="score-display">
          Score: <strong>{score}</strong>
        </div>
      </div>

      <div className="rush-board" style={{ maxWidth: '450px', margin: '0 auto' }}>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardOrientation={playerColor === 'b' ? 'black' : 'white'}
          customPieces={customPieces}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
          }}
          customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
          customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
          animationDuration={100}
        />
      </div>

      <div className="puzzle-counter">
        Puzzle {currentIndex + 1} • Rating: {currentPuzzle?.rating || '—'}
      </div>

      <style jsx>{`
        .puzzle-rush-game {
          max-width: 600px;
          margin: 0 auto;
        }
        .rush-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 16px 24px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
        }
        .lives {
          display: flex;
          gap: 8px;
          font-size: 1.5rem;
        }
        .life {
          color: var(--text-muted);
          opacity: 0.3;
        }
        .life.active {
          color: var(--accent-danger);
          opacity: 1;
        }
        .timer {
          font-size: 2rem;
          font-weight: 700;
          font-family: 'Space Grotesk', monospace;
        }
        .timer.low {
          color: var(--accent-danger);
          animation: pulse 1s infinite;
        }
        .score-display {
          font-size: 1.25rem;
        }
        .score-display strong {
          font-size: 1.5rem;
          color: var(--accent-primary);
        }
        .puzzle-counter {
          text-align: center;
          margin-top: 16px;
          color: var(--text-muted);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default PuzzleRush;
