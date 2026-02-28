import React, { useState, useEffect, useCallback, useMemo, useRef, Component } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FaShieldAlt, FaArrowLeft, FaRedo, FaArrowRight, FaChessKnight } from 'react-icons/fa';
import { useBoardSettings } from '../contexts/BoardSettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import defenseOpenings from '../data/defenseOpenings';

// Error boundary
class DefensePlayerErrorBoundary extends Component {
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
          <h2>Something went wrong</h2>
          <p style={{ color: '#4da6ff' }}>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MODES = [
  { id: 'guided', label: 'Guided', emoji: '🎓', desc: 'Arrows and explanations guide you through the defense' },
  { id: 'unguided', label: 'Test', emoji: '⚔️', desc: 'No hints — find the correct defense on your own' },
];

const DefenseOpeningPlayer = () => {
  const { defenseId } = useParams();
  const navigate = useNavigate();
  const { currentTheme, customPieces } = useBoardSettings();
  const { theme } = useTheme();
  const successGreen = theme === 'light' ? '#0a6e2e' : '#10b981';

  const defense = useMemo(() => defenseOpenings.find(d => d.id === defenseId), [defenseId]);
  const defenseIndex = useMemo(() => defenseOpenings.findIndex(d => d.id === defenseId), [defenseId]);

  const [game, setGame] = useState(new Chess());
  const [currentStep, setCurrentStep] = useState(0);
  const [mode, setMode] = useState('guided');
  const [moveHistory, setMoveHistory] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [wrongMove, setWrongMove] = useState(false);
  const [trapTriggered, setTrapTriggered] = useState(false);
  const [trapText, setTrapText] = useState('');
  const [highlightSquares, setHighlightSquares] = useState({});
  const [arrows, setArrows] = useState([]);
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);

  // Use refs for scoring to avoid stale closure bugs in triggerVictory
  const correctFirstTryRef = useRef(0);
  const totalPlayerMovesRef = useRef(0);
  const attemptsThisStepRef = useRef(0);

  // Also keep state versions for UI rendering
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [totalPlayerMoves, setTotalPlayerMoves] = useState(0);

  // Timer management (mirrors KillerOpeningPlayer pattern)
  const timersRef = useRef([]);
  const gameSessionRef = useRef(0);

