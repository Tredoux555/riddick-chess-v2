import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaEnvelope, FaChessKing } from 'react-icons/fa';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <FaEnvelope />
          </div>
          <h1 className="auth-title">Check Your Email</h1>
          <p style={{ color: '#c8c8dc', textAlign: 'center', lineHeight: '1.6' }}>
            If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
          </p>
          <p style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/login" style={{ color: '#6366f1' }}>Back to login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">
          <FaChessKing />
        </div>
        <h1 className="auth-title">Reset Password</h1>
        <p style={{ color: '#c8c8dc', textAlign: 'center', marginBottom: '24px' }}>
          Enter your email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">
              <FaEnvelope style={{ marginRight: '6px' }} /> Email
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 24px', marginTop: '8px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              border: 'none', borderRadius: 'var(--radius-lg)', color: 'white',
              fontWeight: '600', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#c8c8dc', fontSize: '14px' }}>
          Remember your password? <Link to="/login" style={{ color: '#6366f1' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
