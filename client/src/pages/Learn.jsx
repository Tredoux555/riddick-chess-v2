import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FaHeart, FaFire, FaStar, FaLock, FaCheck, FaPlay, FaPause, FaRedo, FaVolumeUp, FaVolumeMute, FaTrophy, FaGem } from 'react-icons/fa';

// ============ LESSON DATA WITH ANIMATIONS ============
const LESSONS = [
  {
    id: 'intro',
    title: 'The Chessboard',
    icon: '♟️',
    description: 'Learn the battlefield',
    xp: 10,
    color: '#10b981',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          text: "Welcome to Chess! 🎉",
          subtext: "Let's learn on an empty board first...",
          highlight: [],
          animate: null
        },
        {
          duration: 4000,
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          text: "This is an 8×8 chessboard",
          subtext: "64 squares total - 32 light, 32 dark!",
          highlight: ['a1','c1','e1','g1','b2','d2','f2','h2','a3','c3','e3','g3','b4','d4','f4','h4','a5','c5','e5','g5','b6','d6','f6','h6','a7','c7','e7','g7','b8','d8','f8','h8'],
          animate: 'pulse'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          text: "Columns are called FILES",
          subtext: "Labeled a through h (left to right)",
          highlight: ['a1','a2','a3','a4','a5','a6','a7','a8'],
          animate: 'slideUp'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/8/8/8/8 w - - 0 1',
          text: "Rows are called RANKS",
          subtext: "Numbered 1 through 8 (bottom to top)",
          highlight: ['a4','b4','c4','d4','e4','f4','g4','h4'],
          animate: 'slideRight'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/4X3/8/8/8 w - - 0 1',
          text: "Every square has a name!",
          subtext: "File + Rank = e4 (the most famous square!)",
          highlight: ['e4'],
          customPiece: { square: 'e4', symbol: '⭐' },
          animate: 'bounce'
        },
        {
          duration: 4000,
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          text: "Now let's add the pieces!",
          subtext: "This is the starting position",
          highlight: [],
          animate: 'fadeIn'
        }
      ],
      quiz: {
        question: "What are the vertical columns called?",
        options: ["Ranks", "Files", "Lines", "Rows"],
        correct: 1,
        explanation: "Files are columns (a-h), Ranks are rows (1-8)!"
      }
    }
  },
  {
    id: 'pawn',
    title: 'The Pawn',
    icon: '♙',
    description: 'Small but mighty soldiers',
    xp: 15,
    color: '#f59e0b',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
          text: "Meet the Pawn! ♙",
          subtext: "The smallest piece, but very important!",
          highlight: ['e2'],
          animate: 'bounce'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/8/8/PPPPPPPP/8 w - - 0 1',
          text: "Each side has 8 pawns",
          subtext: "They form your army's front line!",
          highlight: ['a2','b2','c2','d2','e2','f2','g2','h2'],
          animate: 'wave'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/8/4P3/8/8 w - - 0 1',
          text: "Pawns move FORWARD ⬆️",
          subtext: "One square at a time, never backward!",
          highlight: ['e3'],
          arrows: [['e2', 'e3']],
          moveAnimation: { from: 'e2', to: 'e3' }
        },
        {
          duration: 4500,
          fen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
          text: "FIRST move = 2 squares! 🚀",
          subtext: "Only on their very first move",
          highlight: ['e4'],
          arrows: [['e2', 'e4']],
          moveAnimation: { from: 'e2', to: 'e4', twoSquare: true }
        },
        {
          duration: 4500,
          fen: '8/8/8/3p4/4P3/8/8/8 w - - 0 1',
          text: "Pawns capture DIAGONALLY! ⚔️",
          subtext: "They attack sideways, not straight!",
          highlight: ['d5'],
          arrows: [['e4', 'd5']],
          animate: 'attack'
        },
        {
          duration: 5000,
          fen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
          text: "Watch the pawn capture!",
          subtext: "",
          moveAnimation: { from: 'e4', to: 'd5', capture: true },
          showCapture: true
        },
        {
          duration: 5000,
          fen: '3Q4/4P3/8/8/8/8/8/8 w - - 0 1',
          text: "PROMOTION! 👑",
          subtext: "Reach the end → become a QUEEN!",
          highlight: ['e8'],
          arrows: [['e7', 'e8']],
          animate: 'glow',
          moveAnimation: { from: 'e7', to: 'e8', promotion: true }
        }
      ],
      puzzle: {
        instruction: "Capture the black pawn!",
        fen: '8/8/8/3p4/4P3/8/8/8 w - - 0 1',
        solution: 'e4d5',
        hint: "Remember: pawns capture diagonally!"
      },
      quiz: {
        question: "How do pawns capture?",
        options: ["Straight forward", "Diagonally", "In any direction", "They can't capture"],
        correct: 1,
        explanation: "Pawns move forward but capture diagonally!"
      }
    }
  },
  {
    id: 'rook',
    title: 'The Rook',
    icon: '♖',
    description: 'The powerful tower',
    xp: 15,
    color: '#ef4444',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
          text: "Meet the Rook! ♖",
          subtext: "Worth 5 points - a major piece!",
          highlight: ['d4'],
          animate: 'bounce'
        },
        {
          duration: 3500,
          fen: 'r6r/8/8/8/8/8/8/R6R w - - 0 1',
          text: "Rooks start in the corners",
          subtext: "Each player has 2 rooks",
          highlight: ['a1','h1','a8','h8'],
          animate: 'pulse'
        },
        {
          duration: 5000,
          fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
          text: "Rooks move in STRAIGHT lines!",
          subtext: "↑↓←→ Any number of squares!",
          highlight: ['d1','d2','d3','d5','d6','d7','d8','a4','b4','c4','e4','f4','g4','h4'],
          arrows: [['d4','d8'],['d4','d1'],['d4','a4'],['d4','h4']],
          animate: 'cross'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
          text: "Watch the rook slide!",
          subtext: "",
          moveAnimation: { from: 'd4', to: 'd8', path: ['d5','d6','d7','d8'] }
        },
        {
          duration: 4000,
          fen: '8/8/8/8/r2R4/8/8/8 w - - 0 1',
          text: "Rooks capture on their path!",
          subtext: "Move to the enemy's square to capture",
          highlight: ['a4'],
          arrows: [['d4', 'a4']],
          animate: 'attack'
        }
      ],
      puzzle: {
        instruction: "Capture the black rook!",
        fen: '8/8/8/8/r2R4/8/8/8 w - - 0 1',
        solution: 'd4a4',
        hint: "Rooks move in straight lines!"
      },
      quiz: {
        question: "How does the rook move?",
        options: ["Diagonally", "In an L-shape", "Straight lines only", "One square"],
        correct: 2,
        explanation: "Rooks move horizontally and vertically - straight lines!"
      }
    }
  },
  {
    id: 'bishop',
    title: 'The Bishop',
    icon: '♗',
    description: 'Diagonal sniper',
    xp: 15,
    color: '#3b82f6',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
          text: "Meet the Bishop! ♗",
          subtext: "Worth 3 points - master of diagonals!",
          highlight: ['d4'],
          animate: 'bounce'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/8/8/8/2B2B2 w - - 0 1',
          text: "Each side has 2 bishops",
          subtext: "One on light squares, one on dark!",
          highlight: ['c1', 'f1'],
          animate: 'pulse'
        },
        {
          duration: 5000,
          fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
          text: "Bishops move DIAGONALLY! ↗↘↙↖",
          subtext: "Any number of squares!",
          highlight: ['a1','b2','c3','e5','f6','g7','h8','g1','f2','e3','c5','b6','a7'],
          arrows: [['d4','h8'],['d4','a1'],['d4','a7'],['d4','g1']],
          animate: 'diagonal'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
          text: "Watch the bishop slide!",
          subtext: "",
          moveAnimation: { from: 'd4', to: 'h8', path: ['e5','f6','g7','h8'] }
        },
        {
          duration: 4500,
          fen: '8/6n1/8/8/3B4/8/8/8 w - - 0 1',
          text: "Bishops capture diagonally too!",
          subtext: "Same path for moving and capturing",
          highlight: ['g7'],
          arrows: [['d4', 'g7']],
          animate: 'attack'
        },
        {
          duration: 4000,
          fen: '8/8/5B2/8/8/2B5/8/8 w - - 0 1',
          text: "Light bishop STAYS on light!",
          subtext: "Dark bishop STAYS on dark - they never switch!",
          highlight: ['c3', 'f6'],
          animate: 'separate'
        }
      ],
      puzzle: {
        instruction: "Capture the knight with your bishop!",
        fen: '8/6n1/8/8/3B4/8/8/8 w - - 0 1',
        solution: 'd4g7',
        hint: "Bishops move diagonally!"
      },
      quiz: {
        question: "Can a light-squared bishop ever reach a dark square?",
        options: ["Yes, always", "Only when capturing", "Never!", "Only at the start"],
        correct: 2,
        explanation: "Bishops are forever stuck on their color!"
      }
    }
  },
  {
    id: 'knight',
    title: 'The Knight',
    icon: '♘',
    description: 'The tricky horse',
    xp: 20,
    color: '#8b5cf6',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/4N3/8/8/8 w - - 0 1',
          text: "Meet the Knight! ♘",
          subtext: "The trickiest piece in chess!",
          highlight: ['e4'],
          animate: 'bounce'
        },
        {
          duration: 4500,
          fen: '8/8/8/8/4N3/8/8/8 w - - 0 1',
          text: "Knights move in an L-shape!",
          subtext: "2 squares + 1 square (or 1 + 2)",
          highlight: ['d2','f2','c3','g3','c5','g5','d6','f6'],
          arrows: [['e4','d2'],['e4','f2'],['e4','c3'],['e4','g3'],['e4','c5'],['e4','g5'],['e4','d6'],['e4','f6']],
          animate: 'Lshape'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/4N3/8/8/8 w - - 0 1',
          text: "Watch the L-shape jump!",
          subtext: "",
          moveAnimation: { from: 'e4', to: 'f6', jump: true }
        },
        {
          duration: 5000,
          fen: '8/8/8/2PPP3/2PNP3/2PPP3/8/8 w - - 0 1',
          text: "Knights can JUMP! 🐴",
          subtext: "The ONLY piece that jumps over others!",
          highlight: ['b3','b5','c2','c6','e2','e6','f3','f5'],
          animate: 'jump'
        },
        {
          duration: 5000,
          fen: '8/8/8/1q6/8/8/3N4/1r6 w - - 0 1',
          text: "Knight FORK! ⚔️⚔️",
          subtext: "Attack TWO pieces at once!",
          highlight: ['c4'],
          arrows: [['d2', 'c4']],
          animate: 'fork'
        }
      ],
      puzzle: {
        instruction: "Find the knight fork! Attack both pieces!",
        fen: '8/8/8/1q6/8/8/3N4/1r6 w - - 0 1',
        solution: 'd2c4',
        hint: "Find the square that attacks both!"
      },
      quiz: {
        question: "What makes the knight unique?",
        options: ["Most valuable piece", "Moves diagonally", "Can jump over pieces", "Can't be captured"],
        correct: 2,
        explanation: "Knights are the ONLY piece that can jump!"
      }
    }
  },
  {
    id: 'queen',
    title: 'The Queen',
    icon: '♕',
    description: 'The most powerful',
    xp: 20,
    color: '#ec4899',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
          text: "Meet the Queen! ♕",
          subtext: "The MOST POWERFUL piece! Worth 9 points!",
          highlight: ['d4'],
          animate: 'glow'
        },
        {
          duration: 5000,
          fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
          text: "Queen = Rook + Bishop! 👑",
          subtext: "Moves ANY direction, ANY distance!",
          highlight: ['d1','d2','d3','d5','d6','d7','d8','a4','b4','c4','e4','f4','g4','h4','a1','b2','c3','e5','f6','g7','h8','a7','b6','c5','e3','f2','g1'],
          arrows: [['d4','d8'],['d4','h8'],['d4','h4'],['d4','g1'],['d4','d1'],['d4','a1'],['d4','a4'],['d4','a7']],
          animate: 'star'
        },
        {
          duration: 4000,
          fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
          text: "Watch the queen dominate!",
          subtext: "",
          moveAnimation: { from: 'd4', to: 'h8', path: ['e5','f6','g7','h8'] }
        },
        {
          duration: 4500,
          fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
          text: "⚠️ Protect your queen!",
          subtext: "Losing her is usually game over!",
          highlight: ['d4'],
          animate: 'warning'
        }
      ],
      quiz: {
        question: "The Queen combines which two pieces?",
        options: ["Knight + Bishop", "Rook + Knight", "Rook + Bishop", "Pawn + King"],
        correct: 2,
        explanation: "Queen = Rook (straight) + Bishop (diagonal)!"
      }
    }
  },
  {
    id: 'king',
    title: 'The King',
    icon: '♔',
    description: 'Protect at all costs',
    xp: 25,
    color: '#eab308',
    locked: false,
    video: {
      scenes: [
        {
          duration: 3000,
          fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
          text: "Meet the King! ♔",
          subtext: "The most IMPORTANT piece!",
          highlight: ['d4'],
          animate: 'crown'
        },
        {
          duration: 4500,
          fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
          text: "King moves ONE square",
          subtext: "Any direction, but only one step!",
          highlight: ['c3','d3','e3','c4','e4','c5','d5','e5'],
          arrows: [['d4','c3'],['d4','d3'],['d4','e3'],['d4','c4'],['d4','e4'],['d4','c5'],['d4','d5'],['d4','e5']],
          animate: 'expand'
        },
        {
          duration: 5000,
          fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
          text: "⚠️ CHECKMATE = GAME OVER!",
          subtext: "If your King is trapped... you LOSE!",
          highlight: ['d4'],
          animate: 'danger'
        },
        {
          duration: 5000,
          fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
          text: "Special move: CASTLING! 🏰",
          subtext: "King + Rook move together (once per game!)",
          highlight: ['e1','h1','a1'],
          animate: 'castle'
        },
        {
          duration: 4000,
          fen: 'r3k2r/8/8/8/8/8/8/R4RK1 w kq - 0 1',
          text: "Kingside Castle!",
          subtext: "King goes 2 squares toward rook, rook jumps over!",
          moveAnimation: { from: 'e1', to: 'g1', castle: 'kingside' }
        }
      ],
      quiz: {
        question: "What happens if your King is checkmated?",
        options: ["You lose the King", "You skip a turn", "You LOSE the game!", "Nothing"],
        correct: 2,
        explanation: "Checkmate = Game Over! Always protect your King!"
      }
    }
  }
];

