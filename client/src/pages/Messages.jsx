import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { FaEnvelope, FaCircle } from 'react-icons/fa';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const res = await axios.get('/api/messages/conversations');
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return <div style={styles.center}><p>Loading messages...</p></div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', color: 'white' }}>
      <h1 style={{ marginBottom: '20px' }}>
        <FaEnvelope style={{ marginRight: '10px' }} />Messages
      </h1>

      {conversations.length === 0 ? (
        <div style={styles.empty}>
          <p>No messages yet.</p>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
            Join a tournament and message your opponents to arrange matches!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '4px' }}>
          {conversations.map(convo => (
            <div
              key={convo.other_id}
              onClick={() => navigate(`/messages/${convo.other_id}`)}
              style={{
                ...styles.convoRow,
                background: convo.unread_count > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{convo.other_username}</span>
                  {convo.unread_count > 0 && (
                    <span style={styles.badge}>{convo.unread_count}</span>
                  )}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {convo.sender_id === user?.id ? 'You: ' : ''}
                  {convo.last_message}
                </div>
              </div>
              <div style={{ color: '#666', fontSize: '12px', flexShrink: 0 }}>
                {formatTime(convo.last_message_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  center: { padding: '40px', textAlign: 'center', color: 'white' },
  empty: { textAlign: 'center', padding: '40px', color: '#d0d0e0' },
  convoRow: {
    padding: '14px 16px', borderRadius: '8px', display: 'flex',
    alignItems: 'center', gap: '12px', transition: 'background 0.15s'
  },
  badge: {
    background: '#6366f1', color: 'white', borderRadius: '10px',
    padding: '1px 7px', fontSize: '11px', fontWeight: 'bold'
  }
};

export default Messages;
