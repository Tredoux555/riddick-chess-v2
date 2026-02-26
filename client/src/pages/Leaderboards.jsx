import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { FaBolt, FaFire, FaClock, FaChess, FaPuzzlePiece, FaTrophy, FaMedal } from 'react-icons/fa';

const CATEGORIES = [
  { id: 'bullet', label: 'Bullet', icon: <FaBolt />, endpoint: '/api/leaderboards/ratings/bullet' },
  { id: 'blitz', label: 'Blitz', icon: <FaFire />, endpoint: '/api/leaderboards/ratings/blitz' },
  { id: 'rapid', label: 'Rapid', icon: <FaClock />, endpoint: '/api/leaderboards/ratings/rapid' },
  { id: 'classical', label: 'Classical', icon: <FaChess />, endpoint: '/api/leaderboards/ratings/classical' },
  { id: 'puzzles', label: 'Puzzles', icon: <FaPuzzlePiece />, endpoint: '/api/leaderboards/puzzles' },
  { id: 'puzzle-rush', label: 'Puzzle Rush', icon: <FaFire />, endpoint: '/api/leaderboards/puzzle-rush' },
  { id: 'achievements', label: 'Achievements', icon: <FaMedal />, endpoint: '/api/leaderboards/achievements' },
];

const Leaderboards = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('blitz');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard(activeCategory);
  }, [activeCategory]);

  const loadLeaderboard = async (category) => {
    setLoading(true);
    const cat = CATEGORIES.find(c => c.id === category);
    
    try {
      const response = await axios.get(cat.endpoint);
      setLeaderboard(response.data.leaderboard || response.data);
      setUserRank(response.data.userRank || null);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return <span className="rank gold">🥇</span>;
    if (rank === 2) return <span className="rank silver">🥈</span>;
    if (rank === 3) return <span className="rank bronze">🥉</span>;
    return <span className="rank">{rank}</span>;
  };

  const getStatLabel = (category) => {
    switch (category) {
      case 'puzzles': return 'Rating';
      case 'puzzle-rush': return 'Best Score';
      case 'achievements': return 'Points';
      default: return 'Rating';
    }
  };

  const getStatValue = (entry, category) => {
    switch (category) {
      case 'puzzles': return entry.rating;
      case 'puzzle-rush': return entry.score;
      case 'achievements': return entry.total_points;
      default: return Math.round(entry.rating);
    }
  };

  return (
    <div className="leaderboards-page">
      <div className="page-header">
        <h1 className="page-title">Leaderboards</h1>
        <p className="page-subtitle">See how you rank against other players</p>
      </div>

      <div className="leaderboard-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`leaderboard-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {userRank && (
        <div className="your-rank-card">
          <span>Your Rank</span>
          <strong>#{userRank}</strong>
        </div>
      )}

      <div className="leaderboard-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.id} 
                className={`leaderboard-entry ${entry.id === user?.id ? 'current-user' : ''}`}
              >
                <div className="leaderboard-rank">
                  {getRankDisplay(entry.rank || index + 1)}
                </div>
                <Link to={`/profile/${entry.id}`} className="leaderboard-player">
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="player-avatar" />
                  ) : (
                    <div className="avatar-placeholder">{entry.username[0]}</div>
                  )}
                  <span className="player-name">{entry.username}</span>
                </Link>
                <div className="leaderboard-stat">
                  <span className="stat-value">{getStatValue(entry, activeCategory)}</span>
                  <span className="stat-label">{getStatLabel(activeCategory)}</span>
                </div>
                {activeCategory !== 'achievements' && entry.games && (
                  <div className="games-played">
                    {entry.games} {entry.games === 1 ? 'game' : 'games'}
                  </div>
                )}
                {activeCategory === 'achievements' && (
                  <div className="achievements-count">
                    {entry.achievements_count} unlocked
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FaTrophy className="icon" />
            <h3>No rankings yet</h3>
            <p>Play some games to appear on the leaderboard!</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .leaderboards-page {
          max-width: 800px;
          margin: 0 auto;
        }
        .leaderboard-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        .leaderboard-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: #e0e0ee;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .leaderboard-tab:hover {
          border-color: var(--accent-primary);
        }
        .leaderboard-tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        .your-rank-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: var(--bg-card);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-lg);
          margin-bottom: 24px;
        }
        .your-rank-card strong {
          font-size: 1.5rem;
          color: var(--accent-primary);
        }
        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .leaderboard-entry {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-md);
          transition: all 0.2s;
        }
        .leaderboard-entry:hover {
          background: var(--bg-tertiary);
        }
        .leaderboard-entry.current-user {
          border: 1px solid var(--accent-primary);
          background: rgba(99, 102, 241, 0.1);
        }
        .leaderboard-rank {
          width: 50px;
          text-align: center;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .rank.gold { color: gold; }
        .rank.silver { color: silver; }
        .rank.bronze { color: #cd7f32; }
        .leaderboard-player {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          color: var(--text-primary);
        }
        .player-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .player-name {
          font-weight: 500;
        }
        .leaderboard-stat {
          text-align: right;
        }
        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          color: var(--accent-primary);
        }
        .stat-label {
          display: block;
          font-size: 0.75rem;
          color: #c8c8dc;
        }
        .games-played, .achievements-count {
          color: #c8c8dc;
          font-size: 0.875rem;
          min-width: 80px;
          text-align: right;
        }
        .loading {
          text-align: center;
          padding: 40px;
        }
      `}</style>
    </div>
  );
};

export default Leaderboards;
