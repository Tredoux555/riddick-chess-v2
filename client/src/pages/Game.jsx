import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { PIECE_SETS, BOARD_THEMES, createCustomPieces } from '../utils/chessComPieces';
import { preloadSounds, playMoveSound, playSound } from '../utils/sounds';
import toast from 'react-hot-toast';
import { FaFlag, FaHandshake, FaComments, FaEye, FaShare } from 'react-icons/fa';
import ShareModal from '../components/ShareModal';

const Game = () => {
  const { id: gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected, joinGame, makeMove, resign, offerDraw, acceptDraw, declineDraw, sendMessage } = useSocket();
  
  // Load preferences from localStorage
  const savedPieceSet = localStorage.getItem('chess_piece_set') || 'neo';
  const savedBoardTheme = localStorage.getItem('chess_board_theme') || 'green';
  const customPieces = createCustomPieces(savedPieceSet);
  const currentTheme = BOARD_THEMES[savedBoardTheme] || BOARD_THEMES.green;

  const [game, setGame] = useState(new Chess());
  const [gameData, setGameData] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [isSpectating, setIsSpectating] = useState(false);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [drawOffered, setDrawOffered] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [ratingChange, setRatingChange] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    if (connected && gameId) {
      joinGame(gameId);
      playSound('gameStart');
    }
  }, [connected, gameId, joinGame]);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:state', (data) => {
      console.log('Game state received:', data);
      setGameData(data);
      
      const chess = new Chess();
      if (data.fen) {
        chess.load(data.fen);
      }
      setGame(chess);
      
      setWhiteTime(data.whiteTime || data.time_control * 1000);
      setBlackTime(data.blackTime || data.time_control * 1000);
      setMoveHistory(data.history || []);
      setDrawOffered(data.drawOffer);
      
      if (data.spectating) {
        setIsSpectating(true);
        setSpectatorCount(data.spectatorCount || 0);
      } else {
        // Determine player color
        if (data.whiteId === user.id) {
          setPlayerColor('w');
        } else if (data.blackId === user.id) {
          setPlayerColor('b');
        }
      }

      if (data.status === 'completed' || data.completed) {
        setGameOver(true);
        setResult(data.result);
      }
    });

    socket.on('game:moved', (data) => {
      const chess = new Chess();
      chess.load(data.fen);
      setGame(chess);
      setWhiteTime(data.whiteTime);
      setBlackTime(data.blackTime);
      setMoveHistory(prev => [...prev, data.move]);
      
      // Play sound
      playMoveSound(data.move, chess.isCheck());
    });

    socket.on('game:move:invalid', ({ error }) => {
      toast.error(error || 'Invalid move');
    });

    socket.on('game:over', (data) => {
      setGameOver(true);
      setResult(data.result);
      setRatingChange(data.ratingChanges);
      
      let message = '';
      switch (data.reason) {
        case 'checkmate':
          message = `Checkmate! ${data.result === '1-0' ? 'White' : 'Black'} wins!`;
          break;
        case 'resignation':
          message = `${data.result === '1-0' ? 'Black' : 'White'} resigned`;
          break;
        case 'timeout':
          message = `Time out! ${data.result === '1-0' ? 'White' : 'Black'} wins!`;
          break;
        case 'draw_agreement':
          message = 'Draw by agreement';
          break;
        case 'stalemate':
          message = 'Stalemate - Draw!';
          break;
        case 'repetition':
          message = 'Threefold repetition - Draw!';
          break;
        case 'insufficient_material':
          message = 'Insufficient material - Draw!';
          break;
        case 'abandonment':
          message = `Opponent abandoned - ${data.result === '1-0' ? 'White' : 'Black'} wins!`;
          break;
        default:
          message = 'Game over';
      }
      toast(message, { duration: 5000 });
    });

    socket.on('game:draw:offered', ({ by }) => {
      setDrawOffered(by);
      if ((by === 'w' && playerColor === 'b') || (by === 'b' && playerColor === 'w')) {
        toast('Your opponent offers a draw');
      }
    });

    socket.on('game:draw:declined', () => {
      setDrawOffered(null);
      toast('Draw offer declined');
    });

    socket.on('game:opponent_disconnected', ({ reconnectWindow }) => {
      setOpponentDisconnected(true);
      setReconnectCountdown(reconnectWindow);
      toast.error('Opponent disconnected! They have 60 seconds to reconnect.');
    });

    socket.on('game:opponent_reconnected', () => {
      setOpponentDisconnected(false);
      setReconnectCountdown(0);
      toast.success('Opponent reconnected!');
    });

    socket.on('chat:message', (msg) => {
      console.log('Received chat message:', msg);
      setMessages(prev => {
        // Check if message already exists (from optimistic update)
        const isDuplicate = prev.some(m => 
          m.from === msg.from && 
          m.content === msg.content && 
          Math.abs((m.timestamp || 0) - (msg.timestamp || 0)) < 5000
        );
        if (isDuplicate) return prev;
        return [...prev, msg];
      });
    });

    socket.on('spectators:update', ({ count }) => {
      setSpectatorCount(count);
    });

    return () => {
      socket.off('game:state');
      socket.off('game:moved');
      socket.off('game:move:invalid');
      socket.off('game:over');
      socket.off('game:draw:offered');
      socket.off('game:draw:declined');
      socket.off('game:opponent_disconnected');
      socket.off('game:opponent_reconnected');
      socket.off('chat:message');
      socket.off('spectators:update');
    };
  }, [socket, user.id, playerColor]);

  // Clock countdown
  useEffect(() => {
    if (gameOver || !gameData) return;

    const interval = setInterval(() => {
      const turn = game.turn();
      if (turn === 'w') {
        setWhiteTime(prev => Math.max(0, prev - 100));
      } else {
        setBlackTime(prev => Math.max(0, prev - 100));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game, gameOver, gameData]);

  // Reconnect countdown
  useEffect(() => {
    if (!opponentDisconnected || reconnectCountdown <= 0) return;

    const interval = setInterval(() => {
      setReconnectCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [opponentDisconnected, reconnectCountdown]);

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (gameOver || isSpectating) return false;
    if (game.turn() !== playerColor) return false;

    // Check for promotion
    const isPromotion = piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1');
    
    if (isPromotion) {
      // Store pending promotion and let the dialog handle it
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return true; // Allow the visual move, promotion dialog will appear
    }
    
    const move = {
      from: sourceSquare,
      to: targetSquare
    };

    // Validate move locally first
    const testGame = new Chess(game.fen());
    const result = testGame.move(move);
    
    if (!result) return false;

    // Send move to server
    makeMove(gameId, move);
    
    // Optimistically update UI
    setGame(testGame);
    
    return true;
  }, [game, gameOver, isSpectating, playerColor, gameId, makeMove]);

  const onPromotionPieceSelect = useCallback((piece) => {
    if (!pendingPromotion) return false;
    
    const promotionPiece = piece[1]?.toLowerCase() || 'q'; // Get piece type (q, r, b, n)
    
    const move = {
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: promotionPiece
    };

    // Validate move
    const testGame = new Chess(game.fen());
    const result = testGame.move(move);
    
    if (!result) {
      setPendingPromotion(null);
      return false;
    }

    // Send move to server
    makeMove(gameId, move);
    
    // Update UI
    setGame(testGame);
    setPendingPromotion(null);
    
    return true;
  }, [pendingPromotion, game, gameId, makeMove]);

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      resign(gameId);
    }
  };

  const handleOfferDraw = () => {
    offerDraw(gameId);
    toast('Draw offer sent');
  };

  const handleAcceptDraw = () => {
    acceptDraw(gameId);
  };

  const handleDeclineDraw = () => {
    declineDraw(gameId);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    if (!socket) {
      console.log('No socket connection for chat');
      toast.error('Not connected');
      return;
    }
    if (!connected) {
      console.log('Socket not authenticated');
      toast.error('Not connected');
      return;
    }
    
    console.log('Sending chat message to game', gameId, ':', chatInput.trim());
    
    socket.emit('chat:message', {
      gameId: gameId,  // Keep as string to match room name
      content: chatInput.trim()
    });
    
    // Optimistically add own message
    setMessages(prev => [...prev, {
      from: user.id,
      content: chatInput.trim(),
      timestamp: Date.now()
    }]);
    
    setChatInput('');
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    
    if (minutes < 1) {
      return `${seconds}.${tenths}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatMoves = () => {
    const moves = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      moves.push({
        number: Math.floor(i / 2) + 1,
        white: moveHistory[i]?.san || '',
        black: moveHistory[i + 1]?.san || ''
      });
    }
    return moves;
  };

  if (!gameData) {
    return (
      <div className="loading-screen">
        <div className="chess-loader">
          <div className="piece">♔</div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const whitePlayer = gameData.white_username || 'White';
  const blackPlayer = gameData.black_username || 'Black';
  const boardOrientation = playerColor === 'b' ? 'black' : 'white';

  return (
    <div className="game-page">
      <div className="game-container">
        <div className="board-section">
          {/* Top player (opponent or black) */}
          <div className={`player-info ${game.turn() === (boardOrientation === 'white' ? 'b' : 'w') ? 'active' : ''}`}>
            <div className="player-details">
              <div className="player-name">
                {boardOrientation === 'white' ? blackPlayer : whitePlayer}
              </div>
            </div>
            <div className={`clock ${(boardOrientation === 'white' ? blackTime : whiteTime) < 30000 ? 'low-time' : ''}`}>
              {formatTime(boardOrientation === 'white' ? blackTime : whiteTime)}
            </div>
          </div>

          <div className="board-container">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              boardWidth={560}
              customPieces={customPieces}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
              }}
              customDarkSquareStyle={{ backgroundColor: currentTheme.darkSquare }}
              customLightSquareStyle={{ backgroundColor: currentTheme.lightSquare }}
              animationDuration={200}
              showPromotionDialog={!!pendingPromotion}
              promotionToSquare={pendingPromotion?.to}
              onPromotionPieceSelect={onPromotionPieceSelect}
            />
          </div>

          {/* Bottom player (you or white) */}
          <div className={`player-info ${game.turn() === (boardOrientation === 'white' ? 'w' : 'b') ? 'active' : ''}`}>
            <div className="player-details">
              <div className="player-name">
                {boardOrientation === 'white' ? whitePlayer : blackPlayer}
                {!isSpectating && ' (You)'}
              </div>
            </div>
            <div className={`clock ${(boardOrientation === 'white' ? whiteTime : blackTime) < 30000 ? 'low-time' : ''}`}>
              {formatTime(boardOrientation === 'white' ? whiteTime : blackTime)}
            </div>
          </div>
        </div>

        <div className="game-sidebar">
          {/* Game status */}
          {gameOver && (
            <div className="game-result-card">
              <h3>Game Over</h3>
              <div className="result">{result}</div>
              {ratingChange && (
                <div className="rating-changes">
                  {playerColor === 'w' ? (
                    <span className={ratingChange.white.change >= 0 ? 'positive' : 'negative'}>
                      {ratingChange.white.change >= 0 ? '+' : ''}{ratingChange.white.change}
                    </span>
                  ) : (
                    <span className={ratingChange.black.change >= 0 ? 'positive' : 'negative'}>
                      {ratingChange.black.change >= 0 ? '+' : ''}{ratingChange.black.change}
                    </span>
                  )}
                </div>
              )}
              <button className="btn btn-primary" onClick={() => navigate('/play')}>
                Play Again
              </button>
            </div>
          )}

          {/* Draw offer */}
          {drawOffered && !gameOver && (
            <div className="draw-offer-card">
              {((drawOffered === 'w' && playerColor === 'b') || (drawOffered === 'b' && playerColor === 'w')) ? (
                <>
                  <p>Opponent offers a draw</p>
                  <div className="draw-actions">
                    <button className="btn btn-success btn-sm" onClick={handleAcceptDraw}>Accept</button>
                    <button className="btn btn-danger btn-sm" onClick={handleDeclineDraw}>Decline</button>
                  </div>
                </>
              ) : (
                <p>Draw offer sent...</p>
              )}
            </div>
          )}

          {/* Opponent disconnected */}
          {opponentDisconnected && !gameOver && (
            <div className="disconnect-card">
              <p>Opponent disconnected</p>
              <p className="countdown">Claiming win in {reconnectCountdown}s...</p>
            </div>
          )}

          {/* Game actions */}
          {!gameOver && !isSpectating && (
            <div className="game-actions">
              <button className="btn btn-secondary" onClick={handleOfferDraw} disabled={drawOffered}>
                <FaHandshake /> Offer Draw
              </button>
              <button className="btn btn-danger" onClick={handleResign}>
                <FaFlag /> Resign
              </button>
            </div>
          )}

          {/* Spectator info */}
          {spectatorCount > 0 && (
            <div className="spectator-info">
              <FaEye /> {spectatorCount} watching
            </div>
          )}

          {/* Share button */}
          <button 
            className="btn btn-secondary share-btn"
            onClick={() => setShowShareModal(true)}
          >
            <FaShare /> Share Game
          </button>

          {/* Move list */}
          <div className="move-list">
            <h4>Moves</h4>
            <div className="moves">
              {formatMoves().map((row) => (
                <div key={row.number} className="move-row">
                  <span className="move-number">{row.number}.</span>
                  <span className="move">{row.white}</span>
                  <span className="move">{row.black}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat toggle */}
          <button 
            className="btn btn-secondary chat-toggle"
            onClick={() => setShowChat(!showChat)}
          >
            <FaComments /> {showChat ? 'Hide Chat' : 'Show Chat'}
          </button>

          {/* Chat */}
          {showChat && (
            <div className="game-chat">
              <div className="chat-messages">
                {messages.length === 0 && (
                  <div className="no-messages">No messages yet</div>
                )}
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`chat-message ${msg.from === user.id ? 'own' : ''}`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  className="form-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyPress}
                  placeholder="Type a message..."
                  maxLength={200}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSendMessage}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={window.location.href}
        title={`Watch this chess game: ${whitePlayer} vs ${blackPlayer}`}
        text="Check out this chess game on Riddick Chess!"
      />
    </div>
  );
};

export default Game;
