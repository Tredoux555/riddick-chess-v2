import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaKey, FaCheck } from 'react-icons/fa';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    axios.get(`/api/auth/verify-reset-token?token=${token}`)
      .then(res => {
        setValid(true);
        setUsername(res.data.username);
      })
      .catch(() => {
        setValid(false);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    }
  };

  if (loading) {
    return (
      <div className="reset-page">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="reset-page">
        <div className="reset-card">
          <h1>Reset Password</h1>
          <p>No reset token provided. Please use the link from your email or contact an admin.</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="reset-page">
        <div className="reset-card">
          <h1>Invalid or Expired Link</h1>
          <p>This password reset link is invalid or has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-page">
        <div className="reset-card success">
          <FaCheck className="success-icon" />
          <h1>Password Reset!</h1>
          <p>Your password has been reset successfully. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        <FaKey className="key-icon" />
        <h1>Reset Password</h1>
        <p>Create a new password for <strong>{username}</strong></p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full">
            Reset Password
          </button>
        </form>
      </div>
      
      <style jsx>{`
        .reset-page { min-height: calc(100vh - 100px); display: flex; align-items: center; justify-content: center; }
        .reset-card { background: var(--bg-card); padding: 40px; border-radius: var(--radius-lg); max-width: 400px; width: 100%; text-align: center; }
        .key-icon { font-size: 48px; color: var(--accent-primary); margin-bottom: 16px; }
        .success-icon { font-size: 48px; color: #10b981; margin-bottom: 16px; }
        h1 { margin-bottom: 8px; }
        p { color: #c8c8dc; margin-bottom: 24px; }
        form { text-align: left; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 4px; font-size: 0.875rem; }
        .btn-full { width: 100%; }
        .reset-card.success { background: rgba(16, 185, 129, 0.1); }
      `}</style>
    </div>
  );
};

export default ResetPassword;
