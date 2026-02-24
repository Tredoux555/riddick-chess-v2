import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

const DragDropExercise = ({ exercise, onComplete, attempts }) => {
  const [game, setGame] = useState(new Chess(exercise.fen));
  const [showHint, setShowHint] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const onDrop = (sourceSquare, targetSquare) => {
    const move = sourceSquare + targetSquare;
    const isCorrect = 
      move === exercise.solution || 
      move === exercise.solution.slice(0, 4) ||
      checkAlternativeSolutions(sourceSquare, targetSquare);
    
    if (isCorrect) {
      const gameCopy = new Chess(game.fen());
      try {
        gameCopy.move({ 
          from: sourceSquare, 
          to: targetSquare, 
          promotion: exercise.promotion || 'q' 
        });
        setGame(gameCopy);
        setAttempted(true);
        setTimeout(() => onComplete(true), 800);
        return true;
      } catch (e) {
        setAttempted(true);
        onComplete(false);
        return false;
      }
    } else {
      setAttempted(true);
      onComplete(false);
      return false;
    }
  };

  const checkAlternativeSolutions = (from, to) => {
    if (!exercise.alternatives) return false;
    const move = from + to;
    return exercise.alternatives.some(alt => 
      move === alt || move === alt.slice(0, 4)
    );
  };

  const currentHint = exercise.hints?.[Math.min(attempts, exercise.hints.length - 1)];

  const customSquareStyles = {};
  if (exercise.highlightFrom) {
    customSquareStyles[exercise.highlightFrom] = {
      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, transparent 70%)',
      boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)',
      animation: 'pulseGold 1.5s ease-in-out infinite'
    };
  }
  if (exercise.highlightTo) {
    customSquareStyles[exercise.highlightTo] = {
      background: 'radial-gradient(circle, rgba(52, 211, 153, 0.4) 0%, transparent 70%)',
      boxShadow: '0 0 20px rgba(52, 211, 153, 0.5)'
    };
  }

  return (
    <div className="exercise-container">
      <style jsx>{`
        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.6); }
          50% { box-shadow: 0 0 50px rgba(245, 158, 11, 0.9); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .exercise-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          animation: fadeInUp 0.6s ease-out;
        }
        .exercise-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .exercise-number {
          display: inline-block;
          background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #f59e0b 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
          position: relative;
          overflow: hidden;
        }
        .exercise-number::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 3s infinite;
        }
        .exercise-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #ffffff 0%, #b4b4c7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
          font-family: 'Outfit', sans-serif;
        }
        .instruction {
          color: var(--text-secondary);
          font-size: 1.15rem;
          line-height: 1.6;
        }
        .board-wrapper {
          position: relative;
          display: inline-block;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 0 80px rgba(239, 68, 68, 0.2);
          margin: 0 auto 2rem;
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(37, 37, 66, 0.6) 100%);
          backdrop-filter: blur(12px);
          padding: 1rem;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .board-wrapper:hover {
          box-shadow: 
            0 25px 70px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 0 120px rgba(239, 68, 68, 0.3);
          transform: translateY(-4px);
        }
        .drag-tip {
          text-align: center;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          color: var(--text-secondary);
          font-size: 0.95rem;
          backdrop-filter: blur(12px);
        }
        .drag-tip-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .hint-section {
          margin-top: 1.5rem;
          text-align: center;
        }
        .hint-btn {
          padding: 0.85rem 2rem;
          background: rgba(245, 158, 11, 0.1);
          border: 2px solid rgba(245, 158, 11, 0.3);
          border-radius: 50px;
          color: #fbbf24;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(12px);
        }
        .hint-btn:hover {
          background: rgba(245, 158, 11, 0.2);
          border-color: rgba(245, 158, 11, 0.6);
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
          transform: translateY(-2px);
        }
        .hint-text {
          margin-top: 1rem;
          padding: 1.25rem 1.75rem;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 16px;
          color: #fbbf24;
          font-size: 1rem;
          line-height: 1.6;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 30px rgba(245, 158, 11, 0.15);
          animation: fadeInUp 0.4s ease-out;
        }
        .explanation {
          margin-top: 1.5rem;
          padding: 1.25rem 1.75rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
          color: #34d399;
          font-size: 1rem;
          line-height: 1.6;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.15);
          animation: fadeInUp 0.4s ease-out;
        }
        @media (max-width: 640px) {
          .exercise-container { padding: 1rem; }
          .exercise-title { font-size: 1.5rem; }
          .instruction { font-size: 1rem; }
        }
      `}</style>

      <div className="exercise-header">
        <div className="exercise-number">
          <span>Exercise {exercise.num} of 3</span>
        </div>
        <h2 className="exercise-title">Make The Move</h2>
        <p className="instruction">{exercise.instruction}</p>
      </div>

      <div className="drag-tip">
        <div className="drag-tip-icon">🖱️</div>
        <div>Drag and drop the piece to make your move</div>
      </div>

      <div className="board-wrapper">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={Math.min(480, window.innerWidth - 80)}
          customSquareStyles={customSquareStyles}
          customBoardStyle={{
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        />
      </div>

      {attempts > 0 && currentHint && !showHint && (
        <div className="hint-section">
          <button className="hint-btn" onClick={() => setShowHint(true)}>
            💡 Need a hint?
          </button>
        </div>
      )}

      {showHint && currentHint && (
        <div className="hint-text">
          💡 {currentHint}
        </div>
      )}

      {exercise.explanation && attempted && (
        <div className="explanation">
          ✨ {exercise.explanation}
        </div>
      )}
    </div>
  );
};

export default DragDropExercise;
