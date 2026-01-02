import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  FaPlay, FaTrophy, FaPuzzlePiece, FaChartLine, 
  FaMedal, FaUsers, FaCrown, FaCog, FaSignOutAlt, FaUser,
  FaShieldAlt
} from 'react-icons/fa';

const Navbar = () => {
  const { user, isAdmin, isClubMember, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks = [
    { path: '/play', label: 'Play', icon: <FaPlay /> },
    { path: '/tournaments', label: 'Tournaments', icon: <FaTrophy /> },
    { path: '/puzzles', label: 'Puzzles', icon: <FaPuzzlePiece /> },
    { path: '/leaderboards', label: 'Leaderboards', icon: <FaChartLine /> },
    { path: '/achievements', label: 'Achievements', icon: <FaMedal /> },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          <span className="icon">♔</span>
          <span>Riddick Chess</span>
        </Link>

        {user && (
          <ul className="navbar-nav">
            {navLinks.map(link => (
              <li key={link.path}>
                <Link 
                  to={link.path} 
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                >
                  <span className="icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
            {isClubMember && (
              <li>
                <Link 
                  to="/club" 
                  className={`nav-link ${isActive('/club') ? 'active' : ''}`}
                >
                  <span className="icon"><FaCrown /></span>
                  <span>Club</span>
                </Link>
              </li>
            )}
          </ul>
        )}

        <div className="navbar-user">
          {user ? (
            <>
              <div 
                className={`connection-status ${connected ? 'connected' : 'disconnected'}`}
                title={connected ? 'Connected' : 'Disconnected'}
              >
                <span className="status-dot"></span>
              </div>
              
              <div 
                className="user-menu"
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <button className="user-button">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="user-avatar" />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="username">{user.username}</span>
                </button>

                {showDropdown && (
                  <div className="user-dropdown">
                    <Link to="/profile" className="dropdown-item">
                      <FaUser /> Profile
                    </Link>
                    <Link to="/friends" className="dropdown-item">
                      <FaUsers /> Friends
                    </Link>
                    <Link to="/settings" state={{ from: location.pathname }} className="dropdown-item">
                      <FaCog /> Settings
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="dropdown-divider"></div>
                        <Link to="/admin/riddick" className="dropdown-item admin-link">
                          <FaShieldAlt /> Admin Panel
                        </Link>
                      </>
                    )}
                    <div className="dropdown-divider"></div>
                    <button onClick={logout} className="dropdown-item logout-btn">
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .connection-status {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 10px;
        }
        .connection-status.connected .status-dot,
        .connection-status.connected {
          background: var(--accent-success);
        }
        .connection-status.disconnected .status-dot,
        .connection-status.disconnected {
          background: var(--accent-danger);
        }
        .user-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          padding: 4px 12px 4px 4px;
          cursor: pointer;
          color: var(--text-primary);
        }
        .user-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .username {
          font-weight: 500;
        }
        .auth-buttons {
          display: flex;
          gap: 8px;
        }
        .admin-link {
          color: var(--accent-danger) !important;
        }
        .logout-btn {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logout-btn:hover {
          color: var(--accent-danger);
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
