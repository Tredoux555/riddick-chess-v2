import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { FaArrowLeft } from 'react-icons/fa';

const DirectMessage = () => {
  const { userId: otherUserId } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const otherId = parseInt(otherUserId);

  // Load messages and mark as read
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await axios.get(`/api/messages/${otherId}?limit=100`);
        setMessages(res.data || []);
        // Get the other user's name from messages
        const otherMsg = res.data.find(m => m.sender_id === otherId);
        if (otherMsg) {
          setOtherUser({ username: otherMsg.sender_username, avatar: otherMsg.sender_avatar });
        } else {
          // Fallback: fetch user info
          try {
            const userRes = await axios.get(`/api/users/${otherId}`);
            setOtherUser({ username: userRes.data.username, avatar: userRes.data.avatar });
          } catch (e) {
            setOtherUser({ username: `User #${otherId}` });
          }
        }
      } catch (err) {
        console.error('Failed to load DMs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [otherId]);

  // Listen for real-time DMs
  useEffect(() => {
    if (!socket || !connected) return;

    // Mark as read
    socket.emit('dm:read', { otherUserId: otherId });

    const handleDM = (msg) => {
      // Only show messages from this conversation
      if (
        (msg.sender_id === otherId && msg.receiver_id === user?.id) ||
        (msg.sender_id === user?.id && msg.receiver_id === otherId)
      ) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read immediately since we're viewing this convo
        if (msg.sender_id === otherId) {
          socket.emit('dm:read', { otherUserId: otherId });
        }
      }
    };

    socket.on('dm:receive', handleDM);
    return () => socket.off('dm:receive', handleDM);
  }, [socket, connected, otherId, user?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit('dm:send', { receiverId: otherId, content: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Loading...</div>;
  }

  // Group messages by date
  let lastDate = null;

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', color: 'white', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #333' }}>
        <Link to="/messages" style={{ color: '#95cc75' }}><FaArrowLeft /></Link>
        <h2 style={{ margin: 0 }}>{otherUser?.username || 'Loading...'}</h2>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            Start the conversation! Coordinate your match time here.
          </div>
        )}
        {messages.map((msg) => {
          const msgDate = formatDate(msg.created_at);
          let showDate = false;
          if (msgDate !== lastDate) {
            showDate = true;
            lastDate = msgDate;
          }
          const isMe = msg.sender_id === user?.id;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div style={{ textAlign: 'center', color: '#666', fontSize: '12px', margin: '12px 0' }}>
                  {msgDate}
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                marginBottom: '6px'
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '8px 14px',
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMe ? 'rgba(118, 150, 86, 0.25)' : 'rgba(255,255,255,0.08)',
                  border: isMe ? '1px solid rgba(118, 150, 86, 0.4)' : '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ fontSize: '14px', color: '#e0e0ee' }}>{msg.content}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', textAlign: 'right' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #333' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={1000}
          style={{
            flex: 1, background: '#1a1a2e', border: '1px solid #444', borderRadius: '8px',
            padding: '10px 14px', color: '#e0e0ee', fontSize: '14px', outline: 'none'
          }}
        />
        <button onClick={sendMessage} style={{
          padding: '10px 20px', background: '#769656', color: 'white', border: 'none',
          borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
        }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default DirectMessage;