// ============ MAIN LEARN COMPONENT ============
const Learn = () => {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(() => {
    const saved = localStorage.getItem('chess_completed_lessons');
    return saved ? JSON.parse(saved) : [];
  });
  const [totalXP, setTotalXP] = useState(() => {
    return parseInt(localStorage.getItem('chess_xp') || '0');
  });
  const [streak, setStreak] = useState(() => {
    return parseInt(localStorage.getItem('chess_streak') || '0');
  });

  // Save progress
  useEffect(() => {
    localStorage.setItem('chess_completed_lessons', JSON.stringify(completedLessons));
    localStorage.setItem('chess_xp', totalXP.toString());
  }, [completedLessons, totalXP]);

  const completeLesson = (lessonId, xp) => {
    if (!completedLessons.includes(lessonId)) {
      setCompletedLessons([...completedLessons, lessonId]);
      setTotalXP(prev => prev + xp);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  if (selectedLesson) {
    return (
      <LessonPlayer 
        lesson={selectedLesson} 
        onComplete={() => {
          completeLesson(selectedLesson.id, selectedLesson.xp);
          setSelectedLesson(null);
        }}
        onExit={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="learn-page">
      {/* Stats Header */}
      <div className="learn-header">
        <div className="stat-box">
          <FaGem className="icon xp" />
          <span>{totalXP} XP</span>
        </div>
        <div className="stat-box">
          <FaFire className="icon streak" />
          <span>{streak} day streak</span>
        </div>
        <div className="stat-box">
          <FaTrophy className="icon trophy" />
          <span>{completedLessons.length}/{LESSONS.length}</span>
        </div>
      </div>

      <h1 className="page-title">Learn Chess 🎓</h1>
      <p className="page-subtitle">Master the game step by step!</p>

      {/* Lesson Path */}
      <div className="lesson-path">
        {LESSONS.map((lesson, index) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const isLocked = index > 0 && !completedLessons.includes(LESSONS[index - 1].id) && !isCompleted;
          
          return (
            <div key={lesson.id} className="lesson-node-wrapper">
              {index > 0 && (
                <div className={`path-line ${isCompleted || !isLocked ? 'active' : ''}`} />
              )}
              <button
                className={`lesson-node ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => !isLocked && setSelectedLesson(lesson)}
                disabled={isLocked}
                style={{ '--lesson-color': lesson.color }}
              >
                <div className="lesson-icon">
                  {isLocked ? <FaLock /> : isCompleted ? <FaCheck /> : lesson.icon}
                </div>
                <div className="lesson-info">
                  <span className="lesson-title">{lesson.title}</span>
                  <span className="lesson-desc">{lesson.description}</span>
                </div>
                <div className="lesson-xp">+{lesson.xp} XP</div>
              </button>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .learn-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .learn-header {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--bg-card);
          border-radius: 20px;
          font-weight: 600;
        }
        .stat-box .icon { font-size: 1.2rem; }
        .stat-box .icon.xp { color: #10b981; }
        .stat-box .icon.streak { color: #f59e0b; }
        .stat-box .icon.trophy { color: #eab308; }
        .page-title {
          text-align: center;
          font-size: 2.5rem;
          margin-bottom: 8px;
        }
        .page-subtitle {
          text-align: center;
          color: var(--text-muted);
          margin-bottom: 40px;
        }
        .lesson-path {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .lesson-node-wrapper {
          position: relative;
        }
        .path-line {
          position: absolute;
          left: 40px;
          top: -20px;
          width: 4px;
          height: 20px;
          background: var(--bg-tertiary);
          border-radius: 2px;
        }
        .path-line.active {
          background: var(--accent-success);
        }
        .lesson-node {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 16px 20px;
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 12px;
        }
        .lesson-node:hover:not(.locked) {
          transform: translateX(8px);
          border-color: var(--lesson-color);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .lesson-node.completed {
          border-color: var(--accent-success);
          background: rgba(16, 185, 129, 0.1);
        }
        .lesson-node.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lesson-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: var(--lesson-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          flex-shrink: 0;
        }
        .lesson-info {
          flex: 1;
          text-align: left;
        }
        .lesson-title {
          display: block;
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }
        .lesson-desc {
          display: block;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .lesson-xp {
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.85rem;
          color: #10b981;
        }
      `}</style>
    </div>
  );
};

// ============ LESSON PLAYER (VIDEO + QUIZ) ============
const LessonPlayer = ({ lesson, onComplete, onExit }) => {
  const [phase, setPhase] = useState('video'); // 'video', 'puzzle', 'quiz', 'complete'
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showText, setShowText] = useState(false);
  const [animatingMove, setAnimatingMove] = useState(null);
  const [hearts, setHearts] = useState(3);
  const [currentFen, setCurrentFen] = useState(lesson.video.scenes[0].fen);
  const timerRef = useRef(null);
  
  const scene = lesson.video.scenes[sceneIndex];

  // Auto-advance scenes
  useEffect(() => {
    if (phase !== 'video' || !isPlaying) return;
    
    setShowText(false);
    setCurrentFen(scene.fen);
    
    // Show text after brief delay
    const textTimer = setTimeout(() => setShowText(true), 300);
    
    // Handle move animation if present
    if (scene.moveAnimation) {
      const moveTimer = setTimeout(() => {
        setAnimatingMove(scene.moveAnimation);
      }, 1500);
      
      const completeMoveTimer = setTimeout(() => {
        setAnimatingMove(null);
        // Update FEN after move animation
        if (scene.moveAnimation.to) {
          // Simple FEN update for visualization
        }
      }, 3000);
    }
    
    // Auto-advance to next scene
    timerRef.current = setTimeout(() => {
      if (sceneIndex < lesson.video.scenes.length - 1) {
        setSceneIndex(prev => prev + 1);
      } else {
        // Video done, go to puzzle or quiz
        if (lesson.video.puzzle) {
          setPhase('puzzle');
        } else {
          setPhase('quiz');
        }
      }
    }, scene.duration);
    
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(textTimer);
    };
  }, [sceneIndex, isPlaying, phase]);

  const handlePuzzleComplete = (correct) => {
    if (correct) {
      toast.success('Correct! 🎉');
      confetti({ particleCount: 50, spread: 60 });
      setPhase('quiz');
    } else {
      setHearts(prev => prev - 1);
      toast.error('Try again!');
      if (hearts <= 1) {
        toast.error('Out of hearts! Watch the lesson again.');
        setSceneIndex(0);
        setPhase('video');
        setHearts(3);
      }
    }
  };

  const handleQuizAnswer = (answerIndex) => {
    if (answerIndex === lesson.video.quiz.correct) {
      toast.success('Perfect! 🌟');
      confetti({ particleCount: 100, spread: 70 });
      setPhase('complete');
    } else {
      setHearts(prev => prev - 1);
      toast.error(lesson.video.quiz.explanation);
      if (hearts <= 1) {
        setSceneIndex(0);
        setPhase('video');
        setHearts(3);
      }
    }
  };

  // Custom square styles for highlights
  const customSquareStyles = {};
  if (scene?.highlight) {
    scene.highlight.forEach(sq => {
      customSquareStyles[sq] = {
        background: 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(255,215,0,0) 70%)',
        animation: 'pulse 1s infinite'
      };
    });
  }

  return (
    <div className="lesson-player">
      {/* Header */}
      <div className="player-header">
        <button className="exit-btn" onClick={onExit}>✕</button>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: phase === 'video' 
                ? `${(sceneIndex / lesson.video.scenes.length) * 100}%`
                : phase === 'puzzle' ? '70%'
                : phase === 'quiz' ? '90%' : '100%'
            }} 
          />
        </div>
        <div className="hearts">
          {[...Array(3)].map((_, i) => (
            <FaHeart key={i} className={i < hearts ? 'active' : 'lost'} />
          ))}
        </div>
      </div>

      {/* Video Phase */}
      {phase === 'video' && (
        <div className="video-container">
          <div className={`text-bubble ${showText ? 'show' : ''}`}>
            <h2>{scene.text}</h2>
            {scene.subtext && <p>{scene.subtext}</p>}
          </div>
          
          <div className={`board-container ${scene.animate || ''}`}>
            <Chessboard
              position={currentFen}
              boardWidth={Math.min(400, window.innerWidth - 40)}
              customSquareStyles={customSquareStyles}
              customArrows={scene.arrows?.map(([from, to]) => ({
                startSquare: from,
                endSquare: to,
                color: 'rgba(255, 170, 0, 0.8)'
              })) || []}
              arePiecesDraggable={false}
            />
          </div>

          <div className="video-controls">
            <button onClick={() => setIsPlaying(!isPlaying)}>
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
            <button onClick={() => sceneIndex < lesson.video.scenes.length - 1 && setSceneIndex(prev => prev + 1)}>
              Skip →
            </button>
          </div>
        </div>
      )}

      {/* Puzzle Phase */}
      {phase === 'puzzle' && lesson.video.puzzle && (
        <PuzzleChallenge 
          puzzle={lesson.video.puzzle}
          onComplete={handlePuzzleComplete}
        />
      )}

      {/* Quiz Phase */}
      {phase === 'quiz' && (
        <div className="quiz-container">
          <h2>Quick Quiz! 🧠</h2>
          <p className="quiz-question">{lesson.video.quiz.question}</p>
          <div className="quiz-options">
            {lesson.video.quiz.options.map((option, i) => (
              <button 
                key={i} 
                className="quiz-option"
                onClick={() => handleQuizAnswer(i)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Complete Phase */}
      {phase === 'complete' && (
        <div className="complete-container">
          <div className="complete-icon">🎉</div>
          <h2>Lesson Complete!</h2>
          <p>You earned <span className="xp">+{lesson.xp} XP</span></p>
          <button className="continue-btn" onClick={onComplete}>
            Continue
          </button>
        </div>
      )}

      <style jsx>{`
        .lesson-player {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 20px;
        }
        .player-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 30px;
        }
        .exit-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--bg-card);
          border: none;
          color: var(--text-primary);
          font-size: 1.2rem;
          cursor: pointer;
        }
        .progress-bar {
          flex: 1;
          height: 12px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #3b82f6);
          border-radius: 6px;
          transition: width 0.5s ease;
        }
        .hearts {
          display: flex;
          gap: 4px;
        }
        .hearts svg {
          font-size: 1.4rem;
          color: #ef4444;
        }
        .hearts svg.lost {
          color: var(--bg-tertiary);
        }
        .video-container {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }
        .text-bubble {
          background: var(--bg-card);
          padding: 20px 30px;
          border-radius: 20px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.5s ease;
        }
        .text-bubble.show {
          opacity: 1;
          transform: translateY(0);
        }
        .text-bubble h2 {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .text-bubble p {
          color: var(--text-muted);
          font-size: 1rem;
        }
        .board-container {
          display: inline-block;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .board-container.pulse {
          animation: boardPulse 2s infinite;
        }
        .board-container.bounce {
          animation: boardBounce 0.5s ease;
        }
        .board-container.glow {
          box-shadow: 0 0 30px rgba(255,215,0,0.5), 0 10px 40px rgba(0,0,0,0.3);
        }
        @keyframes boardPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes boardBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .video-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 24px;
        }
        .video-controls button {
          padding: 10px 20px;
          background: var(--bg-card);
          border: none;
          border-radius: 8px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 1rem;
        }
        .scene-dots {
          display: flex;
          gap: 8px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          cursor: pointer;
          transition: all 0.3s;
        }
        .dot.active {
          background: var(--accent-primary);
          transform: scale(1.3);
        }
        .dot.done {
          background: var(--accent-success);
        }
        .quiz-container, .complete-container {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
          padding: 40px 20px;
        }
        .quiz-question {
          font-size: 1.3rem;
          margin: 20px 0 30px;
        }
        .quiz-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .quiz-option {
          padding: 16px 24px;
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .quiz-option:hover {
          border-color: var(--accent-primary);
          transform: translateX(8px);
        }
        .complete-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        .complete-container h2 {
          font-size: 2rem;
          margin-bottom: 16px;
        }
        .xp {
          color: #10b981;
          font-weight: 700;
          font-size: 1.3rem;
        }
        .continue-btn {
          margin-top: 30px;
          padding: 16px 60px;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          border: none;
          border-radius: 30px;
          color: white;
          font-size: 1.2rem;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// ============ PUZZLE CHALLENGE COMPONENT ============
const PuzzleChallenge = ({ puzzle, onComplete }) => {
  const [game, setGame] = useState(new Chess(puzzle.fen));
  const [showHint, setShowHint] = useState(false);

  const onDrop = (sourceSquare, targetSquare) => {
    const move = sourceSquare + targetSquare;
    
    if (move === puzzle.solution || move === puzzle.solution.slice(0, 4)) {
      // Correct move!
      const gameCopy = new Chess(game.fen());
      gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      setGame(gameCopy);
      setTimeout(() => onComplete(true), 500);
      return true;
    } else {
      // Wrong move
      onComplete(false);
      return false;
    }
  };

  return (
    <div className="puzzle-challenge">
      <h2>Your Turn! 🎯</h2>
      <p className="instruction">{puzzle.instruction}</p>
      
      <div className="puzzle-board">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={Math.min(400, window.innerWidth - 40)}
        />
      </div>

      <button className="hint-btn" onClick={() => setShowHint(true)}>
        💡 Need a hint?
      </button>
      
      {showHint && (
        <p className="hint-text">{puzzle.hint}</p>
      )}

      <style jsx>{`
        .puzzle-challenge {
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }
        .puzzle-challenge h2 {
          font-size: 1.8rem;
          margin-bottom: 8px;
        }
        .instruction {
          color: var(--text-muted);
          margin-bottom: 24px;
          font-size: 1.1rem;
        }
        .puzzle-board {
          display: inline-block;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          margin-bottom: 24px;
        }
        .hint-btn {
          padding: 12px 24px;
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          border-radius: 20px;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 1rem;
        }
        .hint-text {
          margin-top: 16px;
          padding: 16px;
          background: rgba(245, 158, 11, 0.2);
          border-radius: 12px;
          color: #f59e0b;
        }
      `}</style>
    </div>
  );
};

export default Learn;