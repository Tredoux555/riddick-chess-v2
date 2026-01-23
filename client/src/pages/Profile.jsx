import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import { FaUserPlus, FaGamepad, FaCrown, FaShieldAlt, FaChartLine } from 'react-icons/fa';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { sendChallenge } = useSocket();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [games, setGames] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const userId = id || currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setProfile(response.data);
      setGames(response.data.recentGames || []);
      
      // Load achievements
      const achievementsRes = await axios.get(`/api/achievements/user/${userId}`);
      setAchievements(achievementsRes.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      await axios.post('/api/friends/request', { friendId: userId });
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send request');
    }
  };

  const handleChallenge = () => {
    sendChallenge(userId, 300, true); // 5 min blitz
    toast.success('Challenge sent!');
  };

  const loadMoreGames = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}/games`, {
        params: { offset: games.length }
      });
      setGames([...games, ...response.data.games]);
    } catch (error) {
      console.error('Failed to load games:', error);
    }
  };

  const formatResult = (game) => {
    if (!game.result) return '—';
    const isWhite = game.white_player_id === userId;
    if (game.result === '1/2-1/2') return '½';
    if ((game.result === '1-0' && isWhite) || (game.result === '0-1' && !isWhite)) {
      return <span className="win">W</span>;
    }
    return <span className="loss">L</span>;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="empty-state">
        <h3>User not found</h3>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-section">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {profile.username[0].toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h1 className="profile-username">{profile.username}</h1>
          <div className="profile-badges">
            {profile.is_admin && (
              <span className="badge badge-admin"><FaShieldAlt /> Admin</span>
            )}
            {profile.is_club_member && (
              <span className="badge badge-club"><FaCrown /> Club Member</span>
            )}
          </div>
          <p className="member-since">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>

        {!isOwnProfile && (
          <div className="profile-actions">
            <button className="btn btn-primary" onClick={handleChallenge}>
              <FaGamepad /> Challenge
            </button>
            <button className="btn btn-secondary" onClick={handleAddFriend}>
              <FaUserPlus /> Add Friend
            </button>
          </div>
        )}
      </div>

      <div className="profile-stats">
        {profile.ratings && (
          <>
            <div className="stat-card">
              <div className="stat-value">{profile.ratings.bullet?.rating || 500}</div>
              <div className="stat-label">⚡ Bullet</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.ratings.blitz?.rating || 500}</div>
              <div className="stat-label">🔥 Blitz</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.ratings.rapid?.rating || 500}</div>
              <div className="stat-label">⏱️ Rapid</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{profile.ratings.stats?.totalGames || 0}</div>
              <div className="stat-label">Games</div>
            </div>
          </>
        )}
      </div>

      {profile.ratings?.stats && (
        <div className="win-stats">
          <div className="win-bar">
            <div 
              className="wins" 
              style={{ width: `${(profile.ratings.stats.wins / Math.max(profile.ratings.stats.totalGames, 1)) * 100}%` }}
            ></div>
            <div 
              className="draws" 
              style={{ width: `${(profile.ratings.stats.draws / Math.max(profile.ratings.stats.totalGames, 1)) * 100}%` }}
            ></div>
            <div 
              className="losses" 
              style={{ width: `${(profile.ratings.stats.losses / Math.max(profile.ratings.stats.totalGames, 1)) * 100}%` }}
            ></div>
          </div>
          <div className="win-labels">
            <span className="win-label">W: {profile.ratings.stats.wins}</span>
            <span className="draw-label">D: {profile.ratings.stats.draws}</span>
            <span className="loss-label">L: {profile.ratings.stats.losses}</span>
            <span className="winrate">{profile.ratings.stats.winRate}% win rate</span>
          </div>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Recent Games
        </button>
        <button 
          className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements ({profile.achievementCount || achievements.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="games-section">
          {games.length > 0 ? (
            <>
              <div className="games-list">
                {games.map(game => (
                  <Link key={game.id} to={`/game/${game.id}`} className="game-row">
                    <div className="game-result">{formatResult(game)}</div>
                    <div className="game-opponent">
                      vs {game.white_player_id === userId ? game.black_username : game.white_username}
                    </div>
                    <div className="game-info">
                      {Math.floor(game.time_control / 60)} min
                    </div>
                    <div className="game-date">
                      {game.completed_at ? new Date(game.completed_at).toLocaleDateString() : 'Recent'}
                    </div>
                  </Link>
                ))}
              </div>
              <button className="btn btn-secondary load-more" onClick={loadMoreGames}>
                Load More
              </button>
            </>
          ) : (
            <div className="empty-state">
              <FaChartLine className="icon" />
              <h3>No games yet</h3>
              <p>Games will appear here once played</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="achievements-section">
          {achievements.length > 0 ? (
            <div className="achievements-grid">
              {achievements.map(achievement => (
                <div key={achievement.id} className="achievement-card earned">
                  <span className="achievement-icon">{achievement.icon}</span>
                  <div>
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-desc">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No achievements yet</h3>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .profile-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .profile-header {
          display: flex;
          gap: 24px;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid var(--border-light);
        }
        .profile-avatar-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 700;
        }
        .profile-info {
          flex: 1;
        }
        .profile-username {
          font-size: 2rem;
          margin-bottom: 8px;
        }
        .profile-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge-admin {
          background: var(--accent-danger);
          color: white;
        }
        .badge-club {
          background: var(--accent-primary);
          color: white;
        }
        .member-since {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .profile-actions {
          display: flex;
          gap: 12px;
        }
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 20px;
          text-align: center;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .stat-label {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-top: 4px;
        }
        .win-stats {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: 20px;
          margin-bottom: 24px;
        }
        .win-bar {
          height: 20px;
          display: flex;
          border-radius: var(--radius-full);
          overflow: hidden;
          background: var(--bg-tertiary);
        }
        .win-bar .wins { background: var(--accent-success); }
        .win-bar .draws { background: var(--text-muted); }
        .win-bar .losses { background: var(--accent-danger); }
        .win-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          font-size: 0.875rem;
        }
        .win-label { color: var(--accent-success); }
        .draw-label { color: var(--text-muted); }
        .loss-label { color: var(--accent-danger); }
        .winrate { color: var(--text-secondary); }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .tab {
          padding: 8px 16px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-md);
        }
        .tab.active {
          background: var(--accent-primary);
          color: white;
        }
        .games-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .game-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: var(--bg-card);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }
        .game-row:hover {
          background: var(--bg-tertiary);
        }
        .game-result {
          width: 30px;
          text-align: center;
          font-weight: 600;
        }
        .game-result .win { color: var(--accent-success); }
        .game-result .loss { color: var(--accent-danger); }
        .game-opponent { flex: 1; }
        .game-info, .game-date { color: var(--text-muted); font-size: 0.875rem; }
        .load-more {
          width: 100%;
          margin-top: 16px;
        }
        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }
        .achievement-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-md);
        }
        .achievement-icon { font-size: 1.5rem; }
        .achievement-name { font-weight: 500; }
        .achievement-desc { font-size: 0.8rem; color: var(--text-muted); }
        @media (max-width: 768px) {
          .profile-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};

export default Profile;
