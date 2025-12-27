import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // In production, connect to same origin. In dev, use localhost:5000
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('authenticate', token);
    });

    newSocket.on('authenticated', (data) => {
      if (data.success) {
        setConnected(true);
        console.log('Socket authenticated');
      } else {
        console.error('Socket auth failed:', data.error);
      }
    });

    // Initial list of online friends
    newSocket.on('friends:online', ({ friendIds }) => {
      console.log('Online friends:', friendIds);
      setOnlineFriends(friendIds || []);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Friend status updates
    newSocket.on('friend:status', ({ oduserId, userId, isOnline }) => {
      const friendId = userId || oduserId; // Support both for compatibility
      setOnlineFriends(prev => {
        if (isOnline) {
          return [...new Set([...prev, friendId])];
        } else {
          return prev.filter(id => id !== friendId);
        }
      });
    });

    // Challenge notifications
    newSocket.on('challenge:received', ({ from, timeControl, rated }) => {
      console.log('=== CHALLENGE RECEIVED ===', { from, timeControl, rated });
      toast((t) => (
        <div className="challenge-toast">
          <p><strong>{from.username}</strong> challenges you!</p>
          <p>{Math.floor(timeControl / 60)} min {rated ? 'Rated' : 'Casual'}</p>
          <div className="challenge-actions">
            <button onClick={() => {
              console.log('=== ACCEPTING CHALLENGE ===');
              console.log('Emitting challenge:accept with:', { challengerId: from.id, timeControl, rated });
              newSocket.emit('challenge:accept', { 
                challengerId: from.id, 
                timeControl, 
                rated 
              });
              toast.dismiss(t.id);
            }}>Accept</button>
            <button onClick={() => {
              console.log('Declining challenge');
              newSocket.emit('challenge:decline', { challengerId: from.id });
              toast.dismiss(t.id);
            }}>Decline</button>
          </div>
        </div>
      ), { duration: 30000 });
    });

    newSocket.on('challenge:accepted', ({ gameId }) => {
      console.log('=== CHALLENGE ACCEPTED - NAVIGATING TO GAME ===', gameId);
      toast.success('Challenge accepted!');
      window.location.href = `/game/${gameId}`;
    });

    newSocket.on('challenge:declined', () => {
      toast.error('Challenge declined');
    });

    // Matchmaking
    newSocket.on('matchmaking:found', ({ gameId, color, opponent }) => {
      toast.success(`Match found! Playing as ${color === 'w' ? 'White' : 'Black'}`);
      window.location.href = `/game/${gameId}`;
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  // Game functions
  const joinGame = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('game:join', { gameId });
    }
  }, [socket, connected]);

  const makeMove = useCallback((gameId, move) => {
    if (socket && connected) {
      socket.emit('game:move', { gameId, move });
    }
  }, [socket, connected]);

  const resign = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('game:resign', { gameId });
    }
  }, [socket, connected]);

  const offerDraw = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('game:draw:offer', { gameId });
    }
  }, [socket, connected]);

  const acceptDraw = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('game:draw:accept', { gameId });
    }
  }, [socket, connected]);

  const declineDraw = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('game:draw:decline', { gameId });
    }
  }, [socket, connected]);

  // Spectating
  const spectateGame = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('spectate:join', { gameId });
    }
  }, [socket, connected]);

  const leaveSpectate = useCallback((gameId) => {
    if (socket && connected) {
      socket.emit('spectate:leave', { gameId });
    }
  }, [socket, connected]);

  // Matchmaking
  const joinMatchmaking = useCallback((timeControl) => {
    if (socket && connected) {
      socket.emit('matchmaking:join', { timeControl });
    }
  }, [socket, connected]);

  const leaveMatchmaking = useCallback(() => {
    if (socket && connected) {
      socket.emit('matchmaking:leave');
    }
  }, [socket, connected]);

  // Challenges
  const sendChallenge = useCallback((opponentId, timeControl, rated = true) => {
    if (socket && connected) {
      socket.emit('challenge:send', { opponentId, timeControl, rated });
    }
  }, [socket, connected]);

  // Chat
  const sendMessage = useCallback((gameId, content) => {
    if (socket && connected) {
      socket.emit('chat:message', { gameId, content });
    }
  }, [socket, connected]);

  const value = {
    socket,
    connected,
    onlineFriends,
    joinGame,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    spectateGame,
    leaveSpectate,
    joinMatchmaking,
    leaveMatchmaking,
    sendChallenge,
    sendMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
