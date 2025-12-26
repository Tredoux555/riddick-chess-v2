import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferences, setPreferences] = useState({
    board_theme: 'classic',
    piece_set: 'standard',
    sound_enabled: true,
    auto_promote_queen: true,
    show_legal_moves: true,
    confirm_resign: true,
    animation_speed: 'normal'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get('/api/customization/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('/api/auth/profile', { username });
      updateUser({ username });
      toast.success('Profile updated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put('/api/auth/password', {
        currentPassword,
        newPassword
      });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    
    try {
      await axios.put('/api/customization/preferences', { [key]: value });
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-sections">
        {/* Profile */}
        <section className="settings-section">
          <h2>Profile</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
              />
              <small style={{ color: 'var(--text-muted)' }}>Email cannot be changed</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Save Changes
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="settings-section">
          <h2>Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Change Password
            </button>
          </form>
        </section>

        {/* Game Preferences */}
        <section className="settings-section">
          <h2>Game Preferences</h2>
          
          <div className="preference-item">
            <div>
              <label>Board Theme</label>
              <p className="pref-desc">Choose your board colors</p>
            </div>
            <select
              className="form-input form-select"
              value={preferences.board_theme}
              onChange={(e) => handleUpdatePreferences('board_theme', e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="classic">Classic</option>
              <option value="wood">Wood</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
            </select>
          </div>

          <div className="preference-item">
            <div>
              <label>Piece Set</label>
              <p className="pref-desc">Choose your piece style</p>
            </div>
            <select
              className="form-input form-select"
              value={preferences.piece_set}
              onChange={(e) => handleUpdatePreferences('piece_set', e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="standard">Standard</option>
              <option value="neo">Neo</option>
              <option value="alpha">Alpha</option>
              <option value="merida">Merida</option>
            </select>
          </div>

          <div className="preference-item">
            <div>
              <label>Animation Speed</label>
              <p className="pref-desc">Piece movement speed</p>
            </div>
            <select
              className="form-input form-select"
              value={preferences.animation_speed}
              onChange={(e) => handleUpdatePreferences('animation_speed', e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="slow">Slow</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="preference-item">
            <div>
              <label>Sound Effects</label>
              <p className="pref-desc">Play sounds for moves</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={preferences.sound_enabled}
                onChange={(e) => handleUpdatePreferences('sound_enabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div>
              <label>Show Legal Moves</label>
              <p className="pref-desc">Highlight possible moves</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={preferences.show_legal_moves}
                onChange={(e) => handleUpdatePreferences('show_legal_moves', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div>
              <label>Auto Promote to Queen</label>
              <p className="pref-desc">Skip promotion choice</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={preferences.auto_promote_queen}
                onChange={(e) => handleUpdatePreferences('auto_promote_queen', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div>
              <label>Confirm Resign</label>
              <p className="pref-desc">Ask before resigning</p>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={preferences.confirm_resign}
                onChange={(e) => handleUpdatePreferences('confirm_resign', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>
      </div>

      <style jsx>{`
        .settings-page {
          max-width: 700px;
          margin: 0 auto;
        }
        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .settings-section {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .settings-section h2 {
          margin-bottom: 20px;
          font-size: 1.25rem;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }
        .preference-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .preference-item:last-child {
          border-bottom: none;
        }
        .preference-item label {
          font-weight: 500;
        }
        .pref-desc {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-top: 4px;
        }
        .toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
        }
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-tertiary);
          border-radius: 28px;
          transition: 0.3s;
        }
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        .toggle input:checked + .toggle-slider {
          background: var(--accent-primary);
        }
        .toggle input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }
      `}</style>
    </div>
  );
};

export default Settings;
