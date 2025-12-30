import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SecretStore.css';

const SecretStore = () => {
  const [tab, setTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!loginEmail) { setMessage({ text: 'Enter your email', type: 'error' }); return; }
    const res = await fetch('/api/secret-store/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail })
    });
    const data = await res.json();
    if (data.status === 'approved') {
      setMessage({ text: `Welcome ${data.name}! Entering store...`, type: 'success' });
      localStorage.setItem('storeUser', JSON.stringify({ email: loginEmail, name: data.name }));
      setTimeout(() => navigate('/hehe/store'), 1000);
    } else if (data.status === 'pending') {
      setMessage({ text: '⏳ Your request is pending approval', type: 'pending' });
    } else if (data.status === 'rejected') {
      setMessage({ text: '❌ Access denied', type: 'error' });
    } else {
      setMessage({ text: data.error || 'Not found', type: 'error' });
    }
  };


  const handleRequest = async () => {
    if (!reqName || !reqEmail) { setMessage({ text: 'Name and email required', type: 'error' }); return; }
    const res = await fetch('/api/secret-store/request-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: reqName, email: reqEmail, reason: reqReason })
    });
    const data = await res.json();
    if (data.success) {
      setMessage({ text: '✅ Request sent! Check back later.', type: 'success' });
    } else {
      setMessage({ text: data.error, type: 'error' });
    }
  };

  return (
    <div className="secret-store-container">
      <div className="secret-store-box">
        <div className="lock-icon">🔐</div>
        <h1>Secret Store</h1>
        <p className="subtitle">Exclusive access only</p>
        
        <div className="tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setMessage(null); }}>Login</button>
          <button className={tab === 'request' ? 'active' : ''} onClick={() => { setTab('request'); setMessage(null); }}>Request Access</button>
        </div>
        
        {tab === 'login' && (
          <div className="form">
            <input type="email" placeholder="Your email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <button className="submit-btn" onClick={handleLogin}>Enter Store</button>
          </div>
        )}

        
        {tab === 'request' && (
          <div className="form">
            <input type="text" placeholder="Your name" value={reqName} onChange={e => setReqName(e.target.value)} />
            <input type="email" placeholder="Your email" value={reqEmail} onChange={e => setReqEmail(e.target.value)} />
            <textarea placeholder="Why do you want access? (optional)" value={reqReason} onChange={e => setReqReason(e.target.value)} />
            <button className="submit-btn" onClick={handleRequest}>Request Access</button>
          </div>
        )}
        
        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
        
        <a href="/" className="back-link">← Back to Riddick Chess</a>
      </div>
    </div>
  );
};

export default SecretStore;
