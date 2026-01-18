import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import io from 'socket.io-client';

// ========================================
// 🎯 OUPA vs RIDDICK - REAL ONLINE MULTIPLAYER
// Beijing vs South Africa chess battle! 🌍
// ========================================

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:5000';

export default function OupaChess() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [position, setPosition] = useState('start');
  const [currentTurn, setCurrentTurn] = useState('w');
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [gameStatus, setGameStatus] = useState('menu'); // menu, creating, waiting, playing, finished
  const [gameResult, setGameResult] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [opponentConnected, setOpponentConnected] = useState(false);
  
  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server!');
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);
  
  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Opponent joined
    socket.on('oupa:opponent_joined', () => {
      setOpponentConnected(true);
      setGameStatus('playing');
    });
    
    // Move made
    socket.on('oupa:move_made', ({ position, turn }) => {
      setPosition(position);
      setCurrentTurn(turn);
    });
    
    // Time updates
    socket.on('oupa:time', ({ whiteTime, blackTime }) => {
      setWhiteTime(whiteTime);
      setBlackTime(blackTime);
    });
    
    // Game over
    socket.on('oupa:game_over', ({ result }) => {
      setGameStatus('finished');
      setGameResult(result);
    });
    
    // Opponent disconnected
    socket.on('oupa:opponent_disconnected', ({ color }) => {
      alert(`${color} disconnected! They have 30 seconds to reconnect.`);
    });
    
    return () => {
      socket.off('oupa:opponent_joined');
      socket.off('oupa:move_made');
      socket.off('oupa:time');
      socket.off('oupa:game_over');
      socket.off('oupa:opponent_disconnected');
    };
  }, [socket]);
  
  // Create a new game
  const createGame = () => {
    if (!socket) return;
    
    setGameStatus('creating');
    socket.emit('oupa:create', (response) => {
      setRoomId(response.roomId);
      setPlayerColor('white');
      const link = `${window.location.origin}/oupa?room=${response.roomId}`;
      setShareLink(link);
      setGameStatus('waiting');
    });
  };
  
  // Join existing game from URL
  useEffect(() => {
    if (!socket) return;
    
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    
    if (room && !roomId) {
      setGameStatus('creating');
      socket.emit('oupa:join', { roomId: room }, (response) => {
        if (response.error) {
          alert(response.error);
          setGameStatus('menu');
          return;
        }
        
        setRoomId(response.roomId);
        setPlayerColor('black');
        setOpponentConnected(true);
        setGameStatus('playing');
      });
    }
  }, [socket, roomId]);
  
  // Make a move
  const onDrop = (sourceSquare, targetSquare) => {
    if (!socket || gameStatus !== 'playing') return false;
    
    // Check if it's your turn
    const isWhiteTurn = currentTurn === 'w';
    const isYourTurn = (isWhiteTurn && playerColor === 'white') || (!isWhiteTurn && playerColor === 'black');
    
    if (!isYourTurn) return false;
    
    socket.emit('oupa:move', { 
      roomId, 
      from: sourceSquare, 
      to: targetSquare 
    }, (response) => {
      if (response.error) {
        console.log('Invalid move:', response.error);
        return false;
      }
    });
    
    return true;
  };
  
  // Resign
  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      socket.emit('oupa:resign', { roomId });
    }
  };
  
  // Offer draw
  const handleDraw = () => {
    if (window.confirm('Agree to a draw?')) {
      socket.emit('oupa:draw', { roomId });
    }
  };
  
  // Copy share link
  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Link copied! Send this to Oupa! 🚀');
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // MENU - Choose to create or join
  if (gameStatus === 'menu') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.bigTitle}>♟️ RIDDICK vs OUPA ♟️</h1>
          <p style={styles.subtitle}>Play chess across the world! 🌍</p>
          
          <div style={styles.menuButtons}>
            <button onClick={createGame} style={{...styles.bigButton, background: '#0af'}}>
              🎮 CREATE GAME
            </button>
          </div>
          
          <div style={styles.instructions}>
            <p><strong>How it works:</strong></p>
            <p>1. Click "CREATE GAME"</p>
            <p>2. Copy the link</p>
            <p>3. Send to Oupa via WhatsApp/SMS</p>
            <p>4. When he opens it, you play!</p>
          </div>
        </div>
      </div>
    );
  }
  
  // WAITING FOR OPPONENT
  if (gameStatus === 'waiting') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.bigTitle}>♟️ WAITING FOR OUPA ♟️</h1>
          
          <div style={{...styles.card, marginBottom: '20px'}}>
            <p style={{fontSize: '18px', marginBottom: '15px'}}>
              <strong>Send this link to Oupa:</strong>
            </p>
            <div style={styles.linkBox}>
              <input 
                type="text" 
                value={shareLink} 
                readOnly 
                style={styles.linkInput}
                onClick={(e) => e.target.select()}
              />
            </div>
            <button onClick={copyLink} style={{...styles.bigButton, marginTop: '15px'}}>
              📋 COPY LINK
            </button>
          </div>
          
          <div style={styles.waitingAnimation}>
            <div style={styles.spinner}></div>
            <p style={{marginTop: '20px', fontSize: '18px'}}>Waiting for opponent...</p>
          </div>
          
          <div style={styles.instructions}>
            <p>💡 <strong>Send via:</strong></p>
            <p>WhatsApp, SMS, Email, or any messenger!</p>
          </div>
        </div>
      </div>
    );
  }
  
  // PLAYING
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>♟️ RIDDICK vs OUPA ♟️</h1>
          <div style={styles.subtitle}>
            {gameStatus === 'creating' && 'Loading...'}
            {gameStatus === 'playing' && (
              currentTurn === 'w' 
                ? '⚪ WHITE TO MOVE' 
                : '⚫ BLACK TO MOVE'
            )}
            {gameStatus === 'finished' && `🏁 ${gameResult}`}
          </div>
        </div>
        
        {/* TIMERS */}
        <div style={styles.timersRow}>
          <div style={{
            ...styles.timer,
            background: currentTurn === 'b' ? '#f44' : '#333',
            transform: currentTurn === 'b' ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={styles.timerLabel}>⚫ BLACK {playerColor === 'black' && '(YOU)'}</div>
            <div style={styles.timerValue}>{formatTime(blackTime)}</div>
          </div>
          
          <div style={{
            ...styles.timer,
            background: currentTurn === 'w' ? '#0af' : '#333',
            transform: currentTurn === 'w' ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={styles.timerLabel}>⚪ WHITE {playerColor === 'white' && '(YOU)'}</div>
            <div style={styles.timerValue}>{formatTime(whiteTime)}</div>
          </div>
        </div>
        
        {/* YOUR COLOR */}
        <div style={styles.colorIndicator}>
          <strong>You are playing as: {playerColor === 'white' ? '⚪ WHITE' : '⚫ BLACK'}</strong>
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
            boardOrientation={playerColor}
          />
        </div>
        
        {/* BUTTONS */}
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
            <button onClick={() => window.location.reload()} style={{...styles.button, ...styles.newGameButton}}>
              🔄 NEW GAME
            </button>
          </div>
        )}
        
        {/* INSTRUCTIONS */}
        <div style={styles.instructions}>
          <p style={{margin: '8px 0', fontSize: '16px'}}>📱 <strong>DRAG pieces to move</strong></p>
          <p style={{margin: '8px 0', fontSize: '16px'}}>⏱️ <strong>10 minutes each</strong></p>
          <p style={{margin: '8px 0', fontSize: '14px', color: '#888'}}>
            Room ID: {roomId}
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
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#fff'
  },
  
  container: {
    maxWidth: '700px',
    width: '100%'
  },
  
  bigTitle: {
    fontSize: '42px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '0 0 20px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)'
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)'
  },
  
  subtitle: {
    fontSize: '24px',
    color: '#0af',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  
  menuButtons: {
    display: 'flex',
    justifyContent: 'center',
    margin: '40px 0'
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
    transition: 'transform 0.2s'
  },
  
  card: {
    background: 'rgba(255,255,255,0.08)',
    padding: '25px',
    borderRadius: '15px',
    border: '2px solid rgba(255,255,255,0.15)'
  },
  
  linkBox: {
    background: '#000',
    padding: '15px',
    borderRadius: '8px',
    border: '2px solid #0af'
  },
  
  linkInput: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#0af',
    fontSize: '16px',
    fontFamily: 'monospace',
    outline: 'none'
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
    fontWeight: 'bold',
    color: '#fff'
  },
  
  colorIndicator: {
    textAlign: 'center',
    fontSize: '20px',
    marginBottom: '15px',
    color: '#0af'
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
    border: '2px solid rgba(255,255,255,0.15)'
  }
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
