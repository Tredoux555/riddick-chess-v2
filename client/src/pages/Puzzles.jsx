import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaLightbulb, FaRedo, FaFire, FaCheck, FaTimes } from 'react-icons/fa';
import { chessComPieces, chessComBoardStyle } from '../utils/chessComPieces';

// Build: 2025-12-26-v4-final

const Puzzles = () => {
  // Debug marker - check window.PUZZLE_VERSION in console
  if (typeof window !== 'undefined') window.PUZZLE_VERSION = 'v7';
  
  const [puzzle, setPuzzle] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [solution, setSolution] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hintSquare, setHintSquare] = useState(null);

  useEffect(() => {
    loadPuzzle();
  }, []);

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
      setGame(chess);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load puzzle:', error);
      toast.error('Failed to load puzzle');
      setLoading(false);
    }
  };

  function onDrop(sourceSquare, targetSquare) {
    console.log('🎯 PUZZLE V6 onDrop:', sourceSquare, targetSquare);
    if (solved || failed || loading || !puzzle) return false;

    const move = sourceSquare + targetSquare;
    const expectedMove = solution[moveIndex];
    
    console.log('Move:', move, 'Expected:', expectedMove);

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
        const nextIndex = moveIndex + 1;
        setMoveIndex(nextIndex);
        
        setTimeout(() => {
          const oppMove = solution[nextIndex];
          if (oppMove) {
            const oppGame = new Chess(newGame.fen());
            oppGame.move({
              from: oppMove.slice(0, 2),
              to: oppMove.slice(2, 4),
              promotion: oppMove[4] || 'q'
            });
            setGame(oppGame);
            setMoveIndex(nextIndex + 1);
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>🧩</div>
          <p>Loading puzzle...</p>
        </div>
      </div>
    );
  }

  const orientation = game.turn() === 'w' ? 'white' : 'black';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#fff', textAlign: 'center' }}>♟️ Puzzles v7</h1>
      
      <div style={{ textAlign: 'center', marginBottom: '10px', color: '#aaa' }}>
        {game.turn() === 'w' ? 'White' : 'Black'} to move
        {puzzle && <span> • Rating: {puzzle.rating}</span>}
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardOrientation={orientation}
          customSquareStyles={squareStyles}
          arePiecesDraggable={true}
          isDraggablePiece={() => true}
          customPieces={chessComPieces()}
          customDarkSquareStyle={{ backgroundColor: chessComBoardStyle.darkSquare }}
          customLightSquareStyle={{ backgroundColor: chessComBoardStyle.lightSquare }}
        />
      </div>

      {solved && (
        <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '8px', margin: '15px 0', color: '#10b981' }}>
          <FaCheck /> Correct!
        </div>
      )}
      
      {failed && (
        <div style={{ textAlign: 'center', padding: '15px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', margin: '15px 0', color: '#ef4444' }}>
          <FaTimes /> Incorrect
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
        <button 
          onClick={showHint}
          disabled={solved || failed}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#444', color: '#fff', cursor: 'pointer' }}
        >
          <FaLightbulb /> Hint
        </button>
        <button 
          onClick={loadPuzzle}
          style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#769656', color: '#fff', cursor: 'pointer' }}
        >
          <FaRedo /> {solved || failed ? 'Next' : 'Skip'}
        </button>
      </div>

      <Link to="/puzzle-rush" style={{ display: 'block', textAlign: 'center', marginTop: '30px', padding: '15px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '8px', color: '#fff', textDecoration: 'none' }}>
        <FaFire /> Puzzle Rush - Solve as many as you can!
      </Link>
    </div>
  );
};

export default Puzzles;
// Cache bust: 1766724523
// Build 1766728276
