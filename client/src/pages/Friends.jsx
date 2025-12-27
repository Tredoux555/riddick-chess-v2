import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import { FaUserPlus, FaCheck, FaTimes, FaGamepad, FaSearch, FaUserFriends } from 'react-icons/fa';

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');
  const { onlineFriends, sendChallenge } = useSocket();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        axios.get('/api/friends'),
        axios.get('/api/friends/pending')
      ]);
      
      // Map friends to have consistent 'id' field
      const friendsList = friendsRes.data.map(f => ({
        ...f,
        id: f.friendship_id || f.id,
        status: f.status || 'accepted'
      }));
      setFriends(friendsList.filter(f => f.status === 'accepted'));
      
      // Handle both old and new API response formats, and normalize field names
      const incoming = pendingRes.data.received || pendingRes.data.incoming || [];
      const outgoing = pendingRes.data.sent || pendingRes.data.outgoing || [];
      
      setPendingReceived(incoming.map(r => ({ ...r, id: r.friendship_id || r.id })));
      setPendingSent(outgoing.map(r => ({ ...r, id: r.friendship_id || r.id })));
    } catch (error) {
      console.error('Failed to load friends:', error);
      toast.error('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    
    try {
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await axios.post('/api/friends/request', { friendId: userId });
      toast.success('Friend request sent!');
      setSearchResults(searchResults.filter(u => u.id !== userId));
      loadFriends();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await axios.post(`/api/friends/accept/${friendshipId}`);
      toast.success('Friend request accepted!');
      loadFriends();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    try {
      await axios.post(`/api/friends/decline/${friendshipId}`);
      toast('Request declined');
      loadFriends();
    } catch (error) {
      toast.error('Failed to decline request');
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (!window.confirm('Remove this friend?')) return;
    
    try {
      await axios.delete(`/api/friends/${friendshipId}`);
      toast('Friend removed');
      loadFriends();
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const handleChallenge = (userId) => {
    sendChallenge(userId, 300, true);
    toast.success('Challenge sent!');
  };

  const isOnline = (userId) => onlineFriends.includes(userId);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading friends...</p>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <div className="page-header">
        <h1 className="page-title">Friends</h1>
        <p className="page-subtitle">Connect and play with friends</p>
      </div>

      {/* Search */}
      <div className="search-section">
        <div className="search-box">
          <input
            type="text"
            className="form-input"
            placeholder="Search for players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            <FaSearch /> Search
          </button>
        </div>

        {searchResults && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(user => (
              <div key={user.id} className="user-row">
                <div className="user-info">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="user-avatar" />
                  ) : (
                    <div className="avatar-placeholder">{(user.username || '?')[0]}</div>
                  )}
                  <Link to={`/profile/${user.id}`}>{user.username || 'Unknown'}</Link>
                </div>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleSendRequest(user.id)}
                >
                  <FaUserPlus /> Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({friends.length})
        </button>
        <button 
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingReceived.length + pendingSent.length})
        </button>
      </div>

      {activeTab === 'friends' && (
        <div className="friends-list">
          {friends.length > 0 ? (
            friends.map(friend => {
              const friendId = friend.friend_id || friend.user_id;
              return (
                <div key={friend.id} className="friend-card">
                  <div className="friend-info">
                    <div className={`online-indicator ${isOnline(friendId) ? 'online' : ''}`}></div>
                    {friend.avatar ? (
                      <img src={friend.avatar} alt="" className="user-avatar" />
                    ) : (
                      <div className="avatar-placeholder">{friend.username?.[0] || '?'}</div>
                    )}
                    <div>
                      <Link to={`/profile/${friendId}`} className="friend-name">
                        {friend.username || 'Unknown'}
                      </Link>
                      <div className="friend-status">
                        {isOnline(friendId) ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                  <div className="friend-actions">
                    {isOnline(friendId) && (
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleChallenge(friendId)}
                      >
                        <FaGamepad /> Challenge
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <FaUserFriends className="icon" />
              <h3>No friends yet</h3>
              <p>Search for players to add them as friends</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="pending-section">
          {pendingReceived.length > 0 && (
            <div className="pending-group">
              <h3>Received Requests</h3>
              {pendingReceived.map(request => (
                <div key={request.id} className="request-card">
                  <div className="user-info">
                    {request.avatar ? (
                      <img src={request.avatar} alt="" className="user-avatar" />
                    ) : (
                      <div className="avatar-placeholder">{request.username?.[0] || '?'}</div>
                    )}
                    <Link to={`/profile/${request.user_id}`}>{request.username || 'Unknown'}</Link>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      <FaCheck /> Accept
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeclineRequest(request.id)}
                    >
                      <FaTimes /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingSent.length > 0 && (
            <div className="pending-group">
              <h3>Sent Requests</h3>
              {pendingSent.map(request => (
                <div key={request.id} className="request-card">
                  <div className="user-info">
                    {request.avatar ? (
                      <img src={request.avatar} alt="" className="user-avatar" />
                    ) : (
                      <div className="avatar-placeholder">{request.username?.[0] || '?'}</div>
                    )}
                    <span>{request.username || 'Unknown'}</span>
                  </div>
                  <span className="pending-label">Pending</span>
                </div>
              ))}
            </div>
          )}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <div className="empty-state">
              <h3>No pending requests</h3>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .friends-page {
          max-width: 700px;
          margin: 0 auto;
        }
        .search-section {
          margin-bottom: 24px;
        }
        .search-box {
          display: flex;
          gap: 12px;
        }
        .search-box input {
          flex: 1;
        }
        .search-results {
          margin-top: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 16px;
        }
        .user-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .user-row:last-child {
          border-bottom: none;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }
        .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .tab {
          padding: 8px 16px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-md);
        }
        .tab.active {
          background: var(--accent-primary);
          color: white;
        }
        .friends-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .friend-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
        }
        .friend-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .online-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--text-muted);
        }
        .online-indicator.online {
          background: var(--accent-success);
        }
        .friend-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .friend-status {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .friend-actions {
          display: flex;
          gap: 8px;
        }
        .pending-group {
          margin-bottom: 24px;
        }
        .pending-group h3 {
          margin-bottom: 12px;
          color: var(--text-secondary);
          font-size: 1rem;
        }
        .request-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-md);
          margin-bottom: 8px;
        }
        .request-actions {
          display: flex;
          gap: 8px;
        }
        .pending-label {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default Friends;
