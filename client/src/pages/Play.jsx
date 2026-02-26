import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaSearch, FaUserFriends, FaTimes } from 'react-icons/fa';

const TIME_CONTROLS = [
  { time: 60, increment: 0, label: '1 min', category: 'Bullet' },
  { time: 120, increment: 1, label: '2+1', category: 'Bullet' },
  { time: 180, increment: 0, label: '3 min', category: 'Blitz' },
  { time: 180, increment: 2, label: '3+2', category: 'Blitz' },
  { time: 300, increment: 0, label: '5 min', category: 'Blitz' },
  { time: 300, increment: 3, label: '5+3', category: 'Blitz' },
  { time: 600, increment: 0, label: '10 min', category: 'Rapid' },
  { time: 600, increment: 5, label: '10+5', category: 'Rapid' },
  { time: 900, increment: 10, label: '15+10', category: 'Rapid' },
  { time: 1800, increment: 0, label: '30 min', category: 'Classical' },
];

const Play = () => {
  const [selectedTime, setSelectedTime] = useState(TIME_CONTROLS[4]); // Default 5 min
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const navigate = useNavigate();
  const { socket, connected, joinMatchmaking, leaveMatchmaking, sendChallenge } = useSocket();
  const { user } = useAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadFriends();
    loadOnlineUsers();
    
    // Refresh online users every 5 seconds
    const interval = setInterval(loadOnlineUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  useEffect(() => {
    if (!socket) return;

    socket.on('matchmaking:joined', ({ position }) => {
      console.log('Joined queue, position:', position);
    });

    socket.on('matchmaking:found', ({ gameId }) => {
      setIsSearching(false);
      toast.success('Game found!');
      navigate(`/game/${gameId}`);
    });

    socket.on('challenge:sent', () => {
      toast.success('Challenge sent!');
      setShowFriendModal(false);
    });

    socket.on('challenge:error', ({ message }) => {
      toast.error(message);
    });

    return () => {
      socket.off('matchmaking:joined');
      socket.off('matchmaking:found');
      socket.off('challenge:sent');
      socket.off('challenge:error');
    };
  }, [socket, navigate]);

  const loadFriends = async () => {
    try {
      const response = await axios.get('/api/friends');
      setFriends(response.data.filter(f => f.status === 'accepted'));
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      // Use the socket-connected users endpoint for real-time accuracy
      const response = await axios.get('/api/online-users');
      setOnlineUsers(response.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const handleQuickPlay = () => {
    if (!connected) {
      toast.error('Not connected to server');
      return;
    }

    if (isSearching) {
      leaveMatchmaking();
      setIsSearching(false);
      setSearchTime(0);
      toast('Search cancelled');
    } else {
      joinMatchmaking(selectedTime.time);
      setIsSearching(true);
      setSearchTime(0);
    }
  };

  const handleChallengeFriend = (friendId) => {
    if (!connected) {
      toast.error('Not connected to server');
      return;
    }
    sendChallenge(friendId, selectedTime.time, true);
  };

  const formatSearchTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="play-page">
      <div className="page-header">
        <h1 className="page-title">Play Chess</h1>
        <p className="page-subtitle">Choose a time control and find an opponent</p>
      </div>

      <div className="play-container">
        <div className="time-controls-section">
          <h2>Time Control</h2>
          <div className="time-controls">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={`${tc.time}-${tc.increment}`}
                className={`time-control-btn ${selectedTime.time === tc.time && selectedTime.increment === tc.increment ? 'selected' : ''}`}
                onClick={() => setSelectedTime(tc)}
              >
                <div className="time">{tc.label}</div>
                <div className="label">{tc.category}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="play-actions">
          <button 
            className={`btn btn-lg ${isSearching ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleQuickPlay}
            style={{ minWidth: '200px' }}
          >
            {isSearching ? (
              <>
                <FaTimes /> Cancel ({formatSearchTime(searchTime)})
              </>
            ) : (
              <>
                <FaSearch /> Quick Play
              </>
            )}
          </button>

          <button 
            className="btn btn-lg btn-secondary"
            onClick={() => setShowFriendModal(true)}
          >
            <FaUserFriends /> Challenge Friend
          </button>
        </div>

        {isSearching && (
          <div className="searching-indicator">
            <div className="spinner"></div>
            <p>Searching for opponent...</p>
            <p className="search-info">
              {selectedTime.label} • {selectedTime.category}
            </p>
          </div>
        )}

        <div className="online-section">
          <h3>Online Players ({onlineUsers.length})</h3>
          <div className="online-list">
            {onlineUsers.slice(0, 10).map(user => (
              <div key={user.id} className="online-user">
                <div className="user-info">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="user-avatar" />
                  ) : (
                    <div className="avatar-placeholder">{user.username[0]}</div>
                  )}
                  <span>{user.username}</span>
                </div>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleChallengeFriend(user.id)}
                >
                  Challenge
                </button>
              </div>
            ))}
            {onlineUsers.length === 0 && (
              <p className="no-users">No other players online</p>
            )}
          </div>
        </div>
      </div>

      {/* Friend Challenge Modal */}
      {showFriendModal && (
        <div className="modal-overlay" onClick={() => setShowFriendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Challenge a Friend</h2>
              <button className="close-btn" onClick={() => setShowFriendModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p className="time-info">
                Time Control: <strong>{selectedTime.label}</strong> ({selectedTime.category})
              </p>
              <div className="friends-list">
                {friends.map(friend => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-info">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="" className="user-avatar" />
                      ) : (
                        <div className="avatar-placeholder">{friend.username[0]}</div>
                      )}
                      <span>{friend.username}</span>
                    </div>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleChallengeFriend(friend.friend_id || friend.user_id)}
                    >
                      Challenge
                    </button>
                  </div>
                ))}
                {friends.length === 0 && (
                  <p className="no-friends">No friends yet. Add some friends to challenge them!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .play-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .play-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .time-controls-section h2 {
          margin-bottom: 16px;
          font-size: 1.1rem;
          color: #e0e0ee;
        }
        .play-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .searching-indicator {
          text-align: center;
          padding: 32px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
        }
        .searching-indicator .spinner {
          margin: 0 auto 16px;
        }
        .search-info {
          color: #c8c8dc;
          font-size: 0.9rem;
        }
        .online-section {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .online-section h3 {
          margin-bottom: 16px;
        }
        .online-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .online-user, .friend-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        .user-info, .friend-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .no-users, .no-friends {
          color: #c8c8dc;
          text-align: center;
          padding: 24px;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          width: 90%;
          max-width: 450px;
          max-height: 80vh;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .modal-header h2 {
          font-size: 1.25rem;
        }
        .close-btn {
          background: none;
          border: none;
          color: #e0e0ee;
          cursor: pointer;
          font-size: 1.25rem;
        }
        .modal-body {
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }
        .time-info {
          margin-bottom: 16px;
          color: #e0e0ee;
        }
        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
};

export default Play;
