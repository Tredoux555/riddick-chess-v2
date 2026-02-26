// NEW: Refactored LessonPlayer component to support 3 exercises
// Replaces old video → puzzle → quiz flow with video → exercise1 → exercise2 → exercise3 → complete

import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FaHeart, FaPlay, FaPause, FaTrophy } from 'react-icons/fa';
import { 
  SquareSelectionExercise, 
  DragDropExercise, 
  MultipleChoiceExercise 
} from '../components/exercises';

const LessonPlayer = ({ lesson, onComplete, onExit }) => {
  const [phase, setPhase] = useState('video'); // 'video', 'exercises', 'complete'
  const [exerciseIndex, setExerciseIndex] = useState(0); // 0, 1, 2
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showText, setShowText] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [exerciseAttempts, setExerciseAttempts] = useState([0, 0, 0]); // Track attempts per exercise
  const [completedExercises, setCompletedExercises] = useState([false, false, false]);
  const timerRef = useRef(null);

  const scene = lesson.video?.scenes?.[sceneIndex];
  const currentExercise = lesson.exercises?.[exerciseIndex];

  // Auto-advance video scenes
  useEffect(() => {
    if (phase !== 'video' || !isPlaying || !scene) return;
    
    setShowText(false);
    const textTimer = setTimeout(() => setShowText(true), 300);
    
    // Auto-advance to next scene
    timerRef.current = setTimeout(() => {
      if (sceneIndex < lesson.video.scenes.length - 1) {
        setSceneIndex(prev => prev + 1);
      } else {
        // Video done, start exercises
        setPhase('exercises');
        setExerciseIndex(0);
      }
    }, scene.duration);
    
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(textTimer);
    };
  }, [sceneIndex, isPlaying, phase, scene, lesson.video]);

  const handleExerciseComplete = (correct) => {
    if (correct) {
      // Correct answer!
      toast.success('Correct! 🎉');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      
      // Mark exercise as complete
      const newCompleted = [...completedExercises];
      newCompleted[exerciseIndex] = true;
      setCompletedExercises(newCompleted);
      
      // Move to next exercise or complete
      setTimeout(() => {
        if (exerciseIndex < 2) {
          // Next exercise
          setExerciseIndex(prev => prev + 1);
          setHearts(3); // Reset hearts for new exercise
        } else {
          // All exercises complete!
          setPhase('complete');
        }
      }, 1000);
    } else {
      // Wrong answer
      setHearts(prev => prev - 1);
      
      // Increment attempt counter
      const newAttempts = [...exerciseAttempts];
      newAttempts[exerciseIndex] += 1;
      setExerciseAttempts(newAttempts);
      
      toast.error('Not quite! Try again');
      
      if (hearts <= 1) {
        // Out of hearts - reset current exercise
        toast.error('Out of hearts! Resetting exercise...');
        setHearts(3);
        // Exercise resets automatically since state stays the same
      }
    }
  };

  // Calculate overall progress percentage
  const calculateProgress = () => {
    if (phase === 'video') {
      return (sceneIndex / lesson.video.scenes.length) * 25; // Video = 25%
    } else if (phase === 'exercises') {
      const baseProgress = 25;
      const exerciseProgress = (exerciseIndex / 3) * 75; // Exercises = 75%
      return baseProgress + exerciseProgress;
    } else {
      return 100;
    }
  };

  // Render exercise component based on type
  const renderExercise = () => {
    if (!currentExercise) return null;

    const props = {
      exercise: currentExercise,
      onComplete: handleExerciseComplete,
      attempts: exerciseAttempts[exerciseIndex]
    };

    switch (currentExercise.type) {
      case 'square_selection':
        return <SquareSelectionExercise {...props} />;
      case 'drag_drop':
        return <DragDropExercise {...props} />;
      case 'multiple_choice':
        return <MultipleChoiceExercise {...props} />;
      default:
        return <div>Unknown exercise type</div>;
    }
  };

  return (
    <div className="lesson-player">
      <style jsx>{`
        .lesson-player {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 1rem;
        }

        .player-header {
          max-width: 800px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .exit-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(26, 26, 46, 0.6);
          border: 2px solid rgba(99, 102, 241, 0.25);
          color: var(--text-primary);
          font-size: 1.3rem;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .exit-btn:hover {
          border-color: rgba(239, 68, 68, 0.6);
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          transform: rotate(90deg);
        }

        .progress-container {
          flex: 1;
        }

        .progress-label {
          font-size: 0.85rem;
          color: #c8c8dc;
          margin-bottom: 0.5rem;
          text-align: center;
          font-weight: 600;
        }

        .progress-bar {
          height: 8px;
          background: rgba(26, 26, 46, 0.8);
          border-radius: 50px;
          overflow: hidden;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
          border-radius: 50px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }

        .hearts-container {
          display: flex;
          gap: 0.4rem;
          align-items: center;
        }

        .heart {
          font-size: 1.5rem;
          transition: all 0.3s ease;
        }

        .heart.active {
          color: #ef4444;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        .heart.lost {
          color: rgba(239, 68, 68, 0.2);
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1); }
        }

        .video-container {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .text-bubble {
          background: rgba(26, 26, 46, 0.8);
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 1.5rem 2rem;
          border-radius: 20px;
          margin-bottom: 2rem;
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .text-bubble.show {
          opacity: 1;
          transform: translateY(0);
        }

        .text-bubble h2 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #b4b4c7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: 'Outfit', sans-serif;
        }

        .text-bubble p {
          color: #e0e0ee;
          font-size: 1.1rem;
          line-height: 1.6;
        }

        .board-container {
          border-radius: 20px;
          overflow: hidden;
          align-self: center;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.6),
            0 0 80px rgba(99, 102, 241, 0.2);
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(37, 37, 66, 0.6) 100%);
          backdrop-filter: blur(12px);
          padding: 1rem;
          margin-bottom: 2rem;
        }

        .video-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .control-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.2);
          border: 2px solid rgba(99, 102, 241, 0.4);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .control-btn:hover {
          background: rgba(99, 102, 241, 0.3);
          border-color: rgba(99, 102, 241, 0.6);
          transform: scale(1.1);
        }

        .scene-dots {
          display: flex;
          gap: 0.5rem;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dot.active {
          background: #6366f1;
          transform: scale(1.5);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.6);
        }

        .dot.done {
          background: #10b981;
        }

        .complete-container {
          max-width: 500px;
          margin: 4rem auto;
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(26, 26, 46, 0.6);
          border: 2px solid rgba(16, 185, 129, 0.3);
          border-radius: 24px;
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .complete-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          animation: bounce 0.8s ease;
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .complete-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: 'Outfit', sans-serif;
        }

        .xp-earned {
          font-size: 1.3rem;
          color: #e0e0ee;
          margin-bottom: 2rem;
        }

        .xp-value {
          color: #10b981;
          font-weight: 700;
          font-size: 1.5rem;
        }

        .continue-btn {
          padding: 1rem 3rem;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          border: none;
          border-radius: 50px;
          color: white;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }

        .continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(16, 185, 129, 0.6);
        }

        @media (max-width: 640px) {
          .player-header {
            flex-wrap: wrap;
          }
          
          .progress-container {
            order: 3;
            width: 100%;
          }

          .text-bubble {
            padding: 1.25rem 1.5rem;
          }

          .text-bubble h2 {
            font-size: 1.5rem;
          }

          .complete-icon {
            font-size: 3.5rem;
          }

          .complete-title {
            font-size: 2rem;
          }
        }
      `}</style>

      {/* Header with progress */}
      <div className="player-header">
        <button className="exit-btn" onClick={onExit}>✕</button>
        
        <div className="progress-container">
          <div className="progress-label">
            {phase === 'video' && 'Watching Lesson'}
            {phase === 'exercises' && `Exercise ${exerciseIndex + 1} of 3`}
            {phase === 'complete' && 'Complete!'}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${calculateProgress()}%` }} 
            />
          </div>
        </div>

        <div className="hearts-container">
          {[...Array(3)].map((_, i) => (
            <FaHeart 
              key={i} 
              className={`heart ${i < hearts ? 'active' : 'lost'}`}
            />
          ))}
        </div>
      </div>

      {/* Video Phase */}
      {phase === 'video' && scene && (
        <div className="video-container">
          <div className={`text-bubble ${showText ? 'show' : ''}`}>
            <h2>{scene.text}</h2>
            {scene.subtext && <p>{scene.subtext}</p>}
          </div>
          
          <div className="board-container">
            <Chessboard
              position={scene.fen}
              boardWidth={Math.min(480, window.innerWidth - 80)}
              arePiecesDraggable={false}
              customBoardStyle={{
                borderRadius: '12px'
              }}
            />
          </div>

          <div className="video-controls">
            <button 
              className="control-btn" 
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            
            <div className="scene-dots">
              {lesson.video.scenes.map((_, i) => (
                <span 
                  key={i} 
                  className={`dot ${i === sceneIndex ? 'active' : ''} ${i < sceneIndex ? 'done' : ''}`}
                  onClick={() => { setSceneIndex(i); setIsPlaying(true); }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exercise Phase */}
      {phase === 'exercises' && renderExercise()}

      {/* Complete Phase */}
      {phase === 'complete' && (
        <div className="complete-container">
          <div className="complete-icon">
            <FaTrophy />
          </div>
          <h2 className="complete-title">Lesson Complete!</h2>
          <p className="xp-earned">
            You earned <span className="xp-value">+{lesson.xp} XP</span>
          </p>
          <button className="continue-btn" onClick={onComplete}>
            Continue Learning
          </button>
        </div>
      )}
    </div>
  );
};

export default LessonPlayer;
