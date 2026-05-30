import React, { useState } from 'react';
import axios from 'axios';
import { FaBullhorn } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const NotifyForm = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatus({ type: 'error', text: 'Title and message are required.' });
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      // The global axios Authorization header carries the admin JWT.
      const { data } = await axios.post(`${API_URL}/push/notify`, { title, body });
      setStatus({ type: 'success', text: `Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'}` });
      setTitle('');
      setBody('');
    } catch (err) {
      console.error('Notify failed:', err);
      setStatus({ type: 'error', text: err.response?.data?.error || 'Failed to send notification.' });
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      border: '1px solid var(--border-color)'
    }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', fontSize: '1.1rem' }}>
        <FaBullhorn style={{ color: 'var(--accent-primary)' }} /> Push Notification
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          style={{
            background: sending ? 'var(--bg-tertiary)' : 'var(--accent-primary, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: sending ? 'default' : 'pointer'
          }}
        >
          {sending ? 'Sending…' : 'Send to everyone'}
        </button>

        {status && (
          <span style={{
            marginLeft: '12px',
            fontSize: '14px',
            color: status.type === 'success' ? '#10b981' : '#ef4444'
          }}>
            {status.text}
          </span>
        )}
      </form>
    </div>
  );
};

export default NotifyForm;
