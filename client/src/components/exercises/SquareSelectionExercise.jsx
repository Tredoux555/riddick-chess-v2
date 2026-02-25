import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';

/**
 * Square Selection Exercise - STUNNING VERSION
 * Chess.com pieces, premium gradients, glass morphism
 */
const SquareSelectionExercise = ({ exercise, onComplete, attempts }) => {
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSquareClick = (square) => {
    if (submitted) return;
    
    if (selectedSquares.includes(square)) {
      setSelectedSquares(prev => prev.filter(s => s !== square));
    } else {
      setSelectedSquares(prev => [...prev, square]);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correct = arraysEqual(
      selectedSquares.sort(),
      exercise.correctSquares.sort()
    );
    
    setTimeout(() => {
      onComplete(correct);
      setSubmitted(false);
      if (!correct) setSelectedSquares([]);
    }, 800);
  };

  const handleClear = () => setSelectedSquares([]);
  const currentHint = exercise.hints?.[Math.min(attempts, exercise.hints.length - 1)];

  // Custom square styles with STUNNING gradients
  const customSquareStyles = {};
  
  selectedSquares.forEach(sq => {
    customSquareStyles[sq] = {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.7) 0%, rgba(139, 92, 246, 0.7) 100%)',
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(139, 92, 246, 0.3)',
      border: '2px solid rgba(167, 139, 250, 0.8)',
      animation: 'pulseGlow 2s ease-in-out infinite'
    };
  });

  if (exercise.highlightPiece) {
    customSquareStyles[exercise.highlightPiece] = {
      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, transparent 70%)',
      boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)',
      animation: 'pulseGold 1.5s ease-in-out infinite'
    };
  }

  return (
    <div className="exercise-container">
      <style jsx>{`
        @keyframes pulseGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.6), inset 0 0 20px rgba(139, 92, 246, 0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(99, 102, 241, 0.9), inset 0 0 30px rgba(139, 92, 246, 0.5);
            transform: scale(1.05);
          }
        }

        @keyframes pulseGold {
          0%, 100% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.6); }
          50% { box-shadow: 0 0 50px rgba(245, 158, 11, 0.9); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeInUp 0.6s ease-out;
        }

        .exercise-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
        }

        .exercise-number {
          display: inline-block;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
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
            0 0 80px rgba(99, 102, 241, 0.2);
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
            0 0 120px rgba(99, 102, 241, 0.3);
          transform: translateY(-4px);
        }

        .stats-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(26, 26, 46, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 50px;
          backdrop-filter: blur(12px);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.3s ease;
        }

        .stat-badge:hover {
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 1.2rem;
        }

        .stat-value {
          background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .btn {
          padding: 1rem 2.5rem;
          border-radius: 50px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
          color: white;
          border: none;
          box-shadow: 
            0 8px 24px rgba(99, 102, 241, 0.4),
            0 0 40px rgba(99, 102, 241, 0.2);
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 
            0 12px 32px rgba(99, 102, 241, 0.6),
            0 0 60px rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgba(26, 26, 46, 0.6);
          color: var(--text-primary);
          border: 2px solid rgba(99, 102, 241, 0.25);
          backdrop-filter: blur(12px);
        }

        .btn-secondary:hover:not(:disabled) {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);
          transform: translateY(-2px);
        }

        .btn-secondary:disabled {
          opacity: 0.3;
          cursor: not-allowed;
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
          .exercise-container {
            padding: 1rem;
          }

          .exercise-title {
            font-size: 1.5rem;
          }

          .instruction {
            font-size: 1rem;
          }

          .stats-row {
            flex-direction: column;
            gap: 0.75rem;
          }

          .button-group {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="exercise-header">
        <div className="exercise-number">
          <span>Exercise {exercise.num} of 3</span>
        </div>
        <h2 className="exercise-title">Square Selection</h2>
        <p className="instruction">{exercise.instruction}</p>
      </div>

      <div className="board-wrapper">
        <Chessboard
          position={exercise.fen}
          boardWidth={Math.min(480, window.innerWidth - 80)}
          customSquareStyles={customSquareStyles}
          onSquareClick={handleSquareClick}
          arePiecesDraggable={false}
          customBoardStyle={{
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        />
      </div>

      <div className="stats-row">
        <div className="stat-badge">
          <span className="stat-icon">🎯</span>
          <span>
            <span className="stat-value">{selectedSquares.length}</span> selected
          </span>
        </div>
        {attempts > 0 && (
          <div className="stat-badge">
            <span className="stat-icon">🔄</span>
            <span>
              <span className="stat-value">{attempts}</span> {attempts === 1 ? 'attempt' : 'attempts'}
            </span>
          </div>
        )}
      </div>

      <div className="button-group">
        <button 
          className="btn btn-secondary" 
          onClick={handleClear}
          disabled={selectedSquares.length === 0}
        >
          Clear All
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit}
          disabled={selectedSquares.length === 0 || submitted}
        >
          {submitted ? '✨ Checking...' : '✓ Submit Answer'}
        </button>
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

      {exercise.explanation && submitted && (
        <div className="explanation">
          ✨ {exercise.explanation}
        </div>
      )}
    </div>
  );
};

const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
};

export default SquareSelectionExercise;
