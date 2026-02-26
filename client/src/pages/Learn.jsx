import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FaHeart, FaFire, FaStar, FaLock, FaCheck, FaPlay, FaPause, FaRedo, FaVolumeUp, FaVolumeMute, FaTrophy, FaGem, FaChess, FaChessKnight, FaArrowRight } from 'react-icons/fa';
import { useBoardSettings } from '../contexts/BoardSettingsContext';

// Error boundary to catch crashes
class LearnErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong 😅</h2>
          <p style={{ color: '#ff6b6b' }}>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          fen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
          text: "Every square has a name!",
          subtext: "File + Rank = e4 (the most famous square!)",
          highlight: ['e4'],
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
          fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
          text: "Pawns move FORWARD ⬆️",
          subtext: "One square at a time, never backward!",
          highlight: ['e3'],
          arrows: [['e2', 'e3']],
          moveAnimation: { from: 'e2', to: 'e3' }
        },
        {
          duration: 4500,
          fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
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
          fen: '8/8/8/3p4/4P3/8/8/8 w - - 0 1',
          text: "Watch the pawn capture!",
          subtext: "",
          moveAnimation: { from: 'e4', to: 'd5', capture: true },
          showCapture: true
        },
        {
          duration: 5000,
          fen: '8/4P3/8/8/8/8/8/8 w - - 0 1',
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
        fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1',
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
        fen: '4k3/8/8/8/r2R4/8/8/4K3 w - - 0 1',
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
        fen: '4k3/6n1/8/8/3B4/8/8/4K3 w - - 0 1',
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
          fen: '8/8/8/q7/8/8/1r1N4/7K w - - 0 1',
          text: "Knight FORK! ⚔️⚔️",
          subtext: "Nc4 attacks the Queen on a5 AND the Rook on b2!",
          highlight: ['c4'],
          arrows: [['d2', 'c4']],
          animate: 'fork'
        }
      ],
      puzzle: {
        instruction: "Find the knight fork! Attack both pieces!",
        fen: '4k3/8/8/q7/8/8/1r1N4/7K w - - 0 1',
        solution: 'd2c4',
        hint: "Which square lets the Knight attack BOTH the Queen and the Rook?"
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
      puzzle: {
        instruction: "Capture the undefended Rook with your Queen!",
        fen: '4k3/8/8/3r4/8/8/8/3QK3 w - - 0 1',
        solution: 'd1d5',
        hint: "The Queen can move like a Rook — straight up the file!"
      },
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
  },
  // ===== NEW LESSONS: STRATEGY & TACTICS =====
  {
    id: 'check',
    title: 'Check & Checkmate',
    icon: '⚔️',
    description: 'How to win the game',
    xp: 20,
    color: '#dc2626',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: "Let's learn CHECK ⚔️", subtext: "When a King is under attack, it's in CHECK", highlight: [], animate: 'fadeIn' },
        { duration: 4000, fen: '4k3/8/8/8/8/8/8/4R2K w - - 0 1', text: "White Rook attacks the King!", subtext: "The Black King is in CHECK — it MUST escape!", highlight: ['e1','e8'], arrows: [['e1','e8']], animate: 'pulse' },
        { duration: 4000, fen: '4k3/8/8/8/8/8/8/4R2K w - - 0 1', text: "3 ways to escape check:", subtext: "1) Move the King  2) Block  3) Capture the attacker", highlight: ['d8','d7','f8','f7'], animate: null },
        { duration: 4500, fen: '4k3/8/8/8/4Q3/8/8/7K w - - 0 1', text: "CHECKMATE = Game Over! 🏆", subtext: "King is in check AND has no escape!", highlight: ['e8','e4'], arrows: [['e4','e8']], animate: 'pulse' },
        { duration: 4000, fen: '4k3/8/8/8/4Q3/8/8/7K w - - 0 1', text: "The Queen covers ALL escape squares", subtext: "d8, f8, d7, e7, f7 — all attacked!", highlight: ['d8','f8','d7','e7','f7'], animate: 'pulse' },
        { duration: 4000, fen: 'k7/8/1K6/8/8/8/8/R7 w - - 0 1', text: "Back Rank Checkmate 💀", subtext: "Rook + King teamwork = deadly combo!", highlight: ['a1','a8'], arrows: [['a1','a8']], animate: 'slideRight' }
      ],
      puzzle: { fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', instruction: 'Deliver checkmate in one move!', solution: 'a1a8', hint: 'The Rook can reach the back rank!' },
      quiz: { question: "What is checkmate?", options: ["King captured", "King in check with no escape", "Stalemate", "A draw"], correct: 1, explanation: "Checkmate = King in check with no legal moves. Game over!" }
    }
  },
  {
    id: 'castling',
    title: 'Castling',
    icon: '🏰',
    description: 'The Kings special move',
    xp: 15,
    color: '#7c3aed',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: "Castling — the King's escape! 🏰", subtext: "The ONLY move where 2 pieces move at once!", highlight: ['e1','a1','h1'], animate: 'fadeIn' },
        { duration: 4500, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: "Kingside Castling (Short)", subtext: "King goes e1→g1, Rook goes h1→f1", highlight: ['e1','g1','h1','f1'], arrows: [['e1','g1'],['h1','f1']], animate: 'slideRight' },
        { duration: 4500, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1 w kq - 0 1', text: "After kingside castling ✓", subtext: "King is safe in the corner! Rook is active!", highlight: ['g1','f1'], animate: 'pulse' },
        { duration: 4500, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: "Queenside Castling (Long)", subtext: "King goes e1→c1, Rook goes a1→d1", highlight: ['e1','c1','a1','d1'], arrows: [['e1','c1'],['a1','d1']], animate: 'slideRight' },
        { duration: 4000, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: "Rules for Castling:", subtext: "King & Rook haven't moved, no pieces between, King not in check", highlight: ['e1','h1','f1','g1'], animate: null },
        { duration: 3500, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: "Pro Tip: Castle EARLY! 🧠", subtext: "Get your King safe and activate your Rook!", highlight: [], animate: 'bounce' }
      ],
      puzzle: { fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', instruction: 'Castle kingside! Move the King to g1.', solution: 'e1g1', hint: 'Drag the King two squares toward the Rook!' },
      quiz: { question: "Which pieces move when you castle?", options: ["King only", "Rook only", "King and Rook together", "King and Bishop"], correct: 2, explanation: "Castling moves the King AND a Rook in one turn!" }
    }
  },
  {
    id: 'openings',
    title: 'Opening Principles',
    icon: '📖',
    description: 'Start the game right',
    xp: 25,
    color: '#0891b2',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: "Opening Principles 📖", subtext: "How to start a chess game like a pro!", highlight: [], animate: 'fadeIn' },
        { duration: 4000, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', text: "Rule 1: Control the CENTER! ♟️", subtext: "e4 grabs central space — best first move!", highlight: ['e4','d4','e5','d5'], animate: 'pulse' },
        { duration: 4000, fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', text: "Black fights for the center too!", subtext: "1...e5 — now BOTH sides have central pawns", highlight: ['e4','e5'], animate: null },
        { duration: 4500, fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 1', text: "Rule 2: Develop your PIECES! 🐴", subtext: "Knights before Bishops! Nf3 attacks e5", highlight: ['f3'], arrows: [['f3','e5']], animate: 'slideUp' },
        { duration: 4500, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', text: "Black develops too: Nc6", subtext: "Knight defends e5 and controls d4!", highlight: ['c6'], arrows: [['c6','e5'],['c6','d4']], animate: 'slideUp' },
        { duration: 4000, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1', text: "Rule 3: Castle EARLY! 🏰", subtext: "Develop Bishop → Castle → King is safe!", highlight: ['c4','e1'], animate: 'pulse' },
        { duration: 3500, fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1bB1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', text: "DON'T move the same piece twice!", subtext: "DON'T bring the Queen out early!", highlight: [], animate: 'bounce' }
      ],
      puzzle: { fen: 'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', instruction: 'Develop a piece! What is the best move?', solution: 'g1f3', hint: 'Knights before Bishops! Develop toward the center.' },
      quiz: { question: "What are the 3 opening rules?", options: ["Attack immediately", "Control center, develop pieces, castle early", "Move queen first", "Push all pawns"], correct: 1, explanation: "Center control + Development + Castling = Strong opening!" }
    }
  },
  {
    id: 'tactics_fork',
    title: 'Forks',
    icon: '🍴',
    description: 'Attack two things at once!',
    xp: 25,
    color: '#ea580c',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "Tactics: The FORK! 🍴", subtext: "One piece attacks TWO enemy pieces at once!", highlight: [], animate: 'fadeIn' },
        { duration: 4500, fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3N4/PPPP1PPP/RNBQK2R w KQkq - 0 1', text: "Knight Fork — the deadliest! ♞", subtext: "Knights can fork because they jump over pieces!", highlight: ['d3'], animate: 'pulse' },
        { duration: 5000, fen: 'r1b1k2r/ppppqppp/2n2n2/4N3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 1', text: "Ne5 FORKS Queen AND Knight! 💥", subtext: "Black must save one — White wins material!", highlight: ['e5','e7','c6'], arrows: [['e5','e7'],['e5','c6']], animate: 'pulse' },
        { duration: 4500, fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', text: "Royal Fork = King + Queen! 👑", subtext: "If a Knight forks King and Queen... GG!", highlight: ['d4'], animate: 'bounce' },
        { duration: 4000, fen: '2kr4/ppp2ppp/8/8/2q5/8/PPP2PPP/2KR4 w - - 0 1', text: "Rook & Pawn forks exist too!", subtext: "Any piece can fork — look for double attacks!", highlight: [], animate: null },
        { duration: 3500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "Pro Tip: Always look for forks! 👀", subtext: "Before every move, ask: Can I attack 2 things?", highlight: [], animate: 'bounce' }
      ],
      puzzle: { fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/3N1N2/PPPP1PPP/R1BQK2R w KQkq - 0 1', instruction: 'Find the fork! Which move attacks two pieces?', solution: 'd3e5', hint: 'The Knight on d3 can jump to attack two pieces...' },
      quiz: { question: "What is a fork?", options: ["Capturing 2 pieces in one move", "One piece attacks 2+ enemies at once", "Moving two pieces at once", "A special pawn move"], correct: 1, explanation: "A fork attacks 2+ enemy pieces simultaneously!" }
    }
  },
  {
    id: 'tactics_pin',
    title: 'Pins & Skewers',
    icon: '📌',
    description: 'Trap pieces on a line',
    xp: 25,
    color: '#be185d',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "Tactics: PINS & SKEWERS! 📌", subtext: "Use lines to trap enemy pieces!", highlight: [], animate: 'fadeIn' },
        { duration: 5000, fen: 'rnb1kbnr/pppp1ppp/8/4p3/7q/5NP1/PPPPPP1P/RNBQKB1R w KQkq - 0 1', text: "A PIN freezes a piece in place!", subtext: "The pinned piece can't move — something bigger is behind it!", highlight: [], animate: 'pulse' },
        { duration: 5000, fen: '2k5/8/8/8/B3r3/8/8/4K3 w - - 0 1', text: "Bishop PINS the Rook to the King!", subtext: "The Rook can't move — King would be in check!", highlight: ['a4','e4','c8'], arrows: [['a4','c8']], animate: 'slideUp' },
        { duration: 4500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "A SKEWER is a reverse pin!", subtext: "Attack the valuable piece FIRST — when it moves, take what's behind!", highlight: [], animate: 'pulse' },
        { duration: 4000, fen: '4k3/8/4q3/8/8/8/8/4R2K w - - 0 1', text: "Rook skewers King then Queen!", subtext: "Re8+ checks the King — King MUST move → Rook takes Queen!", highlight: ['e1','e7','e8'], arrows: [['e1','e8']], animate: 'slideRight' },
        { duration: 3500, fen: '4k3/4q3/8/8/4R3/8/8/4K3 w - - 0 1', text: "Remember: Pins & Skewers use LINES 📏", subtext: "Bishops, Rooks, Queens — all sliding pieces!", highlight: ['e4','e7','e8'], animate: 'bounce' }
      ],
      puzzle: { fen: '8/8/5k2/8/3r4/8/8/B3K3 w - - 0 1', instruction: 'Pin the Rook to the King with your Bishop!', solution: 'a1b2', hint: 'Move the Bishop to b2 — it pins the Rook on d4 to the King on f6 along the diagonal!' },
      quiz: { question: "What's the difference between a pin and a skewer?", options: ["They're the same", "Pin: less valuable in front. Skewer: more valuable in front", "Pins use Bishops, Skewers use Rooks", "There is no difference"], correct: 1, explanation: "Pin = less valuable protects more valuable. Skewer = more valuable is attacked first!" }
    }
  },
  {
    id: 'endgame',
    title: 'Basic Endgames',
    icon: '🏁',
    description: 'Finish the game strong',
    xp: 30,
    color: '#059669',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "Endgame Basics 🏁", subtext: "When most pieces are gone — endgame skills decide the winner!", highlight: [], animate: 'fadeIn' },
        { duration: 4500, fen: '8/4k3/8/8/8/8/4P3/4K3 w - - 0 1', text: "King + Pawn vs King", subtext: "The pawn wants to PROMOTE to a Queen!", highlight: ['e2','e7'], arrows: [['e2','e4']], animate: 'slideUp' },
        { duration: 4500, fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', text: "The King must LEAD the pawn!", subtext: "Put your King IN FRONT of the pawn, not behind!", highlight: ['e1','e2'], arrows: [['e1','d2']], animate: 'pulse' },
        { duration: 5000, fen: '8/8/4K3/8/4k3/8/8/4R3 w - - 0 1', text: "Rook + King vs King = Checkmate!", subtext: "Push the enemy King to the edge of the board", highlight: ['e6','e1'], animate: 'pulse' },
        { duration: 4500, fen: 'k7/8/1K6/8/8/8/8/R7 w - - 0 1', text: "Box them in! Then checkmate! ♚", subtext: "Ra8# — Rook delivers checkmate on the back rank!", highlight: ['a1','a8'], arrows: [['a1','a8']], animate: 'slideRight' },
        { duration: 4000, fen: '5k2/5P2/5K2/8/8/8/8/8 b - - 0 1', text: "Stalemate = DRAW! ⚠️", subtext: "Black's turn but NO legal moves — it's a DRAW, not a win!", highlight: ['f8'], animate: 'bounce' }
      ],
      puzzle: { fen: 'k7/8/1K6/8/8/8/8/R7 w - - 0 1', instruction: 'Deliver checkmate!', solution: 'a1a8', hint: 'The Rook can checkmate on the back rank!' },
      quiz: { question: "What happens in stalemate?", options: ["The player in stalemate loses", "The game is a DRAW", "The player in stalemate wins", "Nothing"], correct: 1, explanation: "Stalemate = DRAW! Be careful not to stalemate when you're winning!" }
    }
  },
  {
    id: 'special_moves',
    title: 'Special Moves',
    icon: '✨',
    description: 'En passant & promotion',
    xp: 20,
    color: '#6d28d9',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "Special Moves! ✨", subtext: "Two tricky rules every player must know!", highlight: [], animate: 'fadeIn' },
        { duration: 5000, fen: '8/8/8/3Pp3/8/8/8/8 w - e6 0 1', text: "En Passant (In Passing) 🇫🇷", subtext: "When a pawn advances 2 squares, you can capture it 'in passing'!", highlight: ['d5','e5','e6'], arrows: [['d5','e6']], animate: 'pulse' },
        { duration: 4500, fen: '8/8/3P4/8/8/8/8/8 w - - 0 1', text: "After en passant, the pawn is gone!", subtext: "This only works on the VERY NEXT move!", highlight: ['d6','e5'], animate: null },
        { duration: 4500, fen: '8/4P3/8/8/8/8/8/4K3 w - - 0 1', text: "Pawn Promotion! 👑", subtext: "When a pawn reaches the last rank, it becomes ANY piece!", highlight: ['e7'], arrows: [['e7','e8']], animate: 'slideUp' },
        { duration: 4000, fen: '4Q3/8/8/8/8/8/8/4K3 w - - 0 1', text: "99% of the time: promote to QUEEN! ♛", subtext: "The Queen is the most powerful piece!", highlight: ['e8'], animate: 'pulse' },
        { duration: 3500, fen: '8/4P3/8/8/8/8/8/4K3 w - - 0 1', text: "Now you know all the special rules! 🎉", subtext: "En passant catches players off guard — use it!", highlight: ['e7'], arrows: [['e7','e8']], animate: 'bounce' }
      ],
      puzzle: { fen: '3k4/4P3/8/8/8/8/8/4K3 w - - 0 1', instruction: 'Promote your pawn! Push it to the last rank!', solution: 'e7e8q', hint: 'Move the pawn to e8 — it becomes a Queen!' },
      quiz: { question: "When can you do en passant?", options: ["Any time", "Only when the enemy pawn just moved 2 squares", "When your pawn reaches the end", "Never in real games"], correct: 1, explanation: "En passant only works immediately after a pawn's 2-square advance!" }
    }
  },
  // ===== ADDITIONAL LESSONS =====
  {
    id: 'discovered_attack',
    title: 'Discovered Attacks',
    icon: '💣',
    description: 'Hidden attackers revealed!',
    xp: 25,
    color: '#c026d3',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQR1K1 w kq - 0 1', text: "Discovered Attacks! 💣", subtext: "Move one piece to unleash another!", highlight: ['f3','e1'], animate: 'fadeIn' },
        { duration: 5000, fen: 'r1bqk2r/pppp1ppp/2n5/4N3/2B1n3/8/PPPP1PPP/RNBQR1K1 b kq - 0 1', text: "Nxe5 DISCOVERS the Rook on e1!", subtext: "The Knight moved, revealing the Rook's attack on the King!", highlight: ['e5','e1','e8'], arrows: [['e1','e8']], animate: 'pulse' },
        { duration: 5000, fen: 'rnbqk2r/pppp1ppp/5n2/4p1B1/2B1P3/5N2/PPPP1PPP/RN1QK2R b KQkq - 0 1', text: "Discovered CHECK = devastating! ♚", subtext: "Bishop moves to g5, revealing check from the other Bishop!", highlight: ['g5','c4','e8'], arrows: [['c4','f7']], animate: 'pulse' },
        { duration: 4500, fen: 'r1bk3r/ppppqppp/2n2n2/4N3/2B5/8/PPPP1PPP/RNBQR1K1 w - - 0 1', text: "Double Check = UNSTOPPABLE! ⚡", subtext: "Knight AND Rook both give check — King MUST move!", highlight: ['e5','e1','d8'], arrows: [['e5','c6'],['e1','e7']], animate: 'bounce' },
        { duration: 4000, fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQR1K1 w kq - 0 1', text: "Look for pieces lined up on files & diagonals!", subtext: "Move the front piece to unleash the back one!", highlight: ['f3','e1'], arrows: [['f3','e5']], animate: 'pulse' },
        { duration: 3500, fen: 'r1bqk2r/pppp1ppp/2n5/4N3/2B1n3/8/PPPP1PPP/RNBQR1K1 b kq - 0 1', text: "Pro Tip: Set up discoveries early! 🧠", subtext: "Stack your pieces on open lines!", highlight: ['e5','e1'], animate: 'bounce' }
      ],
      puzzle: { fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQR1K1 w kq - 0 1', instruction: 'Find the discovered attack!', solution: 'f3e5', hint: 'Move the Knight to reveal the Rook!' },
      quiz: { question: "What is a discovered attack?", options: ["Attacking a hidden piece", "Moving one piece to reveal an attack by another", "Finding the opponent's weakness", "A surprise opening move"], correct: 1, explanation: "A discovered attack reveals an attack by a piece behind the one that moved!" }
    }
  },
  {
    id: 'back_rank',
    title: 'Back Rank Mate',
    icon: '💀',
    description: 'The deadly back rank',
    xp: 25,
    color: '#991b1b',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', text: "Back Rank Mate! 💀", subtext: "The most common checkmate pattern!", highlight: [], animate: 'fadeIn' },
        { duration: 5000, fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', text: "The King is trapped by its OWN pawns!", subtext: "f7, g7, h7 block the King's escape", highlight: ['f7','g7','h7','g8'], animate: 'pulse' },
        { duration: 5000, fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', text: "Ra8# — CHECKMATE! 🏆", subtext: "Rook slides to the back rank, no escape!", highlight: ['a1','a8'], arrows: [['a1','a8']], animate: 'slideRight' },
        { duration: 4500, fen: '6k1/5pp1/7p/8/8/8/8/R3K3 w - - 0 1', text: "h6 gives the King a LUFT (escape hole)", subtext: "Always give your King breathing room!", highlight: ['h6'], animate: 'pulse' },
        { duration: 4000, fen: '1r4k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1', text: "Both sides can be vulnerable!", subtext: "Watch YOUR back rank too!", highlight: ['b1','b8'], animate: null },
        { duration: 3500, fen: '8/8/8/8/8/8/8/8 w - - 0 1', text: "Prevention: make a luft (h3 or a3)!", subtext: "One pawn push saves you from disaster!", highlight: [], animate: 'bounce' }
      ],
      puzzle: { fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', instruction: 'Deliver back rank checkmate!', solution: 'a1a8', hint: 'Slide the Rook to the 8th rank!' },
      quiz: { question: "How do you prevent back rank mate?", options: ["Never use your rook", "Make a luft (push a pawn to give King escape)", "Always keep your Queen near the King", "Castle twice"], correct: 1, explanation: "A luft (h3, g3, a3 etc.) gives your King an escape square!" }
    }
  },
  {
    id: 'piece_value',
    title: 'Piece Values',
    icon: '💰',
    description: 'Know what pieces are worth',
    xp: 15,
    color: '#ca8a04',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: "Piece Values 💰", subtext: "Know what each piece is worth!", highlight: [], animate: 'fadeIn' },
        { duration: 4500, fen: '8/8/8/4P3/8/8/8/8 w - - 0 1', text: "Pawn = 1 point ♟️", subtext: "The building blocks of chess!", highlight: ['e5'], animate: 'pulse' },
        { duration: 4500, fen: '8/8/8/4N3/8/8/8/8 w - - 0 1', text: "Knight = 3 points ♞", subtext: "Tricky jumper, great for forks!", highlight: ['e5'], animate: 'pulse' },
        { duration: 4500, fen: '8/8/8/4B3/8/8/8/8 w - - 0 1', text: "Bishop = 3 points ♗", subtext: "Long-range diagonal sniper!", highlight: ['e5'], animate: 'pulse' },
        { duration: 4500, fen: '8/8/8/4R3/8/8/8/8 w - - 0 1', text: "Rook = 5 points ♖", subtext: "Dominates files and ranks!", highlight: ['e5'], animate: 'pulse' },
        { duration: 4500, fen: '8/8/8/4Q3/8/8/8/8 w - - 0 1', text: "Queen = 9 points ♕", subtext: "The MOST powerful piece! Protect her!", highlight: ['e5'], animate: 'pulse' },
        { duration: 4000, fen: '8/8/8/4K3/8/8/8/8 w - - 0 1', text: "King = PRICELESS! ♔", subtext: "Lose the King = lose the game! ♾️", highlight: ['e5'], animate: 'bounce' },
        { duration: 3500, fen: '4k3/8/8/3b4/4R3/8/8/4K3 w - - 0 1', text: "Trade UP, not DOWN! 📈", subtext: "Your Rook (5) for their Bishop (3)? Bad trade! But Bishop for Rook? Great!", highlight: ['e4','d5'], animate: 'bounce' }
      ],
      puzzle: { fen: '4k3/8/8/3n4/8/8/8/4KR2 w - - 0 1', instruction: 'Should you capture the Knight with your Rook? No! Find a better move.', solution: 'f1f8', hint: 'Dont trade your Rook (5) for a Knight (3) — use it to checkmate instead!' },
      quiz: { question: "Which trade is good for you?", options: ["Your Queen for their Rook", "Your Bishop for their Rook", "Your Rook for their Pawn", "Your Knight for their Queen"], correct: 1, explanation: "Trading a Bishop (3) for a Rook (5) = you gain 2 points of material!" }
    }
  },
  {
    id: 'pattern_smothered',
    title: 'Smothered Mate',
    icon: '🐴',
    description: 'The Knights masterpiece',
    xp: 30,
    color: '#4338ca',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: '6rk/5Npp/8/8/8/8/8/Q5K1 w - - 0 1', text: "Smothered Mate! 🐴", subtext: "The most beautiful checkmate in chess!", highlight: ['f7','h8'], animate: 'fadeIn' },
        { duration: 5000, fen: '6rk/5Npp/8/8/8/8/8/Q5K1 w - - 0 1', text: "The Knight is the ONLY piece that can do this!", subtext: "Because it JUMPS over other pieces!", highlight: ['f7'], animate: 'pulse' },
        { duration: 5000, fen: '6rk/5Npp/8/8/8/8/8/Q5K1 w - - 0 1', text: "Knight on f7 gives check!", subtext: "King is forced to h8 corner...", highlight: ['f7','h8'], arrows: [['f7','h8']], animate: 'pulse' },
        { duration: 5000, fen: 'Q5rk/5Npp/8/8/8/8/8/6K1 w - - 0 1', text: "Queen sacrifices on g8!! Qg8+!!", subtext: "Rook MUST capture! Rxg8...", highlight: ['a8','g8'], arrows: [['a8','g8']], animate: 'pulse' },
        { duration: 5000, fen: '6rk/5Npp/8/8/8/8/8/6K1 w - - 0 1', text: "Nf7# — SMOTHERED MATE! 💥", subtext: "King can't move — blocked by its own pieces!", highlight: ['f7','h8','g8','g7','h7'], animate: 'bounce' },
        { duration: 3500, fen: '6rk/5Npp/8/8/8/8/8/Q5K1 w - - 0 1', text: "Look for this when the King is in the corner! 👀", subtext: "Knight + Queen sacrifice = perfection!", highlight: ['f7','a1'], animate: 'bounce' }
      ],
      puzzle: { fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1', instruction: 'Deliver the smothered mate! The King is trapped!', solution: 'h6f7', hint: 'The Knight jumps to f7 — the King is smothered by its own pieces!' },
      quiz: { question: "Why can only a Knight deliver smothered mate?", options: ["It's the strongest piece", "It can jump over blocking pieces", "It moves in an L-shape", "It's the smallest piece"], correct: 1, explanation: "Only the Knight can jump over the pieces surrounding the King!" }
    }
  },
  {
    id: 'middlegame',
    title: 'Middlegame Strategy',
    icon: '🧠',
    description: 'Think like a grandmaster',
    xp: 30,
    color: '#0f766e',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', text: "Middlegame Strategy 🧠", subtext: "The opening is over — now what?", highlight: [], animate: 'fadeIn' },
        { duration: 5000, fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', text: "Step 1: Make a PLAN! 📋", subtext: "Don't just move randomly — have a goal!", highlight: [], animate: 'pulse' },
        { duration: 5000, fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', text: "Look for WEAK squares & pawns", subtext: "Undefended pawns are targets! Attack them!", highlight: ['d6','d3'], animate: 'pulse' },
        { duration: 4500, fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', text: "Connect your ROOKS on the back rank!", subtext: "Rooks are strongest on open files!", highlight: ['a1','f1'], arrows: [['a1','f1']], animate: null },
        { duration: 4500, fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', text: "Knights love OUTPOSTS! 🐴", subtext: "A square protected by your pawn where enemy pawns can't kick it out", highlight: ['e5','d5'], animate: 'pulse' },
        { duration: 4000, fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', text: "Remember: Improve your WORST piece! 🔧", subtext: "Every move should make your position better!", highlight: ['c1'], arrows: [['c1','e3']], animate: 'bounce' }
      ],
      puzzle: { fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1', instruction: 'Improve your worst piece! Develop the bishop.', solution: 'c1e3', hint: 'The bishop on c1 is doing nothing — bring it to e3!' },
      quiz: { question: "What should you do in the middlegame?", options: ["Move pawns randomly", "Make a plan and improve your pieces", "Trade all pieces immediately", "Only attack the King"], correct: 1, explanation: "A plan + active pieces = winning middlegame strategy!" }
    }
  },
  {
    id: 'scholars_mate',
    title: "Scholar's Mate",
    icon: '⚡',
    description: 'The 4-move checkmate (& how to stop it)',
    xp: 20,
    color: '#b91c1c',
    locked: false,
    video: {
      scenes: [
        { duration: 3500, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', text: "Scholar's Mate ⚡", subtext: "The famous 4-move checkmate!", highlight: [], animate: 'fadeIn' },
        { duration: 4500, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', text: "1. e4 — Center pawn", subtext: "Normal opening move...", highlight: ['e4'], animate: null },
        { duration: 4500, fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5Q2/PPPP1PPP/RNB1KBNR b KQkq - 0 1', text: "2. Qf3?! — Queen comes out early!", subtext: "Aiming at f7... the weakest square!", highlight: ['f3','f7'], arrows: [['f3','f7']], animate: 'pulse' },
        { duration: 4500, fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 1', text: "3. Bc4 — Bishop ALSO aims at f7!", subtext: "Two pieces attacking one weak spot!", highlight: ['c4','f7'], arrows: [['c4','f7'],['f3','f7']], animate: 'pulse' },
        { duration: 5000, fen: 'rnbqkb1r/pppp1Qpp/5n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1', text: "4. Qxf7# — CHECKMATE! 💀", subtext: "King can't escape! Game over in 4 moves!", highlight: ['f7','e8'], animate: 'bounce' },
        { duration: 5000, fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 1', text: "HOW TO STOP IT: Play Nf6! 🛡️", subtext: "Nf6 defends AND develops — never fall for this!", highlight: ['f6','f7'], arrows: [['f6','f7']], animate: 'pulse' }
      ],
      puzzle: { fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 1', instruction: 'You are Black! Stop the Scholar\'s Mate threat on f7!', solution: 'g8f6', hint: 'Develop your Knight to f6 — it defends f7 AND develops a piece!' },
      quiz: { question: "What's the best defense against Scholar's Mate?", options: ["Move your King", "Play Nf6 — develop and defend!", "Push pawns", "Ignore it"], correct: 1, explanation: "Nf6 blocks the Queen's attack on f7 AND develops a piece!" }
    }
  },
  {
    id: 'practice',
    title: 'Free Practice',
    icon: '🎯',
    description: 'Practice on the board!',
    xp: 0,
    color: '#475569',
    locked: false,
    isPractice: true,
    video: { scenes: [], quiz: { question: "", options: [""], correct: 0, explanation: "" } }
  }
];

// Helper: manually move a piece in FEN (for educational boards without kings)
function manualMoveFen(fen, from, to) {
  try {
    const parts = fen.split(' ');
    const rows = parts[0].split('/');

    const fileToIdx = (f) => f.charCodeAt(0) - 97;
    const rankToRow = (r) => 8 - parseInt(r);

    // Expand FEN rows to 8-char arrays
    const board = rows.map(row => {
      let expanded = '';
      for (const ch of row) {
        if (ch >= '1' && ch <= '8') expanded += '.'.repeat(parseInt(ch));
        else expanded += ch;
      }
      return expanded.split('');
    });

    const fromRow = rankToRow(from[1]);
    const fromCol = fileToIdx(from[0]);
    const toRow = rankToRow(to[1]);
    const toCol = fileToIdx(to[0]);

    const piece = board[fromRow][fromCol];
    if (piece === '.') return null;

    board[fromRow][fromCol] = '.';
    board[toRow][toCol] = piece;

    // Compress back to FEN
    const newRows = board.map(row => {
      let fenRow = '';
      let emptyCount = 0;
      for (const cell of row) {
        if (cell === '.') { emptyCount++; }
        else {
          if (emptyCount > 0) { fenRow += emptyCount; emptyCount = 0; }
          fenRow += cell;
        }
      }
      if (emptyCount > 0) fenRow += emptyCount;
      return fenRow;
    });

    parts[0] = newRows.join('/');
    return parts.join(' ');
  } catch (e) {
    return null;
  }
}

// ============ MAIN LEARN COMPONENT ============
const Learn = () => {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const { customPieces, currentTheme } = useBoardSettings();
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
    window.scrollTo(0, 0);
  };

  if (selectedLesson) {
    if (selectedLesson.isPractice) {
      return (
        <LessonErrorBoundary onReset={() => { setSelectedLesson(null); window.scrollTo(0, 0); }}>
          <PracticeBoard customPieces={customPieces} currentTheme={currentTheme} onExit={() => { setSelectedLesson(null); window.scrollTo(0, 0); }} />
        </LessonErrorBoundary>
      );
    }
    return (
      <LessonErrorBoundary onReset={() => { setSelectedLesson(null); window.scrollTo(0, 0); }}>
        <LessonPlayer 
          lesson={selectedLesson} 
          customPieces={customPieces}
          currentTheme={currentTheme}
          onComplete={() => {
            completeLesson(selectedLesson.id, selectedLesson.xp);
            setSelectedLesson(null);
          }}
          onExit={() => { setSelectedLesson(null); window.scrollTo(0, 0); }}
        />
      </LessonErrorBoundary>
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

      <style>{`
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

// ============ ERROR BOUNDARY ============
class LessonErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>⚠️ Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>The lesson hit an error. Click below to go back.</p>
          <button onClick={() => { this.setState({ hasError: false }); this.props.onReset(); }} 
            style={{ marginTop: 20, padding: '12px 24px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: '1rem' }}>
            ← Back to Lessons
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============ LESSON PLAYER (VIDEO + QUIZ) ============
const LessonPlayer = ({ lesson, customPieces, currentTheme, onComplete, onExit }) => {
  const [phase, setPhase] = useState('video'); // 'video', 'puzzle', 'quiz', 'complete'
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showText, setShowText] = useState(false);
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

    // Handle move animation — actually execute the move on the board
    let moveTimer;
    if (scene.moveAnimation) {
      moveTimer = setTimeout(() => {
        try {
          const { from, to, promotion, capture, castle } = scene.moveAnimation;
          // Try to make the move with chess.js
          const tempGame = new Chess(scene.fen);
          const moveResult = tempGame.move({ from, to, promotion: promotion ? 'q' : undefined });
          if (moveResult) {
            setCurrentFen(tempGame.fen());
          } else {
            // If chess.js rejects (educational FEN without kings), manually update
            // by reconstructing FEN with piece moved
            const newFen = manualMoveFen(scene.fen, from, to);
            if (newFen) setCurrentFen(newFen);
          }
        } catch (e) {
          // For educational FENs without kings, do manual move
          const newFen = manualMoveFen(scene.fen, scene.moveAnimation.from, scene.moveAnimation.to);
          if (newFen) setCurrentFen(newFen);
        }
      }, 1500);
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
      clearTimeout(moveTimer);
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
              customBoardStyle={{
                borderRadius: '8px',
              }}
              customDarkSquareStyle={{ backgroundColor: currentTheme?.darkSquare || '#769656' }}
              customLightSquareStyle={{ backgroundColor: currentTheme?.lightSquare || '#eeeed2' }}
              customPieces={customPieces}
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
          customPieces={customPieces}
          currentTheme={currentTheme}
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

      <style>{`
        .lesson-player {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .lesson-player > * {
          max-width: 100%;
          width: 100%;
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
          margin: 0 auto !important;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .text-bubble {
          background: var(--bg-card);
          padding: 20px 30px;
          border-radius: 20px;
          margin-bottom: 24px;
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.5s ease;
          width: 100%;
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
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          margin: 0 auto !important;
          display: flex;
          justify-content: center;
          align-items: center;
          width: fit-content;
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
const PuzzleChallenge = ({ puzzle, onComplete, customPieces, currentTheme }) => {
  const [game, setGame] = useState(new Chess(puzzle.fen));
  const [showHint, setShowHint] = useState(false);
  
  // Determine board orientation from FEN (who moves)
  const boardOrientation = puzzle.fen.includes(' b ') ? 'black' : 'white';

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
          boardOrientation={boardOrientation}
          snapToCursor={true}
          customDarkSquareStyle={{ backgroundColor: currentTheme?.darkSquare || '#769656' }}
          customLightSquareStyle={{ backgroundColor: currentTheme?.lightSquare || '#eeeed2' }}
          customPieces={customPieces}
        />
      </div>

      <button className="hint-btn" onClick={() => setShowHint(true)}>
        💡 Need a hint?
      </button>
      
      {showHint && (
        <p className="hint-text">{puzzle.hint}</p>
      )}

      <style>{`
        .puzzle-challenge {
          max-width: 500px;
          margin: 0 auto !important;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
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
          display: flex;
          justify-content: center;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          margin: 0 auto !important;
          width: fit-content;
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

// ============ PRACTICE BOARD COMPONENT ============
const PracticeBoard = ({ customPieces, currentTheme, onExit }) => {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState([]);

  const onDrop = (sourceSquare, targetSquare) => {
    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move === null) return false;
    setGame(gameCopy);
    setMoveHistory(prev => [...prev, move.san]);
    
    if (gameCopy.isCheckmate()) {
      toast.success('Checkmate! 🏆');
      confetti({ particleCount: 100, spread: 70 });
    } else if (gameCopy.isDraw()) {
      toast('Draw! 🤝');
    } else if (gameCopy.isCheck()) {
      toast('Check! ⚔️');
    }
    return true;
  };

  const resetBoard = () => {
    setGame(new Chess());
    setMoveHistory([]);
  };

  const undoMove = () => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    setMoveHistory(prev => prev.slice(0, -1));
  };

  return (
    <div className="practice-board-page">
      <div className="practice-header">
        <button className="exit-btn" onClick={onExit}>✕ Back</button>
        <h2>🎯 Free Practice</h2>
      </div>
      
      <div className="practice-layout">
        <div className="board-section">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onDrop}
            boardWidth={Math.min(450, window.innerWidth - 40)}
            customDarkSquareStyle={{ backgroundColor: currentTheme?.darkSquare || '#769656' }}
            customLightSquareStyle={{ backgroundColor: currentTheme?.lightSquare || '#eeeed2' }}
            customPieces={customPieces}
          />
          <div className="practice-controls">
            <button onClick={undoMove} disabled={moveHistory.length === 0}>↩️ Undo</button>
            <button onClick={resetBoard}>🔄 Reset</button>
            <button onClick={() => {
              setGame(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'));
              setMoveHistory(['e4']);
            }}>♟️ Start from e4</button>
          </div>
        </div>

        <div className="moves-panel">
          <h3>Moves</h3>
          <div className="move-list">
            {moveHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Make a move to start!</p>
            ) : (
              moveHistory.map((move, i) => (
                <span key={i} className={`move ${i % 2 === 0 ? 'white' : 'black'}`}>
                  {i % 2 === 0 && <span className="move-num">{Math.floor(i/2)+1}.</span>}
                  {move}
                </span>
              ))
            )}
          </div>
          <div className="turn-indicator">
            {game.turn() === 'w' ? '⬜ White to move' : '⬛ Black to move'}
          </div>
        </div>
      </div>

      <style>{`
        .practice-board-page { max-width: 800px; margin: 0 auto; padding: 20px; }
        .practice-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
        .practice-header h2 { font-size: 1.5rem; }
        .exit-btn { padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); cursor: pointer; }
        .practice-layout { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
        .board-section { text-align: center; }
        .board-section > div:first-of-type { border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: inline-block; }
        .practice-controls { display: flex; gap: 8px; margin-top: 16px; justify-content: center; flex-wrap: wrap; }
        .practice-controls button { padding: 10px 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-primary); cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
        .practice-controls button:hover { border-color: var(--accent-primary); transform: translateY(-2px); }
        .practice-controls button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .moves-panel { background: var(--bg-card); border-radius: 12px; padding: 16px; min-width: 200px; max-height: 400px; border: 1px solid var(--border-color); }
        .moves-panel h3 { margin-bottom: 12px; }
        .move-list { display: flex; flex-wrap: wrap; gap: 4px; max-height: 300px; overflow-y: auto; }
        .move { padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.9rem; }
        .move.white { background: rgba(255,255,255,0.1); }
        .move.black { background: rgba(0,0,0,0.2); }
        .move-num { color: var(--text-muted); margin-right: 2px; }
        .turn-indicator { margin-top: 12px; padding: 8px; text-align: center; background: var(--bg-tertiary); border-radius: 8px; font-weight: 600; }
      `}</style>
    </div>
  );
};

const LearnWrapped = () => (
  <LearnErrorBoundary>
    <Learn />
  </LearnErrorBoundary>
);

export default LearnWrapped;