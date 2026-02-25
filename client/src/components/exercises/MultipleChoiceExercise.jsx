import React, { useState } from 'react';

const MultipleChoiceExercise = ({ exercise, onComplete, attempts }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleOptionClick = (index) => {
    if (submitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setSubmitted(true);
    const correct = selectedOption === exercise.correct;
    setTimeout(() => {
      onComplete(correct);
      setSubmitted(false);
      if (!correct) setSelectedOption(null);
    }, 800);
  };

  const currentHint = exercise.hints?.[Math.min(attempts, exercise.hints.length - 1)];

  return (
    <div className="exercise-container">
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes pulseOption {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
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
          margin-bottom: 2.5rem;
        }
        .exercise-number {
          display: inline-block;
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 1rem;
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
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
          margin-bottom: 1rem;
          font-family: 'Outfit', sans-serif;
        }
        .question {
          font-size: 1.3rem;
          color: var(--text-primary);
          line-height: 1.6;
          font-weight: 500;
        }
        .options-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .option {
          padding: 1.5rem 2rem;
          background: rgba(26, 26, 46, 0.6);
          border: 2px solid rgba(99, 102, 241, 0.15);
          border-radius: 16px;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          color: var(--text-primary);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }
        .option::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .option:hover:not(:disabled)::before {
          opacity: 1;
        }
        .option:hover:not(:disabled) {
          border-color: rgba(99, 102, 241, 0.4);
          transform: translateX(8px);
          box-shadow: 
            0 8px 24px rgba(99, 102, 241, 0.2),
            0 0 40px rgba(99, 102, 241, 0.1);
        }
        .option.selected {
          border-color: rgba(99, 102, 241, 0.8);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
          box-shadow: 
            0 8px 24px rgba(99, 102, 241, 0.3),
            0 0 40px rgba(99, 102, 241, 0.2),
            inset 0 0 30px rgba(99, 102, 241, 0.1);
          animation: pulseOption 2s ease-in-out infinite;
        }
        .option.selected::after {
          content: '✓';
          position: absolute;
          right: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.5rem;
          color: #a78bfa;
        }
        .option:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        .button-wrapper {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .btn-submit {
          padding: 1rem 3rem;
          background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%);
          border: none;
          border-radius: 50px;
          color: white;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 
            0 8px 24px rgba(139, 92, 246, 0.4),
            0 0 40px rgba(139, 92, 246, 0.2);
          position: relative;
          overflow: hidden;
        }
        .btn-submit::before {
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
        .btn-submit:hover::before {
          width: 300px;
          height: 300px;
        }
        .btn-submit:hover:not(:disabled) {
          box-shadow: 
            0 12px 32px rgba(139, 92, 246, 0.6),
            0 0 60px rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }
        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-submit:disabled {
          opacity: 0.5;
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
          color: var(--accent-success, #10b981);
          font-size: 1rem;
          line-height: 1.6;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.15);
          animation: fadeInUp 0.4s ease-out;
        }
        @media (max-width: 640px) {
          .exercise-container { padding: 1rem; }
          .exercise-title { font-size: 1.5rem; }
          .question { font-size: 1.1rem; }
          .option { padding: 1.25rem 1.5rem; font-size: 1rem; }
          .btn-submit { width: 100%; }
        }
      `}</style>

      <div className="exercise-header">
        <div className="exercise-number">
          <span>Exercise {exercise.num} of 3</span>
        </div>
        <h2 className="exercise-title">Knowledge Check</h2>
        <p className="question">{exercise.question}</p>
      </div>

      <div className="options-container">
        {exercise.options.map((option, index) => (
          <button
            key={index}
            className={`option ${selectedOption === index ? 'selected' : ''}`}
            onClick={() => handleOptionClick(index)}
            disabled={submitted}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="button-wrapper">
        <button 
          className="btn-submit" 
          onClick={handleSubmit}
          disabled={selectedOption === null || submitted}
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

      {exercise.explanation && submitted && selectedOption === exercise.correct && (
        <div className="explanation">
          ✨ {exercise.explanation}
        </div>
      )}
    </div>
  );
};

export default MultipleChoiceExercise;
