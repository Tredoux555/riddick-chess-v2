import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { FaCrown, FaUsers, FaComments, FaPaperPlane, FaCheck, FaTimes, FaCog } from 'react-icons/fa';

const Club = () => {
  const { user, isAdmin } = useAuth();
  const socket = useSocket();
  const [clubInfo, setClubInfo] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);
  
  // Members state
  const [members, setMembers] = useState([]);
  
  // Join request state
  const [joinMessage, setJoinMessage] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  
  // Admin state
  const [editingClub, setEditingClub] = useState(false);
  const [clubForm, setClubForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (socket && status?.isMember) {
      socket.emit('club:join');
      
      socket.on('club:message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });
      
      return () => {
        socket.emit('club:leave');
        socket.off('club:message');
      };
    }
  }, [socket, status?.isMember]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [infoRes, statusRes] = await Promise.all([
        axios.get('/api/club/info'),
        axios.get('/api/club/status')
      ]);
      
      setClubInfo(infoRes.data);
      setStatus(statusRes.data);
      setClubForm({ name: infoRes.data.name, description: infoRes.data.description || '' });
      
      if (statusRes.data.isMember) {
        const [chatRes, membersRes] = await Promise.all([
          axios.get('/api/club/chat'),
          axios.get('/api/club/members/list')
        ]);
        setMessages(chatRes.data);
        setMembers(membersRes.data);
      }
      
      if (isAdmin) {
        const requestsRes = await axios.get('/api/club/join-requests');
        setJoinRequests(requestsRes.data);
      }
    } catch (error) {
      console.error('Load club data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    try {
      await axios.post('/api/club/join', { message: joinMessage });
      toast.success('Join request submitted!');
      setStatus({ ...status, hasPendingRequest: true });
      setJoinMessage('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit request');
    }
  };

  const handleApproveRequest = async (id) => {
    try {
      await axios.post(`/api/club/join-requests/${id}/approve`);
      toast.success('Request approved!');
      setJoinRequests(prev => prev.filter(r => r.id !== id));
      loadData();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await axios.post(`/api/club/join-requests/${id}/reject`);
      toast.success('Request rejected');
      setJoinRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    
    socket.emit('club:message', { message: newMessage.trim() });
    setNewMessage('');
  };

  const handleUpdateClub = async () => {
    try {
      await axios.put('/api/club/info', clubForm);
      toast.success('Club updated!');
      setEditingClub(false);
      loadData();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading club...</p>
      </div>
    );
  }

  // Non-member view
  if (!status?.isMember) {
    return (
      <div className="club-page">
        <div className="club-header">
          <FaCrown className="club-icon" />
          <h1>{clubInfo?.name || 'Chess Club'}</h1>
          <p className="club-description">{clubInfo?.description}</p>
          <p className="member-count"><FaUsers /> {clubInfo?.memberCount || 0} members</p>
        </div>

        <div className="join-section">
          {status?.hasPendingRequest ? (
            <div className="pending-notice">
              <h3>⏳ Request Pending</h3>
              <p>Your join request is being reviewed by an admin.</p>
            </div>
          ) : (
            <>
              <h3>Want to join?</h3>
              <p>Submit a request to join the club and get access to exclusive chat and content.</p>
              <textarea
                className="form-input"
                placeholder="Tell us why you want to join (optional)"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                rows={3}
              />
              <button className="btn btn-primary" onClick={handleJoinRequest}>
                Request to Join
              </button>
            </>
          )}
        </div>

        <style jsx>{`
          .club-page { max-width: 600px; margin: 0 auto; }
          .club-header { text-align: center; padding: 40px 20px; background: var(--bg-card); border-radius: var(--radius-lg); margin-bottom: 24px; }
          .club-icon { font-size: 48px; color: gold; margin-bottom: 16px; }
          .club-description { color: var(--text-secondary); margin: 12px 0; }
          .member-count { color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 8px; }
          .join-section { background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); text-align: center; }
          .join-section h3 { margin-bottom: 12px; }
          .join-section p { color: var(--text-secondary); margin-bottom: 16px; }
          .join-section textarea { width: 100%; margin-bottom: 16px; }
          .pending-notice { padding: 20px; background: rgba(99, 102, 241, 0.1); border-radius: var(--radius-md); }
          .pending-notice h3 { margin-bottom: 8px; }
        `}</style>
      </div>
    );
  }

  // Member view
  return (
    <div className="club-page member-view">
      <div className="club-header compact">
        <div className="header-info">
          <FaCrown className="club-icon" />
          <div>
            <h1>{clubInfo?.name}</h1>
            <p><FaUsers /> {clubInfo?.memberCount} members</p>
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-secondary btn-sm" onClick={() => setEditingClub(!editingClub)}>
            <FaCog /> Settings
          </button>
        )}
      </div>

      {editingClub && isAdmin && (
        <div className="edit-club-form">
          <input
            className="form-input"
            placeholder="Club Name"
            value={clubForm.name}
            onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
          />
          <textarea
            className="form-input"
            placeholder="Description"
            value={clubForm.description}
            onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
            rows={2}
          />
          <div className="form-actions">
            <button className="btn btn-primary btn-sm" onClick={handleUpdateClub}>Save</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditingClub(false)}>Cancel</button>
          </div>
        </div>
      )}

      {isAdmin && joinRequests.length > 0 && (
        <div className="join-requests">
          <h3>Join Requests ({joinRequests.length})</h3>
          {joinRequests.map(req => (
            <div key={req.id} className="request-card">
              <div className="request-info">
                <strong>{req.username}</strong>
                {req.message && <p>{req.message}</p>}
              </div>
              <div className="request-actions">
                <button className="btn btn-success btn-sm" onClick={() => handleApproveRequest(req.id)}>
                  <FaCheck />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleRejectRequest(req.id)}>
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <FaComments /> Chat
        </button>
        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <FaUsers /> Members
        </button>
      </div>

      {activeTab === 'chat' && (
        <div className="chat-section">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <FaComments />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.user_id === user?.id ? 'own' : ''}`}>
                  <div className="message-avatar">
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="" />
                    ) : (
                      <div className="avatar-placeholder">{msg.username?.[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="username">{msg.username}</span>
                      <span className="time">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="message-text">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="form-input"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              maxLength={500}
            />
            <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="members-section">
          {members.map(member => (
            <div key={member.id} className="member-card">
              <div className="member-avatar">
                {member.avatar ? (
                  <img src={member.avatar} alt="" />
                ) : (
                  <div className="avatar-placeholder">{member.username?.[0]?.toUpperCase()}</div>
                )}
              </div>
              <div className="member-info">
                <span className="member-name">{member.username}</span>
                <span className="member-joined">Member since {new Date(member.club_verified_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .club-page.member-view { max-width: 800px; margin: 0 auto; }
        .club-header.compact { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: var(--bg-card); border-radius: var(--radius-lg); margin-bottom: 16px; }
        .header-info { display: flex; align-items: center; gap: 16px; }
        .header-info .club-icon { font-size: 32px; color: gold; }
        .header-info h1 { margin: 0; font-size: 1.5rem; }
        .header-info p { margin: 0; color: var(--text-muted); font-size: 0.875rem; display: flex; align-items: center; gap: 6px; }
        .edit-club-form { background: var(--bg-card); padding: 16px; border-radius: var(--radius-lg); margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
        .form-actions { display: flex; gap: 8px; }
        .join-requests { background: var(--bg-card); padding: 16px; border-radius: var(--radius-lg); margin-bottom: 16px; }
        .join-requests h3 { margin-bottom: 12px; font-size: 1rem; }
        .request-card { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 8px; }
        .request-info p { margin: 4px 0 0; color: var(--text-muted); font-size: 0.875rem; }
        .request-actions { display: flex; gap: 8px; }
        .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .tab { padding: 10px 20px; background: var(--bg-card); border: none; border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .tab.active { background: var(--accent-primary); color: white; }
        .chat-section { background: var(--bg-card); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; height: 500px; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .empty-chat { text-align: center; color: var(--text-muted); padding: 40px; }
        .empty-chat svg { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
        .chat-message { display: flex; gap: 12px; }
        .chat-message.own { flex-direction: row-reverse; }
        .message-avatar img, .avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; }
        .avatar-placeholder { background: var(--accent-primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
        .message-content { max-width: 70%; }
        .message-header { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
        .chat-message.own .message-header { flex-direction: row-reverse; }
        .username { font-weight: 600; font-size: 0.875rem; }
        .time { color: var(--text-muted); font-size: 0.75rem; }
        .message-text { background: var(--bg-tertiary); padding: 10px 14px; border-radius: 12px; margin: 0; word-wrap: break-word; }
        .chat-message.own .message-text { background: var(--accent-primary); color: white; }
        .chat-input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-color); }
        .chat-input input { flex: 1; }
        .members-section { display: flex; flex-direction: column; gap: 8px; }
        .member-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-card); border-radius: var(--radius-md); }
        .member-avatar img, .member-card .avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; }
        .member-info { display: flex; flex-direction: column; }
        .member-name { font-weight: 500; }
        .member-joined { font-size: 0.75rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default Club;
