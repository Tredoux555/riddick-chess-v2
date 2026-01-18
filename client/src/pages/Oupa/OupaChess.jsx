import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';

// ========================================
// 🎯 OUPA vs RIDDICK - SIMPLE CHESS
// Super simple, grandpa-proof interface
// Just board + time + resign/draw buttons
// NO CONFUSION ALLOWED! 😂
// ========================================

export default function OupaChess() {
  const [game, setGame] = useState(null);
  const [position, setPosition] = useState('start');
  const [gameStatus, setGameStatus] = useState('waiting');
  const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
  const [blackTime, setBlackTime] = useState(600);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [gameResult, setGameResult] = useState(null);
  
  const timerRef = useRef(null);
  
  // Initialize chess game
  useEffect(() => {
    import('chess.js').then(({ Chess }) => {
      setGame(new Chess());
      setGameStatus('playing');
    });
  }, []);
  
  // Timer logic
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    
    timerRef.current = setInterval(() => {
      if (currentTurn === 'white') {
        setWhiteTime(prev => {
          if (prev <= 0) {
            handleTimeout('white');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 0) {
            handleTimeout('black');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => clearInterval(timerRef.current);
  }, [gameStatus, currentTurn]);
  
  const handleTimeout = (color) => {
    setGameStatus('finished');
    setGameResult(`${color === 'white' ? 'Black' : 'White'} wins on time!`);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  
  const onDrop = (sourceSquare, targetSquare) => {
    if (!game || gameStatus !== 'playing') return false;
    
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always queen (simple!)
      });
      
      if (move === null) return false;
      
      setPosition(game.fen());
      setCurrentTurn(game.turn() === 'w' ? 'white' : 'black');
      
      // Check game over
      if (game.isGameOver()) {
        setGameStatus('finished');
        if (game.isCheckmate()) {
          setGameResult(`${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`);
        } else if (game.isDraw()) {
          setGameResult('Draw!');
        } else if (game.isStalemate()) {
          setGameResult('Stalemate!');
        }
      }
      
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      setGameStatus('finished');
      setGameResult(`${currentTurn === 'white' ? 'Black' : 'White'} wins by resignation!`);
    }
  };
  
  const handleDraw = () => {
    if (window.confirm('Agree to a draw?')) {
      setGameStatus('finished');
      setGameResult('Game drawn by agreement!');
    }
  };
  
  const handleNewGame = () => {
    if (window.confirm('Start a new game?')) {
      import('chess.js').then(({ Chess }) => {
        setGame(new Chess());
        setPosition('start');
        setGameStatus('playing');
        setWhiteTime(600);
        setBlackTime(600);
        setCurrentTurn('white');
        setGameResult(null);
      });
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>♟️ RIDDICK vs OUPA ♟️</h1>
          <div style={styles.subtitle}>
            {gameStatus === 'waiting' && 'Loading...'}
            {gameStatus === 'playing' && (
              currentTurn === 'white' 
                ? '⚪ WHITE TO MOVE' 
                : '⚫ BLACK TO MOVE'
            )}
            {gameStatus === 'finished' && `🏁 ${gameResult}`}
          </div>
        </div>
        
        {/* TIMERS - BIG AND CLEAR */}
        <div style={styles.timersRow}>
          <div style={{
            ...styles.timer,
            background: currentTurn === 'black' ? '#f44' : '#333',
            transform: currentTurn === 'black' ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={styles.timerLabel}>⚫ BLACK (RIDDICK)</div>
            <div style={styles.timerValue}>{formatTime(blackTime)}</div>
          </div>
          
          <div style={{
            ...styles.timer,
            background: currentTurn === 'white' ? '#0af' : '#333',
            transform: currentTurn === 'white' ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={styles.timerLabel}>⚪ WHITE (OUPA)</div>
            <div style={styles.timerValue}>{formatTime(whiteTime)}</div>
          </div>
        </div>
        
        {/* CHESSBOARD */}
        <div style={styles.boardContainer}>
          <Chessboard
            position={position}
            onPieceDrop={onDrop}
            boardWidth={Math.min(600, window.innerWidth - 40)}
            customBoardStyle={{
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}
          />
        </div>
        
        {/* BUTTONS - BIG AND OBVIOUS */}
        {gameStatus === 'playing' && (
          <div style={styles.controls}>
            <button onClick={handleResign} style={{...styles.button, ...styles.resignButton}}>
              🏳️ RESIGN
            </button>
            <button onClick={handleDraw} style={{...styles.button, ...styles.drawButton}}>
              🤝 DRAW
            </button>
          </div>
        )}
        
        {gameStatus === 'finished' && (
          <div style={styles.controls}>
            <button onClick={handleNewGame} style={{...styles.button, ...styles.newGameButton}}>
              🔄 NEW GAME
            </button>
          </div>
        )}
        
        {/* INSTRUCTIONS */}
        <div style={styles.instructions}>
          <p style={{margin: '8px 0', fontSize: '16px'}}>📱 <strong>DRAG pieces to move</strong></p>
          <p style={{margin: '8px 0', fontSize: '16px'}}>⏱️ <strong>10 minutes each</strong></p>
          <p style={{margin: '8px 0', fontSize: '18px', color: '#0af'}}>
            <strong>OUPA = WHITE ⚪ | RIDDICK = BLACK ⚫</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  
  container: {
    maxWidth: '700px',
    width: '100%'
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fff',
    margin: '0 0 10px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)'
  },
  
  subtitle: {
    fontSize: '24px',
    color: '#0af',
    fontWeight: 'bold'
  },
  
  timersRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '25px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  
  timer: {
    padding: '20px 35px',
    borderRadius: '15px',
    textAlign: 'center',
    minWidth: '160px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
  },
  
  timerLabel: {
    fontSize: '16px',
    color: '#ccc',
    marginBottom: '8px',
    fontWeight: 'bold'
  },
  
  timerValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fff'
  },
  
  boardContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '25px'
  },
  
  controls: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  
  button: {
    padding: '18px 35px',
    fontSize: '20px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    color: '#fff'
  },
  
  resignButton: {
    background: '#f44'
  },
  
  drawButton: {
    background: '#fa0'
  },
  
  newGameButton: {
    background: '#0f8',
    fontSize: '22px',
    padding: '20px 50px'
  },
  
  instructions: {
    background: 'rgba(255,255,255,0.08)',
    padding: '25px',
    borderRadius: '15px',
    textAlign: 'center',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.15)'
  }
};
