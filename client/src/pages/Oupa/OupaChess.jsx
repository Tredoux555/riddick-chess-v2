import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import io from 'socket.io-client';

// ========================================
// 🎯 OUPA vs RIDDICK - SUPER SIMPLE VERSION
// Just 4-digit codes! OUPA-PROOF! 😂
// ========================================

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:5000';

export default function OupaChess() {
  const [socket, setSocket] = useState(null);
  const [gameCode, setGameCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [playerColor, setPlayerColor] = useState(null);
  const [position, setPosition] = useState('start');
  const [currentTurn, setCurrentTurn] = useState('w');
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [gameStatus, setGameStatus] = useState('menu'); // menu, waiting, playing, finished
  const [gameResult, setGameResult] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  
  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('Connected!');
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);
  
  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    
    socket.on('oupa:opponent_joined', () => {
      setGameStatus('playing');
    });
    
    socket.on('oupa:move_made', ({ position, turn, move }) => {
      setPosition(position);
      setCurrentTurn(turn);
      if (move) setLastMove({ from: move.substring(0, 2), to: move.substring(2, 4) });
    });
    
    socket.on('oupa:time', ({ whiteTime, blackTime }) => {
      setWhiteTime(whiteTime);
      setBlackTime(blackTime);
    });
    
    socket.on('oupa:game_over', ({ result }) => {
      setGameStatus('finished');
      setGameResult(result);
    });
    
    return () => {
      socket.off('oupa:opponent_joined');
      socket.off('oupa:move_made');
      socket.off('oupa:time');
      socket.off('oupa:game_over');
    };
  }, [socket]);
  
  // CREATE GAME
  const createGame = () => {
    if (!socket) return;
    
    socket.emit('oupa:create', (response) => {
      setGameCode(response.roomId);
      setPlayerColor('white');
      setGameStatus('waiting');
    });
  };
  
  // JOIN GAME
  const joinGame = () => {
    if (!socket || !inputCode) return;
    
    const code = inputCode.toUpperCase().trim();
    
    socket.emit('oupa:join', { roomId: code }, (response) => {
      if (response.error) {
        alert(response.error);
        return;
      }
      
      setGameCode(code);
      setPlayerColor('black');
      setGameStatus('playing');
    });
  };
  
  // Make move
  const onDrop = (sourceSquare, targetSquare) => {
    if (!socket || gameStatus !== 'playing') return false;
    
    const isWhiteTurn = currentTurn === 'w';
    const isYourTurn = (isWhiteTurn && playerColor === 'white') || (!isWhiteTurn && playerColor === 'black');
    
    if (!isYourTurn) return false;
    
    socket.emit('oupa:move', { 
      roomId: gameCode, 
      from: sourceSquare, 
      to: targetSquare 
    }, (response) => {
      if (response.error) {
        return false;
      }
    });
    
    return true;
  };
  
  const handleResign = () => {
    if (window.confirm('Resign?')) {
      socket.emit('oupa:resign', { roomId: gameCode });
    }
  };
  
  const handleDraw = () => {
    if (window.confirm('Agree to draw?')) {
      socket.emit('oupa:draw', { roomId: gameCode });
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // MENU SCREEN
  if (gameStatus === 'menu') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.bigTitle}>♟️ RIDDICK vs OUPA ♟️</h1>
          <p style={styles.subtitle}>Play chess across the world! 🌍</p>
          
          <div style={styles.menuCard}>
            <button onClick={createGame} style={{...styles.bigButton, background: '#0af', marginBottom: '30px'}}>
              🎮 CREATE GAME
            </button>
            
            <div style={styles.divider}>OR</div>
            
            <div style={{marginTop: '30px'}}>
              <p style={{fontSize: '18px', marginBottom: '15px'}}>
                <strong>Have a code? Join game:</strong>
              </p>
              <input 
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter 4-letter code"
                maxLength={6}
                style={styles.codeInput}
              />
              <button onClick={joinGame} style={{...styles.bigButton, background: '#0f8', marginTop: '15px'}}>
                ✅ JOIN GAME
              </button>
            </div>
          </div>
          
          <div style={styles.instructions}>
            <p><strong>🎯 SUPER SIMPLE:</strong></p>
            <p>1. One person clicks "CREATE GAME"</p>
            <p>2. Gets a 4-letter code (like ABCD)</p>
            <p>3. Tell other person the code</p>
            <p>4. They type it in and click "JOIN"</p>
            <p>5. PLAY!</p>
          </div>
        </div>
      </div>
    );
  }
  
  // WAITING SCREEN
  if (gameStatus === 'waiting') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.bigTitle}>♟️ WAITING FOR OUPA ♟️</h1>
          
          <div style={styles.codeDisplay}>
            <p style={{fontSize: '24px', marginBottom: '20px'}}>
              <strong>Give Oupa this code:</strong>
            </p>
            <div style={styles.codeBox}>
              {gameCode}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(gameCode);
                alert('Code copied!');
              }}
              style={{...styles.bigButton, background: '#0f8', marginTop: '20px'}}
            >
              📋 COPY CODE
            </button>
          </div>
          
          <div style={styles.waitingAnimation}>
            <div style={styles.spinner}></div>
            <p style={{marginTop: '20px', fontSize: '18px'}}>Waiting for opponent...</p>
          </div>
          
          <div style={styles.instructions}>
            <p>📱 <strong>Tell Oupa:</strong></p>
            <p>"Go to <strong>riddickchess.site/oupa</strong>"</p>
            <p>"Type code: <strong>{gameCode}</strong>"</p>
            <p>"Click JOIN GAME"</p>
          </div>
        </div>
      </div>
    );
  }
  
  // PLAYING SCREEN
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>♟️ RIDDICK vs OUPA ♟️</h1>
          <div style={styles.subtitle}>
            {currentTurn === 'w' ? '⚪ WHITE TO MOVE' : '⚫ BLACK TO MOVE'}
          </div>
          {gameStatus === 'finished' && (
            <div style={{...styles.subtitle, color: '#0f8', marginTop: '10px'}}>
              🏁 {gameResult}
            </div>
          )}
        </div>
        
        <div style={styles.timersRow}>
          <div style={{
            ...styles.timer,
            background: currentTurn === 'b' ? '#f44' : '#333',
            transform: currentTurn === 'b' ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={styles.timerLabel}>
              ⚫ BLACK {playerColor === 'black' && '(YOU)'}
            </div>
            <div style={styles.timerValue}>{formatTime(blackTime)}</div>
          </div>
          
          <div style={{
            ...styles.timer,
            background: currentTurn === 'w' ? '#0af' : '#333',
            transform: currentTurn === 'w' ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={styles.timerLabel}>
              ⚪ WHITE {playerColor === 'white' && '(YOU)'}
            </div>
            <div style={styles.timerValue}>{formatTime(whiteTime)}</div>
          </div>
        </div>
        
        <div style={styles.colorIndicator}>
          You are: {playerColor === 'white' ? '⚪ WHITE' : '⚫ BLACK'}
        </div>
        
        <div style={styles.boardContainer}>
          <Chessboard
            position={position}
            onPieceDrop={onDrop}
            boardWidth={Math.min(600, window.innerWidth - 40)}
            customBoardStyle={{
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}
            boardOrientation={playerColor}
            customSquareStyles={{
              ...(lastMove ? {
                [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
              } : {})
            }}
          />
        </div>
        
        {gameStatus === 'playing' && (
          <div style={styles.controls}>
            <button onClick={handleResign} style={{...styles.button, background: '#f44'}}>
              🏳️ RESIGN
            </button>
            <button onClick={handleDraw} style={{...styles.button, background: '#fa0'}}>
              🤝 DRAW
            </button>
          </div>
        )}
        
        {gameStatus === 'finished' && (
          <div style={styles.controls}>
            <button 
              onClick={() => window.location.reload()} 
              style={{...styles.button, background: '#0f8', fontSize: '22px', padding: '20px 50px'}}
            >
              🔄 NEW GAME
            </button>
          </div>
        )}
        
        <div style={styles.instructions}>
          <p>Code: {gameCode}</p>
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
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff'
  },
  
  container: {
    maxWidth: '700px',
    width: '100%'
  },
  
  bigTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 20px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)'
  },
  
  subtitle: {
    fontSize: '24px',
    color: '#0af',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  
  menuCard: {
    background: 'rgba(255,255,255,0.08)',
    padding: '40px',
    borderRadius: '20px',
    border: '2px solid rgba(255,255,255,0.15)',
    marginTop: '40px',
    marginBottom: '30px',
    textAlign: 'center'
  },
  
  bigButton: {
    padding: '25px 60px',
    fontSize: '24px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '15px',
    cursor: 'pointer',
    color: '#fff',
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
    width: '100%',
    maxWidth: '400px'
  },
  
  divider: {
    fontSize: '20px',
    color: '#b0b0c4',
    fontWeight: 'bold',
    margin: '20px 0'
  },
  
  codeInput: {
    width: '100%',
    maxWidth: '300px',
    padding: '20px',
    fontSize: '32px',
    fontWeight: 'bold',
    textAlign: 'center',
    background: '#000',
    border: '3px solid #0af',
    borderRadius: '12px',
    color: '#0af',
    letterSpacing: '8px',
    textTransform: 'uppercase'
  },
  
  codeDisplay: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  
  codeBox: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#0af',
    background: '#000',
    padding: '30px',
    borderRadius: '20px',
    border: '4px solid #0af',
    letterSpacing: '12px',
    textShadow: '0 0 20px rgba(10,175,255,0.5)'
  },
  
  waitingAnimation: {
    textAlign: 'center',
    padding: '40px 0'
  },
  
  spinner: {
    width: '60px',
    height: '60px',
    border: '6px solid rgba(255,255,255,0.1)',
    borderTop: '6px solid #0af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  
  timersRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  
  timer: {
    padding: '20px 35px',
    borderRadius: '15px',
    textAlign: 'center',
    minWidth: '180px',
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
    fontSize: '36px',
    fontWeight: 'bold'
  },
  
  colorIndicator: {
    textAlign: 'center',
    fontSize: '20px',
    marginBottom: '15px',
    color: '#0af',
    fontWeight: 'bold'
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
    color: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  },
  
  instructions: {
    background: 'rgba(255,255,255,0.08)',
    padding: '25px',
    borderRadius: '15px',
    textAlign: 'center',
    border: '2px solid rgba(255,255,255,0.15)',
    lineHeight: '1.8'
  }
};

// Spinner animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