  const safeTimeout = useCallback((fn, delay) => {
    const session = gameSessionRef.current;
    const timer = setTimeout(() => {
      if (gameSessionRef.current === session) {
        fn();
      }
    }, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Make bot's attacker move on the board
  const makeBotMove = useCallback((moveStr) => {
    setGame(prev => {
      const newGame = new Chess(prev.fen());
      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      try {
        newGame.move({ from, to, promotion: 'q' });
      } catch (e) {
        console.warn('Bot move failed:', moveStr, e);
      }
      return newGame;
    });
    setMoveHistory(prev => [...prev, moveStr]);
  }, []);

  // Show guided hints for the current step
  const showGuidedHints = useCallback((step) => {
    if (mode !== 'guided' || !step?.defensiveMove) return;
    const from = step.defensiveMove.substring(0, 2);
    const to = step.defensiveMove.substring(2, 4);
    setArrows([[from, to, '#22c55e']]);
    setHighlightSquares({
      [from]: { backgroundColor: 'rgba(34, 197, 94, 0.35)' },
      [to]: { backgroundColor: 'rgba(34, 197, 94, 0.35)' },
    });
  }, [mode]);

  // Set up a step for player input — show the attacker explanation and hints
  const promptPlayerForStep = useCallback((stepIndex) => {
    if (!defense) return;
    const step = defense.steps[stepIndex];
    if (!step) return;

    setExplanation(step.attackerExplanation);
    setWaitingForPlayer(true);
    attemptsThisStepRef.current = 0;

    // Show guided hints after a short delay
    safeTimeout(() => {
      showGuidedHints(step);
      if (mode === 'guided' && step.defenseExplanation) {
        setExplanation(prev => prev + '\n\n💡 ' + step.defenseExplanation);
      }
    }, 400);
  }, [defense, safeTimeout, showGuidedHints, mode]);

  // Play the bot's attacker move for a given step, then wait for player
  const playAttackerMove = useCallback((stepIndex) => {
    if (!defense) return;
    const step = defense.steps[stepIndex];
    if (!step) return;

    setIsThinking(true);
    setExplanation('Opponent is preparing their move...');
    setArrows([]);
    setHighlightSquares({});

    safeTimeout(() => {
      makeBotMove(step.attackerMove);
      setIsThinking(false);
      promptPlayerForStep(stepIndex);
    }, 800 + Math.random() * 400);
  }, [defense, makeBotMove, safeTimeout, promptPlayerForStep]);

  // Play the bot's response (attackerMove) for white-first defenses
  // After user's move at stepIndex, bot responds with that step's attackerMove
  const playBotResponse = useCallback((stepIndex, nextStepIndex) => {
    if (!defense) return;
    const step = defense.steps[stepIndex];
    if (!step) return;

    setIsThinking(true);
    setExplanation('Opponent responding...');
    setArrows([]);
    setHighlightSquares({});

    safeTimeout(() => {
      makeBotMove(step.attackerMove);
      setIsThinking(false);

      // Now set up the next step for the player
      const nextStep = defense.steps[nextStepIndex];
      if (nextStep) {
        setCurrentStep(nextStepIndex);
        promptPlayerForStep(nextStepIndex);
      }
    }, 800 + Math.random() * 400);
  }, [defense, makeBotMove, safeTimeout, promptPlayerForStep]);

  // Reset the game
  const resetGame = useCallback(() => {
    clearAllTimers();
    gameSessionRef.current += 1;

    const newGame = new Chess();
    setGame(newGame);
    setCurrentStep(0);
    setMoveHistory([]);
    setExplanation(defense ? 'Get ready! The attacker is about to make their move...' : '');
    setIsThinking(false);
    setGameComplete(false);
    setWrongMove(false);
    setTrapTriggered(false);
    setTrapText('');
    setHighlightSquares({});
    setArrows([]);
    setWaitingForPlayer(false);
    correctFirstTryRef.current = 0;
    totalPlayerMovesRef.current = 0;
    attemptsThisStepRef.current = 0;
    setCorrectFirstTry(0);
    setTotalPlayerMoves(0);
  }, [defense, clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Reset when defense changes
  useEffect(() => {
    window.scrollTo(0, 0);
    resetGame();
  }, [defenseId, resetGame]);

  // Start first move after reset
  useEffect(() => {
    if (!defense || gameComplete || trapTriggered) return;
    if (currentStep === 0 && !waitingForPlayer && !isThinking && moveHistory.length === 0) {
      if (defense.playerColor === 'white') {
        // User moves first — show their first move hint
        const step = defense.steps[0];
        setWaitingForPlayer(true);
        attemptsThisStepRef.current = 0;
        setExplanation("You're White. Make your opening move!");
        safeTimeout(() => {
          showGuidedHints(step);
          if (mode === 'guided' && step.defenseExplanation) {
            setExplanation('You\'re White. ' + step.defenseExplanation);
          }
        }, 300);
      } else {
        // Bot moves first (attacker is white, user is black)
        playAttackerMove(0);
      }
    }
  }, [defense, currentStep, waitingForPlayer, isThinking, moveHistory.length, gameComplete, trapTriggered, playAttackerMove, safeTimeout, showGuidedHints, mode]);

  // Victory handler — reads from refs for accurate scoring
  const triggerVictory = useCallback(() => {
    setGameComplete(true);
    setWaitingForPlayer(false);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#4da6ff', '#17a2b8', '#10b981', '#3b82f6'],
    });

    // Read from refs (always current) instead of stale state
    const finalCorrect = correctFirstTryRef.current;
    const finalTotal = totalPlayerMovesRef.current;
    const score = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 100;

    if (mode === 'unguided') {
      toast.success(`Defence Complete! Score: ${score}%`, { icon: '🛡️', duration: 4000 });
    } else {
      toast.success('Defence Complete! You survived the trap!', { icon: '🛡️', duration: 4000 });
    }

    // Save progress
    try {
      const saved = JSON.parse(localStorage.getItem('defense_openings_progress') || '{}');
      if (!saved[defenseId]) saved[defenseId] = { completed: false, guided: false, unguided: false, mastered: false, bestScore: 0 };
      saved[defenseId].completed = true;
      saved[defenseId][mode] = true;
      if (mode === 'unguided') {
        saved[defenseId].bestScore = Math.max(saved[defenseId].bestScore || 0, score);
      }
      if (saved[defenseId].guided && saved[defenseId].unguided) {
        saved[defenseId].mastered = true;
      }
      localStorage.setItem('defense_openings_progress', JSON.stringify(saved));
    } catch (e) { /* ignore */ }
  }, [defenseId, mode]);

  // Unified drop handler for both white-first and black-first defenses
  const onDrop = useCallback((sourceSquare, targetSquare) => {
    if (gameComplete || trapTriggered || isThinking || !waitingForPlayer) return false;
    if (!defense) return false;

    const step = defense.steps[currentStep];
    if (!step || !step.defensiveMove) return false;

    const playerMove = sourceSquare + targetSquare;
    const expectedFrom = step.defensiveMove.substring(0, 2);
    const expectedTo = step.defensiveMove.substring(2, 4);

    // Check if it's the alternate defense
    let isAlternate = false;
    if (step.alternateDefense) {
      const altFrom = step.alternateDefense.substring(0, 2);
      const altTo = step.alternateDefense.substring(2, 4);
      if (sourceSquare === altFrom && targetSquare === altTo) {
        isAlternate = true;
      }
    }

    const isCorrect = (sourceSquare === expectedFrom && targetSquare === expectedTo) || isAlternate;

    // Check if the player fell for the trap
    if (!isCorrect && step.trapMove) {
      const trapFrom = step.trapMove.substring(0, 2);
      const trapTo = step.trapMove.substring(2, 4);
      if (sourceSquare === trapFrom && targetSquare === trapTo) {
        setTrapTriggered(true);
        setTrapText(step.trapWarning || "That's the trap move! Try again.");
        setWrongMove(true);
        setWaitingForPlayer(false);
        toast.error('You fell for the trap!', { icon: '💀', duration: 3000 });
        safeTimeout(() => setWrongMove(false), 1200);
        return false;
      }
    }

    if (!isCorrect) {
      // Wrong move (not the trap, just incorrect)
      setWrongMove(true);
      attemptsThisStepRef.current += 1;
      if (mode === 'guided') {
        toast.error('Not quite! Follow the green arrow.', { icon: '❌', duration: 2000 });
      } else {
        toast.error('Incorrect defense. Try again!', { icon: '❌', duration: 2000 });
      }
      safeTimeout(() => setWrongMove(false), 800);
      return false;
    }

    // Correct move!
    const newGame = new Chess(game.fen());
    try {
      newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch (e) {
      console.warn('Player move failed:', e);
      return false;
    }

    setGame(newGame);
    setMoveHistory(prev => [...prev, playerMove]);
    setArrows([]);
    setHighlightSquares({});
    setWaitingForPlayer(false);

    // Track scoring via refs (always current) and state (for UI)
    totalPlayerMovesRef.current += 1;
    setTotalPlayerMoves(totalPlayerMovesRef.current);
    if (attemptsThisStepRef.current === 0) {
      correctFirstTryRef.current += 1;
      setCorrectFirstTry(correctFirstTryRef.current);
    }

    // Show explanation
    if (isAlternate && step.alternateExplanation) {
      setExplanation('✅ ' + step.alternateExplanation);
    } else {
      setExplanation('✅ ' + step.defenseExplanation);
    }

    if (mode === 'unguided') {
      toast.success('Correct!', { icon: '✅', duration: 1500 });
    }

    // Check if defense is complete
    if (step.isDefenseComplete) {
      safeTimeout(() => triggerVictory(), 800);
      return true;
    }

    // What happens next depends on move order:
    const nextStepIndex = currentStep + 1;

    if (defense.playerColor === 'white') {
      // White-first: user just moved (defensiveMove). Bot responds with THIS step's attackerMove.
      // Then the next step starts with the user's next defensiveMove.
      safeTimeout(() => {
        playBotResponse(currentStep, nextStepIndex);
      }, 1000);
    } else {
      // Black-first: user just responded. Bot plays the NEXT step's attackerMove.
      setCurrentStep(nextStepIndex);
      safeTimeout(() => {
        if (defense.steps[nextStepIndex]) {
          playAttackerMove(nextStepIndex);
        }
      }, 1200);
    }

    return true;
  }, [game, defense, currentStep, mode, gameComplete, trapTriggered, isThinking, waitingForPlayer, triggerVictory, playAttackerMove, playBotResponse, safeTimeout]);

  // Next defense
  const nextDefense = useMemo(() => {
    if (defenseIndex < defenseOpenings.length - 1) {
      return defenseOpenings[defenseIndex + 1];
    }
    return null;
  }, [defenseIndex]);

  // Responsive board width
  const [boardWidth, setBoardWidth] = useState(() =>
    Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 32 : 480)
  );

  useEffect(() => {
    const handleResize = () => {
      setBoardWidth(Math.min(480, window.innerWidth - 32));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!defense) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Defense not found</h2>
        <Link to="/defense-openings" style={{ color: '#4da6ff' }}>Back to Defence Master</Link>
      </div>
    );
  }

  const scorePercent = totalPlayerMoves > 0 ? Math.round((correctFirstTry / totalPlayerMoves) * 100) : 0;

  return (
    <DefensePlayerErrorBoundary>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <Link to="/defense-openings" style={styles.backLink}>
            <FaArrowLeft /> Back to Defence Master
          </Link>
          <div style={styles.titleSection}>
            <span style={{ fontSize: 32 }}>{defense.emoji}</span>
            <div>
              <h1 style={styles.title}>{defense.name}</h1>
              <div style={styles.subtitle}>
                <FaShieldAlt style={{ fontSize: 12, color: '#4da6ff' }} />
                <span style={styles.moveCount}>{defense.totalMoves} moves | Defend as {defense.playerColor} | Bot attacks as {defense.attackerColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div style={styles.modeRow}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); resetGame(); }}
              style={{
                ...styles.modeBtn,
                ...(mode === m.id ? styles.modeBtnActive : {}),
              }}
              title={m.desc}
            >
              <span>{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Main Layout */}
        <div style={styles.layout}>
          {/* Board */}
          <div style={styles.boardContainer}>
            <div style={{
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: wrongMove ? '0 0 20px rgba(239,68,68,0.6)' : trapTriggered ? '0 0 20px rgba(239,68,68,0.8)' : '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'box-shadow 0.3s',
            }}>
              <Chessboard
                id="defense-opening-board"
                position={game.fen()}
                onPieceDrop={onDrop}
                snapToCursor={true}
                boardWidth={boardWidth}
                boardOrientation={defense.playerColor}
                customBoardStyle={{ borderRadius: '4px' }}
                customDarkSquareStyle={{ backgroundColor: currentTheme?.dark || '#769656' }}
                customLightSquareStyle={{ backgroundColor: currentTheme?.light || '#eeeed2' }}
                customPieces={customPieces}
                customArrows={arrows}
                customSquareStyles={highlightSquares}
                animationDuration={300}
                arePiecesDraggable={!gameComplete && !trapTriggered && !isThinking && waitingForPlayer}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div style={styles.sidebar}>
            {/* Step Counter */}
            <div style={styles.stepCounter}>
              Step {Math.min(currentStep + 1, defense.steps.length)} of {defense.steps.length}
              {mode === 'unguided' && totalPlayerMoves > 0 && (
                <span style={styles.scoreTag}>Score: {scorePercent}%</span>
              )}
              <div style={styles.stepBar}>
                <div style={{
                  ...styles.stepFill,
                  width: `${((currentStep + (gameComplete ? 1 : 0)) / defense.steps.length) * 100}%`,
                }} />
              </div>
            </div>

            {/* Explanation Panel */}
            <div style={{
              ...styles.explanationBox,
              borderColor: trapTriggered ? '#ef4444' : gameComplete ? '#10b981' : '#4da6ff',
            }}>
              {trapTriggered ? (
                <>
                  <div style={styles.trapHeader}>
                    <span>💀 YOU FELL FOR THE TRAP!</span>
                  </div>
                  <p style={styles.explanationText}>{trapText}</p>
                </>
              ) : gameComplete ? (
                <>
                  <div style={{ ...styles.trapHeader, color: successGreen }}>
                    <span>🛡️ DEFENCE COMPLETE!</span>
                  </div>
                  <p style={styles.explanationText}>{explanation}</p>
                  {mode === 'unguided' && (
                    <div style={styles.finalScore}>
                      <strong>Final Score:</strong> {correctFirstTry}/{totalPlayerMoves} correct on first try ({scorePercent}%)
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isThinking ? (
                    <div style={styles.thinkingDots}>
                      <FaChessKnight style={{ animation: 'pulse 1s infinite' }} /> Attacker is thinking...
                    </div>
                  ) : (
                    <p style={styles.explanationText}>{explanation}</p>
                  )}
                </>
              )}
            </div>

            {/* Move History */}
            <div style={styles.moveHistoryBox}>
              <h4 style={styles.moveHistoryTitle}>Move History</h4>
              <div style={styles.moveList}>
                {moveHistory.length === 0 ? (
                  <span style={{ color: '#c8c8dc', fontSize: 13 }}>No moves yet...</span>
                ) : (
                  moveHistory.map((move, i) => (
                    <span key={i} style={{
                      ...styles.moveBadge,
                      background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent',
                    }}>
                      {i % 2 === 0 && <span style={styles.moveNum}>{Math.floor(i / 2) + 1}.</span>}
                      {move.substring(0, 2)}-{move.substring(2, 4)}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button onClick={resetGame} style={styles.resetBtn}>
                <FaRedo /> {trapTriggered ? 'Try Again' : 'Reset'}
              </button>
              {(gameComplete || trapTriggered) && nextDefense && (
                <button
                  onClick={() => navigate(`/defense-openings/${nextDefense.id}`)}
                  style={styles.nextBtn}
                >
                  Next: {nextDefense.name} <FaArrowRight />
                </button>
              )}
            </div>

            {/* Key Idea */}
            <div style={styles.keyIdeaBox}>
              <strong>🔑 Key Idea:</strong> {defense.keyIdea}
            </div>

            {/* Mode description */}
            <div style={styles.modeDesc}>
              {mode === 'guided' ? (
                <>🎓 <strong>Guided Mode</strong> — Green arrows show the correct defense. Full explanations after each move.</>
              ) : (
                <>⚔️ <strong>Test Mode</strong> — No hints! Find the correct defense on your own. Your score is tracked.</>
              )}
            </div>
          </div>
        </div>
      </div>
    </DefensePlayerErrorBoundary>
  );
};

const styles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '16px 16px 60px',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 16,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#e0e0ee',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 12,
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    color: 'var(--text-primary)',
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  moveCount: {
    marginLeft: 8,
    fontSize: 12,
    color: '#c8c8dc',
    fontWeight: 500,
  },
  modeRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    border: '2px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.2s',
  },
  modeBtnActive: {
    borderColor: '#4da6ff',
    background: '#4da6ff18',
    color: '#4da6ff',
  },
  layout: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  boardContainer: {
    flexShrink: 0,
  },
  sidebar: {
    flex: 1,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  scoreTag: {
    marginLeft: 12,
    fontSize: 12,
    fontWeight: 700,
    color: '#4da6ff',
    background: '#4da6ff18',
    padding: '2px 8px',
    borderRadius: 10,
  },
  stepBar: {
    height: 6,
    background: 'var(--bg-tertiary)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  stepFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4da6ff, #17a2b8)',
    borderRadius: 3,
    transition: 'width 0.4s ease',
  },
  explanationBox: {
    background: 'var(--bg-secondary)',
    borderRadius: 10,
    padding: 16,
    borderLeft: '4px solid #4da6ff',
    minHeight: 80,
  },
  trapHeader: {
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 8,
    color: '#ef4444',
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-line',
  },
  finalScore: {
    marginTop: 12,
    padding: '8px 12px',
    background: '#10b98118',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--accent-success, #10b981)',
  },
  thinkingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#c8c8dc',
    fontSize: 14,
    fontStyle: 'italic',
  },
  moveHistoryBox: {
    background: 'var(--bg-secondary)',
    borderRadius: 10,
    padding: 12,
    border: '1px solid var(--border-color)',
  },
  moveHistoryTitle: {
    fontSize: 13,
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#e0e0ee',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  moveList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  moveBadge: {
    fontSize: 13,
    padding: '2px 6px',
    borderRadius: 4,
    fontFamily: 'monospace',
    color: 'var(--text-primary)',
  },
  moveNum: {
    color: '#c8c8dc',
    marginRight: 3,
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  },
  nextBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#4da6ff',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  keyIdeaBox: {
    background: 'var(--bg-tertiary)',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#e0e0ee',
    lineHeight: 1.5,
  },
  modeDesc: {
    fontSize: 12,
    color: '#c8c8dc',
    lineHeight: 1.5,
    padding: '8px 12px',
    background: 'var(--bg-secondary)',
    borderRadius: 8,
    border: '1px dashed var(--border-color)',
  },
};

export default DefenseOpeningPlayer;
