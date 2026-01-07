import { useState, useEffect, useRef } from 'react';

const ChatWidget = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && user?.email) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/store-features/chat/${user.email}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.log('Could not load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await fetch('/api/store-features/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: user.name, userEmail: user.email, message: newMessage })
      });
      setNewMessage('');
      loadMessages();
    } catch (err) {
      alert('Error sending message');
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '28px',
          boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
          zIndex: 1000
        }}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '350px',
          height: '450px',
          background: '#1a1a2e',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1000,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Header */}
          <div style={{ padding: '15px 20px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>💬 Chat with Riddick</h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', opacity: 0.8 }}>Usually replies within a day</p>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '50px' }}>No messages yet. Say hi! 👋</p>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.is_admin ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    padding: '10px 15px',
                    borderRadius: msg.is_admin ? '15px 15px 15px 5px' : '15px 15px 5px 15px',
                    background: msg.is_admin ? 'rgba(255,255,255,0.1)' : '#8b5cf6',
                    color: '#fff'
                  }}
                >
                  {msg.is_admin && <p style={{ margin: '0 0 3px', fontSize: '11px', color: '#8b5cf6', fontWeight: 'bold' }}>Riddick</p>}
                  <p style={{ margin: 0, fontSize: '14px' }}>{msg.message}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, padding: '10px 15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff', fontSize: '14px' }}
            />
            <button
              onClick={sendMessage}
              style={{ padding: '10px 15px', background: '#8b5cf6', border: 'none', borderRadius: '20px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;


