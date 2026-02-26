import React, { useState, useEffect, useCallback, useMemo, useRef, Component } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { FaSkull, FaArrowLeft, FaRedo, FaArrowRight, FaChessKnight } from 'react-icons/fa';
import { useBoardSettings } from '../contexts/BoardSettingsContext';
import killerOpenings from '../data/killerOpenings';

// Error boundary
class PlayerErrorBoundary extends Component {
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
          <p style={{ color: '#ff6b6b' }}>{this.state.error?.message}</p>
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
  { id: 'victim', label: 'Victim', emoji: '🐣', desc: 'Bot always falls for the trap' },
  { id: 'smart', label: 'Smart', emoji: '🧠', desc: 'Bot defends 50% of the time' },
  { id: 'realistic', label: 'Realistic', emoji: '💀', desc: 'Bot plays realistically' },
];

const KillerOpeningPlayer = () => {
  const { openingId } = useParams();
  const navigate = useNavigate();
  const { currentTheme, customPieces } = useBoardSettings();

  const opening = useMemo(() => killerOpenings.find(o => o.id === openingId), [openingId]);
  const openingIndex = useMemo(() => killerOpenings.findIndex(o => o.id === openingId), [openingId]);

  const [game, setGame] = useState(new Chess());
  const [currentStep, setCurrentStep] = useState(0);
  const [mode, setMode] = useState('victim');
  const [moveHistory, setMoveHistory] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [defenseTriggered, setDefenseTriggered] = useState(false);
  const [defenseExplanation, setDefenseExplanation] = useState('');
  const [wrongMove, setWrongMove] = useState(false);
  const [highlightSquares, setHighlightSquares] = useState({});
  const [arrows, setArrows] = useState([]);

  // Ref to track all active timers so we can clean them up on reset/unmount
  const timersRef = useRef([]);
  // Ref to track if game is still "alive" (not reset/navigated away)
  const gameSessionRef = useRef(0);

  // Helper: schedule a timeout that auto-cancels on reset/unmount
  const safeTimeout = useCallback((fn, delay) => {
    const session = gameSessionRef.current;
    const timer = setTimeout(() => {
      // Only run if we haven't reset since this timer was scheduled
      if (gameSessionRef.current === session) {
        fn();
      }
    }, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  // Clear all pending timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Make opponent move on the board (stable ref — no deps needed)
  const makeOpponentMove = useCallback((moveStr) => {
    setGame(prev => {
      const newGame = new Chess(prev.fen());
      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      try {
        newGame.move({ from, to, promotion: 'q' });
      } catch (e) {
        console.warn('Opponent move failed:', moveStr, e);
      }
      return newGame;
    });
    setMoveHistory(prev => [...prev, moveStr]);
  }, []);

  // Initialize or reset the game
  const resetGame = useCallback(() => {
    // Invalidate any in-flight timers
    clearAllTimers();
    gameSessionRef.current += 1;

    const newGame = new Chess();
    setGame(newGame);
    setCurrentStep(0);
    setMoveHistory([]);
    setExplanation(opening ? opening.steps[0]?.explanation || 'Make your move!' : '');
    setIsThinking(false);
    setGameComplete(false);
    setDefenseTriggered(false);
    setDefenseExplanation('');
    setWrongMove(false);
    setHighlightSquares({});
    setArrows([]);
  }, [opening, clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Reset when opening changes
  useEffect(() => {
    window.scrollTo(0, 0);
    resetGame();
  }, [openingId, resetGame]);

  // Handle opponent-first moves (Black openings) and show hint arrows
  useEffect(() => {
    if (!opening || gameComplete || defenseTriggered) return;
    const step = opening.steps[currentStep];
    if (!step) return;

    // If this step's playerMove is null, the opponent moves first
    if (step.playerMove === null && step.opponentResponses?.main?.isOpponentFirst) {
      const timer = safeTimeout(() => {
        makeOpponentMove(step.opponentResponses.main.move);
        setExplanation(step.opponentResponses.main.explanation);
        setCurrentStep(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }

    // Show hint arrow for the player's move
    if (step.playerMove) {
      const from = step.playerMove.substring(0, 2);
      const to = step.playerMove.substring(2, 4);
      setArrows([[from, to, '#22c55e']]);
      setHighlightSquares({
        [from]: { backgroundColor: 'rgba(34, 197, 94, 0.35)' },
        [to]: { backgroundColor: 'rgba(34, 197, 94, 0.35)' },
      });
    }
  }, [currentStep, opening, gameComplete, defenseTriggered, makeOpponentMove, safeTimeout]);

  const triggerVictory = useCallback(() => {
    setGameComplete(true);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
    });
    toast.success('Trap Complete! You did it!', { icon: '👑', duration: 4000 });

    // Save progress
    try {
      const saved = JSON.parse(localStorage.getItem('killer_openings_progress') || '{}');
      if (!saved[openingId]) saved[openingId] = {};
      saved[openingId].completed = true;
      saved[openingId][mode] = true;
      if (saved[openingId].victim && saved[openingId].smart && saved[openingId].realistic) {
        saved[openingId].mastered = true;
      }
      localStorage.setItem('killer_openings_progress', JSON.stringify(saved));
    } catch (e) { /* ignore */ }
  }, [openingId, mode]);

  const triggerDefense = useCallback((defStep) => {
    setDefenseTriggered(true);
    setDefenseExplanation(defStep.explanation + (defStep.planB ? '\n\n💡 Plan B: ' + defStep.planB : ''));
    toast('Opponent found the defense!', { icon: '🛡️', duration: 3000 });
  }, []);

  // Handle player's move
  const onDrop = useCallback((sourceSquare, targetSquare) => {
    if (gameComplete || defenseTriggered || isThinking) return false;
    if (!opening) return false;

    const step = opening.steps[currentStep];
    if (!step || !step.playerMove) return false;

    const expectedFrom = step.playerMove.substring(0, 2);
    const expectedTo = step.playerMove.substring(2, 4);

    // Check if correct move
    if (sourceSquare !== expectedFrom || targetSquare !== expectedTo) {
      setWrongMove(true);
      toast.error('Not quite! Follow the green arrow.', { icon: '❌', duration: 2000 });
      safeTimeout(() => setWrongMove(false), 800);
      return false;
    }

    // Make the player's move
    const newGame = new Chess(game.fen());
    try {
      newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch (e) {
      console.warn('Player move failed:', e);
      return false;
    }
    setGame(newGame);
    setMoveHistory(prev => [...prev, step.playerMove]);
    setArrows([]);
    setHighlightSquares({});

    // Check if this was checkmate or trap complete
    if (step.isCheckmate || step.isTrapComplete) {
      setExplanation(step.explanation);
      triggerVictory();
      return true;
    }

    // Now the opponent responds
    const nextStepIndex = currentStep + 1;
    setIsThinking(true);
    setExplanation('Opponent is thinking...');

    // Use safeTimeout so these auto-cancel on reset/navigation
    safeTimeout(() => {
      // Decide if opponent plays defense
      let playsDefense = false;
      const responses = step.opponentResponses;

      if (responses?.defense && responses.defense.isDefense) {
        if (mode === 'victim') {
          playsDefense = false;
        } else if (mode === 'smart') {
          playsDefense = Math.random() < 0.5;
        } else if (mode === 'realistic') {
          playsDefense = Math.random() < 0.7;
        }
      }

      if (playsDefense && responses.defense) {
        makeOpponentMove(responses.defense.move);
        triggerDefense(responses.defense);
        setIsThinking(false);
      } else {
        // Main line
        const mainResp = responses?.main;
        if (mainResp) {
          makeOpponentMove(mainResp.move);
          setExplanation(mainResp.explanation);
        }
        setIsThinking(false);

        // Use the nextStepIndex we captured in this closure (not stale state)
        setCurrentStep(nextStepIndex);

        // Set up next step explanation after a brief pause
        // We read from opening.steps directly (not from state) to avoid stale reads
        const nextStep = opening.steps[nextStepIndex];
        if (nextStep) {
          safeTimeout(() => {
            setExplanation(nextStep.explanation);

            // Handle opponent-first steps (black openings)
            if (nextStep.playerMove === null && nextStep.opponentResponses?.main?.isOpponentFirst) {
              safeTimeout(() => {
                makeOpponentMove(nextStep.opponentResponses.main.move);
                setExplanation(nextStep.opponentResponses.main.explanation);
                setCurrentStep(prev => prev + 1);
              }, 600);
            }
          }, 500);
        }
      }
    }, 600 + Math.random() * 400);

    return true;
  }, [game, opening, currentStep, mode, gameComplete, defenseTriggered, isThinking, makeOpponentMove, triggerVictory, triggerDefense, safeTimeout]);

  // Next opening
  const nextOpening = useMemo(() => {
    if (openingIndex < killerOpenings.length - 1) {
      return killerOpenings[openingIndex + 1];
    }
    return null;
  }, [openingIndex]);

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

  if (!opening) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Opening not found</h2>
        <Link to="/killer-openings" style={{ color: '#3b82f6' }}>Back to Killer Openings</Link>
      </div>
    );
  }

  return (
    <PlayerErrorBoundary>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <Link to="/killer-openings" style={styles.backLink}>
            <FaArrowLeft /> Back to Openings
          </Link>
          <div style={styles.titleSection}>
            <span style={{ fontSize: 32 }}>{opening.emoji}</span>
            <div>
              <h1 style={styles.title}>{opening.name}</h1>
              <div style={styles.severity}>
                {Array.from({ length: 5 }, (_, i) => (
                  <FaSkull key={i} style={{ fontSize: 12, color: i < opening.severity ? '#ef4444' : 'var(--border-color)' }} />
                ))}
                <span style={styles.moveCount}>{opening.totalMoves} moves | Play as {opening.playerColor}</span>
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
              boxShadow: wrongMove ? '0 0 20px rgba(239,68,68,0.6)' : '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'box-shadow 0.3s',
            }}>
              <Chessboard
                id="killer-opening-board"
                position={game.fen()}
                onPieceDrop={onDrop}
                snapToCursor={true}
                boardWidth={boardWidth}
                boardOrientation={opening.playerColor}
                customBoardStyle={{
                  borderRadius: '4px',
                }}
                customDarkSquareStyle={{ backgroundColor: currentTheme?.dark || '#769656' }}
                customLightSquareStyle={{ backgroundColor: currentTheme?.light || '#eeeed2' }}
                customPieces={customPieces}
                customArrows={arrows}
                customSquareStyles={highlightSquares}
                animationDuration={300}
                arePiecesDraggable={!gameComplete && !defenseTriggered && !isThinking}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div style={styles.sidebar}>
            {/* Step Counter */}
            <div style={styles.stepCounter}>
              Step {Math.min(currentStep + 1, opening.steps.length)} of {opening.steps.length}
              <div style={styles.stepBar}>
                <div style={{
                  ...styles.stepFill,
                  width: `${((currentStep + (gameComplete ? 1 : 0)) / opening.steps.length) * 100}%`,
                }} />
              </div>
            </div>

            {/* Explanation Panel */}
            <div style={{
              ...styles.explanationBox,
              borderColor: defenseTriggered ? '#f59e0b' : gameComplete ? '#10b981' : '#3b82f6',
            }}>
              {defenseTriggered ? (
                <>
                  <div style={styles.defenseHeader}>
                    <span>🛡️ Defense Found!</span>
                  </div>
                  <p style={styles.explanationText}>{defenseExplanation}</p>
                </>
              ) : gameComplete ? (
                <>
                  <div style={{ ...styles.defenseHeader, color: '#10b981' }}>
                    <span>👑 TRAP COMPLETE!</span>
                  </div>
                  <p style={styles.explanationText}>{explanation}</p>
                </>
              ) : (
                <>
                  {isThinking ? (
                    <div style={styles.thinkingDots}>
                      <FaChessKnight style={{ animation: 'pulse 1s infinite' }} /> Opponent thinking...
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
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No moves yet...</span>
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
                <FaRedo /> Reset
              </button>
              {(gameComplete || defenseTriggered) && nextOpening && (
                <button
                  onClick={() => navigate(`/killer-openings/${nextOpening.id}`)}
                  style={styles.nextBtn}
                >
                  Next: {nextOpening.name} <FaArrowRight />
                </button>
              )}
            </div>

            {/* Key Idea */}
            <div style={styles.keyIdeaBox}>
              <strong>Key Idea:</strong> {opening.keyIdea}
            </div>
          </div>
        </div>
      </div>
    </PlayerErrorBoundary>
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
    color: 'var(--text-secondary)',
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
  severity: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  moveCount: {
    marginLeft: 8,
    fontSize: 12,
    color: 'var(--text-muted)',
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
    borderColor: '#ef4444',
    background: '#ef444418',
    color: '#ef4444',
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
  stepBar: {
    height: 6,
    background: 'var(--bg-tertiary)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  stepFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
    borderRadius: 3,
    transition: 'width 0.4s ease',
  },
  explanationBox: {
    background: 'var(--bg-secondary)',
    borderRadius: 10,
    padding: 16,
    borderLeft: '4px solid #3b82f6',
    minHeight: 80,
  },
  defenseHeader: {
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 8,
    color: '#f59e0b',
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-line',
  },
  thinkingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--text-muted)',
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
    color: 'var(--text-secondary)',
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
    color: 'var(--text-muted)',
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
    background: '#ef4444',
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
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
};

export default KillerOpeningPlayer;
