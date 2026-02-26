import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaHeart, FaClock, FaTrophy } from 'react-icons/fa';
import { chessComPieces, chessComBoardStyle } from '../utils/chessComPieces';

const PuzzleRush = () => {
  const customPieces = chessComPieces();
  const currentTheme = chessComBoardStyle;
  const [mode, setMode] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [puzzles, setPuzzles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('w');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(300);
  const [moveIndex, setMoveIndex] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [ready, setReady] = useState(false);

  // Use refs to avoid stale closure issues
  const solutionsRef = useRef({});
  const currentIndexRef = useRef(0);
  const moveIndexRef = useRef(0);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const puzzlesRef = useRef([]);

  useEffect(() => {
    loadBestScore();
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver || mode !== 'timed') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleEndGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    scoreRef.current = 0;
    const startLives = selectedMode === 'survival' ? 3 : Infinity;
    setLives(startLives);
    livesRef.current = startLives;
    setTimeLeft(300);
    setGameOver(false);
    gameOverRef.current = false;
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setMoveIndex(0);
    moveIndexRef.current = 0;
    solutionsRef.current = {};
    setReady(false);

    try {
      const response = await axios.post('/api/puzzles/rush/start', { mode: selectedMode });
      const fetchedPuzzles = response.data.puzzles;
      setPuzzles(fetchedPuzzles);
      puzzlesRef.current = fetchedPuzzles;

      if (fetchedPuzzles.length > 0) {
        await loadPuzzle(fetchedPuzzles[0]);
      }

      setGameStarted(true);
    } catch (error) {
      toast.error('Failed to start Puzzle Rush');
    }
  };

  const loadPuzzle = async (puzzleData) => {
    setReady(false);
    const chess = new Chess(puzzleData.fen);

    const firstMoveColor = chess.turn();
    const pColor = firstMoveColor === 'w' ? 'b' : 'w';
    setPlayerColor(pColor);
    setMoveIndex(0);
    moveIndexRef.current = 0;

    try {
      const response = await axios.get(`/api/puzzles/${puzzleData.id}/solution`);
      const moves = response.data.moves.split(' ').filter(m => m);
      solutionsRef.current[puzzleData.id] = moves;

      // Make the first move (the opponent's setup move)
      if (moves[0]) {
        const newGame = new Chess(chess.fen());
        newGame.move({
          from: moves[0].slice(0, 2),
          to: moves[0].slice(2, 4),
          promotion: moves[0][4] || undefined
        });
        setGame(newGame);
        setMoveIndex(1);
        moveIndexRef.current = 1;
      } else {
        setGame(chess);
      }
      setReady(true);
    } catch (error) {
      console.error('Failed to get solution:', error);
      // Skip to next puzzle on error
      advanceToNextPuzzle();
    }
  };

  const advanceToNextPuzzle = () => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx < puzzlesRef.current.length) {
      setCurrentIndex(nextIdx);
      currentIndexRef.current = nextIdx;
      loadPuzzle(puzzlesRef.current[nextIdx]);
    } else {
      handleEndGame();
    }
  };

  const handleEndGame = async () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    setGameStarted(false);

    try {
      const finalScore = scoreRef.current;
      await axios.post('/api/puzzles/rush/end', { score: finalScore });
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        toast.success('New personal best! 🎉');
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (gameOverRef.current || !ready) return false;

    const currentPuzzle = puzzlesRef.current[currentIndexRef.current];
    if (!currentPuzzle) return false;

    const solution = solutionsRef.current[currentPuzzle.id];
    if (!solution) return false;

    const mIdx = moveIndexRef.current;
    const expectedMove = solution[mIdx];
    if (!expectedMove) return false;

    const userMove = sourceSquare + targetSquare + (piece?.[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1') ? 'q' : '');

    if (userMove === expectedMove || userMove.slice(0, 4) === expectedMove.slice(0, 4)) {
      // Correct move
      const newGame = new Chess(game.fen());
      const result = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: userMove[4] || undefined
      });
      if (!result) return false;
      setGame(newGame);

      // Check if puzzle is complete
      if (mIdx + 1 >= solution.length - 1) {
        // Puzzle solved!
        const newScore = scoreRef.current + 1;
        setScore(newScore);
        scoreRef.current = newScore;

        setTimeout(() => {
          advanceToNextPuzzle();
        }, 500);
      } else {
        // Make opponent's response move
        const nextMove = solution[mIdx + 1];
        if (nextMove) {
          setTimeout(() => {
            const oppGame = new Chess(newGame.fen());
            const oppResult = oppGame.move({
              from: nextMove.slice(0, 2),
              to: nextMove.slice(2, 4),
              promotion: nextMove[4] || undefined
            });
            if (oppResult) {
              setGame(oppGame);
              const newMoveIdx = mIdx + 2;
              setMoveIndex(newMoveIdx);
              moveIndexRef.current = newMoveIdx;
            }
          }, 200);
        }
      }
      return true;
    } else {
      // Wrong move
      if (mode === 'survival') {
        const newLives = livesRef.current - 1;
        setLives(newLives);
        livesRef.current = newLives;

        if (newLives <= 0) {
          handleEndGame();
          return false;
        }
      }
      // Move to next puzzle
      setTimeout(() => {
        advanceToNextPuzzle();
      }, 500);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, mode, ready]);

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
            color: #e0e0ee;
          }
          .mode-hint {
            font-size: 0.85rem;
            margin-top: 16px;
            color: #c8c8dc;
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
          {score >= bestScore && score > 0 && (
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
            color: #c8c8dc;
            font-size: 1.1rem;
          }
          .score-value {
            font-size: 5rem;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
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
          snapToCursor={true}
          arePiecesDraggable={ready}
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
          color: #c8c8dc;
          opacity: 0.3;
        }
        .life.active {
          color: var(--accent-danger);
          opacity: 1;
        }
        .timer {
          font-size: 2rem;
          font-weight: 700;
          font-family: 'Outfit', monospace;
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
          color: #c8c8dc;
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
