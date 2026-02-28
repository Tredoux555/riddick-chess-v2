import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaHeart, FaClock, FaTrophy } from 'react-icons/fa';
import { chessComPieces, chessComBoardStyle } from '../utils/chessComPieces';

const PuzzleRush = () => {
  // Memoize pieces so they aren't recreated every render (fixes drag flying)
  const customPieces = useMemo(() => chessComPieces(), []);
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
  const [puzzleError, setPuzzleError] = useState(false);

  // Use refs to avoid stale closure issues
  const solutionsRef = useRef({});
  const currentIndexRef = useRef(0);
  const moveIndexRef = useRef(0);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const puzzlesRef = useRef([]);
  const isLoadingPuzzle = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadBestScore();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer effect for timed mode
  useEffect(() => {
    if (!gameStarted || gameOver || mode !== 'timed') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleEndGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
    setPuzzleError(false);
    isLoadingPuzzle.current = false;

    try {
      const response = await axios.post('/api/puzzles/rush/start', { mode: selectedMode });
      const fetchedPuzzles = response.data.puzzles;

      if (!fetchedPuzzles || fetchedPuzzles.length === 0) {
        toast.error('No puzzles available. Ask your admin to add puzzles!');
        return;
      }

      setPuzzles(fetchedPuzzles);
      puzzlesRef.current = fetchedPuzzles;

      // Load first valid puzzle - skip bad ones
      let loaded = false;
      let startIdx = 0;
      while (startIdx < fetchedPuzzles.length && startIdx < 10) {
        const success = await loadPuzzle(fetchedPuzzles[startIdx]);
        if (success) {
          currentIndexRef.current = startIdx;
          setCurrentIndex(startIdx);
          loaded = true;
          break;
        }
        startIdx++;
      }

      if (loaded) {
        setGameStarted(true);
      } else {
        toast.error('No valid puzzles available. Try again later!');
      }
    } catch (error) {
      console.error('Failed to start Puzzle Rush:', error);
      toast.error('Failed to start Puzzle Rush');
    }
  };

  const loadPuzzle = async (puzzleData) => {
    // Guard against concurrent loads
    if (isLoadingPuzzle.current) return false;
    isLoadingPuzzle.current = true;
    setReady(false);
    setPuzzleError(false);

    try {
      // Validate puzzle data
      if (!puzzleData || !puzzleData.fen || !puzzleData.id) {
        console.error('Invalid puzzle data:', puzzleData);
        isLoadingPuzzle.current = false;
        return false; // Return false - let advanceToNextPuzzle handle skipping
      }

      // Validate FEN
      let chess;
      try {
        chess = new Chess(puzzleData.fen);
      } catch (e) {
        console.error('Invalid FEN:', puzzleData.fen);
        isLoadingPuzzle.current = false;
        return false;
      }

      // Check it's not a starting position - just return false, don't recurse
      if (puzzleData.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        console.error('Puzzle has starting position FEN, skipping');
        isLoadingPuzzle.current = false;
        return false;
      }

      const firstMoveColor = chess.turn();
      const pColor = firstMoveColor === 'w' ? 'b' : 'w';
      setPlayerColor(pColor);
      setMoveIndex(0);
      moveIndexRef.current = 0;

      const response = await axios.get(`/api/puzzles/${puzzleData.id}/solution`);
      const moves = response.data.moves.split(' ').filter(m => m);

      if (!moves || moves.length < 2) {
        console.error('Not enough solution moves for puzzle:', puzzleData.id);
        isLoadingPuzzle.current = false;
        return false;
      }

      solutionsRef.current[puzzleData.id] = moves;

      // Make the first move (the opponent's setup move)
      const newGame = new Chess(chess.fen());
      try {
        const moveResult = newGame.move({
          from: moves[0].slice(0, 2),
          to: moves[0].slice(2, 4),
          promotion: moves[0][4] || undefined
        });
        if (!moveResult) {
          console.error('First move invalid:', moves[0]);
          isLoadingPuzzle.current = false;
          return false;
        }
        setGame(newGame);
        setMoveIndex(1);
        moveIndexRef.current = 1;
      } catch (e) {
        console.error('First move error:', e);
        isLoadingPuzzle.current = false;
        return false;
      }

      isLoadingPuzzle.current = false;
      setReady(true);
      return true;
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      isLoadingPuzzle.current = false;
      return false;
    }
  };

  const advanceToNextPuzzle = async () => {
    // Guard against rapid-fire advances
    if (isLoadingPuzzle.current || gameOverRef.current) return;

    let idx = currentIndexRef.current + 1;
    let attempts = 0;
    const maxSkips = 10; // Don't skip more than 10 bad puzzles in a row

    while (idx < puzzlesRef.current.length && attempts < maxSkips) {
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
      const success = await loadPuzzle(puzzlesRef.current[idx]);
      if (success) return; // Found a good puzzle
      idx++;
      attempts++;
    }

    // Either ran out of puzzles or too many bad ones
    if (!gameOverRef.current) {
      handleEndGame();
    }
  };

  const handleEndGame = async () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    setGameStarted(false);
    if (timerRef.current) clearInterval(timerRef.current);

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
    if (gameOverRef.current || !ready || isLoadingPuzzle.current) return false;

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
        toast.success(`Puzzle ${currentIndexRef.current + 1} solved!`, { duration: 1000, icon: '✅' });

        setTimeout(() => {
          advanceToNextPuzzle();
        }, 600);
      } else {
        // Make opponent's response move
        const nextMove = solution[mIdx + 1];
        if (nextMove) {
          setTimeout(() => {
            const oppGame = new Chess(newGame.fen());
            try {
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
            } catch (e) {
              console.error('Opponent move error:', e);
            }
          }, 250);
        }
      }
      return true;
    } else {
      // Wrong move
      toast.error('Incorrect!', { duration: 800 });
      
      if (mode === 'survival') {
        const newLives = livesRef.current - 1;
        setLives(newLives);
        livesRef.current = newLives;

        if (newLives <= 0) {
          handleEndGame();
          return false;
        }
      }
      // Move to next puzzle after a brief delay
      setTimeout(() => {
        advanceToNextPuzzle();
      }, 600);
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
            <FaClock style={{ marginRight: 8, fontSize: '1.2rem' }} />
            {formatTime(timeLeft)}
          </div>
        )}

        <div className="score-display">
          Score: <strong>{score}</strong>
        </div>
      </div>

      <div className="rush-board" style={{ maxWidth: '450px', margin: '0 auto' }}>
        {!ready && !puzzleError && (
          <div className="loading-puzzle">
            <div className="loading-spinner">⏳</div>
            <p>Loading puzzle...</p>
          </div>
        )}
        {puzzleError && (
          <div className="puzzle-error">
            <p>⚠️ Failed to load puzzle</p>
            <button className="btn btn-primary" onClick={() => {
              setPuzzleError(false);
              advanceToNextPuzzle();
            }}>Skip to Next</button>
          </div>
        )}
        <div style={{ opacity: ready ? 1 : 0.3, pointerEvents: ready ? 'auto' : 'none' }}>
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={playerColor === 'b' ? 'black' : 'white'}
            customPieces={customPieces}
            snapToCursor={true}
            arePiecesDraggable={ready && !gameOverRef.current}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
            }}
            customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
            customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
            animationDuration={200}
          />
        </div>
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
          display: flex;
          align-items: center;
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
        .loading-puzzle {
          text-align: center;
          padding: 40px;
          color: #c8c8dc;
        }
        .loading-spinner {
          font-size: 2rem;
          animation: bounce 1s infinite;
        }
        .puzzle-error {
          text-align: center;
          padding: 30px;
          color: #ef4444;
        }
        .puzzle-error button {
          margin-top: 12px;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default PuzzleRush;
