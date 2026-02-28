import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaLightbulb, FaRedo, FaFire, FaCheck, FaTimes, FaStar } from 'react-icons/fa';
import { chessComPieces, chessComBoardStyle } from '../utils/chessComPieces';

const Puzzles = () => {
  if (typeof window !== 'undefined') window.PUZZLE_VERSION = 'v8-premium';
  // Memoize pieces so they aren't recreated every render (fixes drag flying)
  const memoizedPieces = useMemo(() => chessComPieces(), []);
  
  const [puzzle, setPuzzle] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [solution, setSolution] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hintSquare, setHintSquare] = useState(null);

  useEffect(() => { loadPuzzle(); }, []);

  const loadPuzzle = async () => {
    setLoading(true);
    setSolved(false);
    setFailed(false);
    setMoveIndex(0);
    setHintSquare(null);
    setSolution([]);

    try {
      const res = await axios.get('/api/puzzles/next');
      const puzzleData = res.data;
      setPuzzle(puzzleData);

      const solRes = await axios.get(`/api/puzzles/${puzzleData.id}/solution`);
      const moves = solRes.data.moves.split(' ').filter(m => m);
      setSolution(moves);

      const chess = new Chess(puzzleData.fen);

      // Play the opponent's setup move (moves[0]) automatically
      // In Lichess puzzle format, moves[0] is the opponent's last move that creates the tactic
      // The player then needs to find the correct response starting from moves[1]
      if (moves.length > 1 && moves[0]) {
        try {
          chess.move({
            from: moves[0].slice(0, 2),
            to: moves[0].slice(2, 4),
            promotion: moves[0][4] || undefined
          });
          setMoveIndex(1); // Player starts solving from move index 1
        } catch (e) {
          console.error('Failed to play setup move:', e);
        }
      }

      setGame(chess);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      toast.error('Failed to load puzzle');
      setLoading(false);
    }
  };

  function onDrop(sourceSquare, targetSquare) {
    if (solved || loading || !puzzle) return false;

    // Reset failed state when player tries again
    if (failed) setFailed(false);

    const move = sourceSquare + targetSquare;
    const expectedMove = solution[moveIndex];

    if (expectedMove && move === expectedMove.slice(0, 4)) {
      const newGame = new Chess(game.fen());
      const result = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (!result) return false;

      setGame(newGame);
      setHintSquare(null);
      
      if (moveIndex >= solution.length - 1) {
        setSolved(true);
        toast.success('Puzzle solved! 🎉');
      } else {
        setMoveIndex(prev => prev + 1);
        setTimeout(() => {
          const computerMove = solution[moveIndex + 1];
          if (computerMove) {
            const compGame = new Chess(newGame.fen());
            compGame.move({
              from: computerMove.slice(0, 2),
              to: computerMove.slice(2, 4),
              promotion: computerMove[4] || undefined
            });
            setGame(compGame);
            setMoveIndex(prev => prev + 1);
          }
        }, 400);
      }
      return true;
    } else {
      setFailed(true);
      toast.error('Incorrect!');
      return false;
    }
  }

  function showHint() {
    if (solution[moveIndex]) {
      setHintSquare(solution[moveIndex].slice(0, 2));
      toast('Look at the highlighted square', { icon: '💡' });
    }
  }

  const squareStyles = hintSquare ? {
    [hintSquare]: { backgroundColor: 'rgba(255, 255, 0, 0.6)' }
  } : {};

  if (loading && !puzzle) {
    return (
      <div className="puzzle-loading">
        <div className="loading-content">
          <div className="loading-emoji">🧩</div>
          <p>Loading puzzle...</p>
        </div>
        <style jsx>{`
          .puzzle-loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 80vh;
          }
          .loading-content { text-align: center; }
          .loading-emoji {
            font-size: 4rem;
            animation: bounce 1s infinite;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
        `}</style>
      </div>
    );
  }

  // Player's color is whoever's turn it is AFTER the setup move
  // (i.e., the current turn, since we already played the opponent's setup move)
  const orientation = game.turn() === 'w' ? 'white' : 'black';

  return (
    <div className="puzzles-page">
      <div className="puzzle-hero">
        <div className="hero-glow"></div>
        <h1 className="puzzle-title">
          <span className="title-icon">🧩</span>
          Daily Puzzles
        </h1>
        <p className="puzzle-subtitle">Sharpen your tactics with challenging puzzles</p>
      </div>

      <div className="puzzle-container">
        <div className="puzzle-board-section">
          <div className="turn-indicator">
            <span className={`turn-dot ${game.turn() === 'w' ? 'white' : 'black'}`}></span>
            {game.turn() === 'w' ? 'White' : 'Black'} to move
          </div>
          
          <div className="board-wrapper">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={orientation}
              customSquareStyles={squareStyles}
              arePiecesDraggable={!solved && !loading}
              isDraggablePiece={() => !solved && !loading}
              snapToCursor={true}
              customPieces={memoizedPieces}
              customDarkSquareStyle={{ backgroundColor: chessComBoardStyle.darkSquare }}
              customLightSquareStyle={{ backgroundColor: chessComBoardStyle.lightSquare }}
              animationDuration={200}
            />
          </div>

          {solved && (
            <div className="result-card success">
              <FaCheck /> Correct! Well done!
            </div>
          )}
          
          {failed && !solved && (
            <div className="result-card failed">
              <FaTimes /> Incorrect - Try again!
            </div>
          )}

          <div className="puzzle-actions">
            <button onClick={showHint} disabled={solved || failed} className="action-btn hint-btn">
              <FaLightbulb /> Hint
            </button>
            <button onClick={loadPuzzle} className="action-btn next-btn">
              <FaRedo /> {solved || failed ? 'Next Puzzle' : 'Skip'}
            </button>
          </div>
        </div>

        <div className="puzzle-info-section">
          {puzzle && (
            <div className="info-card">
              <div className="info-header">
                <FaStar className="star-icon" />
                <span>Puzzle Rating</span>
              </div>
              <div className="rating-display">{puzzle.rating}</div>
              <div className="rating-label">
                {puzzle.rating < 1200 ? 'Beginner' : 
                 puzzle.rating < 1600 ? 'Intermediate' :
                 puzzle.rating < 2000 ? 'Advanced' : 'Expert'}
              </div>
            </div>
          )}

          <Link to="/puzzle-rush" className="rush-card">
            <div className="rush-glow"></div>
            <FaFire className="rush-icon" />
            <div className="rush-title">Puzzle Rush</div>
            <div className="rush-desc">Solve as many as you can!</div>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .puzzles-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        .puzzle-hero {
          position: relative;
          text-align: center;
          padding: 40px 20px;
          margin-bottom: 30px;
        }
        .hero-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 200px;
          background: radial-gradient(ellipse, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .puzzle-title {
          font-size: 2.5rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          position: relative;
          z-index: 1;
        }
        .title-icon { font-size: 2.5rem; }
        .puzzle-subtitle {
          color: #e0e0ee;
          margin-top: 8px;
          position: relative;
          z-index: 1;
        }
        .puzzle-container {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 30px;
          align-items: start;
        }
        @media (max-width: 800px) {
          .puzzle-container { grid-template-columns: 1fr; }
        }
        .puzzle-board-section {
          background: rgba(30, 30, 50, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
        }
        .turn-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 16px;
          font-size: 1.1rem;
          color: #e0e0ee;
        }
        .turn-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid var(--border-color);
        }
        .turn-dot.white { background: #fff; }
        .turn-dot.black { background: #333; }
        .board-wrapper {
          max-width: 500px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        }
        .result-card {
          text-align: center;
          padding: 16px;
          border-radius: 12px;
          margin: 16px 0;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .result-card.success {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
        }
        .result-card.failed {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
        }
        .puzzle-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }
        .action-btn {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hint-btn {
          background: rgba(50, 50, 70, 0.8);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .hint-btn:hover:not(:disabled) {
          background: rgba(251, 191, 36, 0.2);
          transform: translateY(-2px);
        }
        .hint-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .next-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }
        .puzzle-info-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .info-card {
          background: rgba(30, 30, 50, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
        }
        .info-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #e0e0ee;
          margin-bottom: 12px;
        }
        .star-icon { color: #fbbf24; }
        .rating-display {
          font-size: 3rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .rating-label {
          color: #c8c8dc;
          font-size: 0.9rem;
          margin-top: 4px;
        }
        .rush-card {
          position: relative;
          display: block;
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%);
          border: 1px solid rgba(249, 115, 22, 0.3);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          text-decoration: none;
          color: white;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .rush-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 40px rgba(249, 115, 22, 0.2);
          border-color: rgba(249, 115, 22, 0.5);
        }
        .rush-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%);
          pointer-events: none;
        }
        .rush-icon {
          font-size: 2.5rem;
          color: #f97316;
          margin-bottom: 8px;
          position: relative;
          z-index: 1;
        }
        .rush-title {
          font-size: 1.25rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          position: relative;
          z-index: 1;
        }
        .rush-desc {
          color: #e0e0ee;
          font-size: 0.9rem;
          margin-top: 4px;
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default Puzzles;
