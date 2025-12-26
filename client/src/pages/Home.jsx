import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FaPlay, FaTrophy, FaPuzzlePiece, FaUsers, FaChartLine, FaCrown } from 'react-icons/fa';

const Home = () => {
  const { user, isClubMember } = useAuth();
  const [stats, setStats] = useState(null);
  const [liveGames, setLiveGames] = useState([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, tournamentsRes] = await Promise.all([
        axios.get('/api/auth/me'),
        axios.get('/api/tournaments?limit=3')
      ]);
      setStats(statsRes.data);
      setUpcomingTournaments(tournamentsRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="landing-page">
        <div className="hero">
          <h1>♔ Riddick Chess</h1>
          <p className="hero-subtitle">Your School Chess Club Platform</p>
          <p className="hero-description">
            Play chess, compete in tournaments, solve puzzles, and climb the leaderboards.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </div>

        <div className="features grid-3">
          <div className="feature-card">
            <div className="feature-icon">♟️</div>
            <h3>Play Chess</h3>
            <p>Real-time games with friends or find opponents through matchmaking</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Tournaments</h3>
            <p>Swiss-system tournaments with automatic pairings and standings</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧩</div>
            <h3>Puzzles</h3>
            <p>Train tactics with rated puzzles and compete in Puzzle Rush</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Glicko-2 Ratings</h3>
            <p>Accurate skill ratings for Bullet, Blitz, Rapid, and Classical</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏅</div>
            <h3>Achievements</h3>
            <p>Unlock achievements and show off your accomplishments</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Club Features</h3>
            <p>Exclusive content and events for verified club members</p>
          </div>
        </div>

        <style jsx>{`
          .landing-page {
            text-align: center;
            padding: 40px 0;
          }
          .hero {
            margin-bottom: 60px;
          }
          .hero h1 {
            font-size: 4rem;
            font-family: 'Space Grotesk', sans-serif;
            margin-bottom: 16px;
          }
          .hero-subtitle {
            font-size: 1.5rem;
            color: var(--accent-primary);
            margin-bottom: 16px;
          }
          .hero-description {
            color: var(--text-secondary);
            font-size: 1.1rem;
            max-width: 500px;
            margin: 0 auto 32px;
          }
          .hero-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
          }
          .feature-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 32px;
            text-align: center;
          }
          .feature-icon {
            font-size: 3rem;
            margin-bottom: 16px;
          }
          .feature-card h3 {
            margin-bottom: 8px;
          }
          .feature-card p {
            color: var(--text-secondary);
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  // Dashboard for authenticated users
  return (
    <div className="dashboard">
      <div className="welcome-section">
        <h1>Welcome back, {user.username}!</h1>
        <p>Ready to play some chess?</p>
      </div>

      <div className="quick-actions grid-4">
        <Link to="/play" className="action-card">
          <FaPlay className="action-icon" />
          <span>Play Now</span>
        </Link>
        <Link to="/puzzles" className="action-card">
          <FaPuzzlePiece className="action-icon" />
          <span>Puzzles</span>
        </Link>
        <Link to="/tournaments" className="action-card">
          <FaTrophy className="action-icon" />
          <span>Tournaments</span>
        </Link>
        <Link to="/leaderboards" className="action-card">
          <FaChartLine className="action-icon" />
          <span>Leaderboards</span>
        </Link>
      </div>

      <div className="dashboard-grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Ratings</h3>
          </div>
          <div className="card-body">
            {stats ? (
              <div className="ratings-list">
                <div className="rating-item">
                  <span className="rating-label">⚡ Bullet</span>
                  <span className="rating-value">{Math.round(stats.bullet_rating || 1500)}</span>
                </div>
                <div className="rating-item">
                  <span className="rating-label">🔥 Blitz</span>
                  <span className="rating-value">{Math.round(stats.blitz_rating || 1500)}</span>
                </div>
                <div className="rating-item">
                  <span className="rating-label">⏱️ Rapid</span>
                  <span className="rating-value">{Math.round(stats.rapid_rating || 1500)}</span>
                </div>
                <div className="rating-item">
                  <span className="rating-label">🧩 Puzzles</span>
                  <span className="rating-value">{Math.round(stats.puzzle_rating || 1500)}</span>
                </div>
              </div>
            ) : (
              <p>Loading ratings...</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Stats</h3>
          </div>
          <div className="card-body">
            {stats ? (
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{stats.total_games || 0}</span>
                  <span className="stat-label">Games</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.total_wins || 0}</span>
                  <span className="stat-label">Wins</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.puzzles_solved || 0}</span>
                  <span className="stat-label">Puzzles</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{stats.best_streak || 0}</span>
                  <span className="stat-label">Best Streak</span>
                </div>
              </div>
            ) : (
              <p>Loading stats...</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Tournaments</h3>
            <Link to="/tournaments" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          <div className="card-body">
            {upcomingTournaments.length > 0 ? (
              <div className="tournament-list">
                {upcomingTournaments.map(t => (
                  <Link key={t.id} to={`/tournament/${t.id}`} className="tournament-item">
                    <div className="tournament-name">{t.name}</div>
                    <div className="tournament-time">
                      {new Date(t.start_time).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted">No upcoming tournaments</p>
            )}
          </div>
        </div>

        {isClubMember && (
          <div className="card club-card">
            <div className="card-header">
              <h3 className="card-title"><FaCrown /> Club Member</h3>
            </div>
            <div className="card-body">
              <p>You have access to exclusive club content!</p>
              <Link to="/club" className="btn btn-primary" style={{ marginTop: '16px' }}>
                View Club Area
              </Link>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .welcome-section {
          margin-bottom: 32px;
        }
        .welcome-section h1 {
          font-size: 2rem;
          margin-bottom: 8px;
        }
        .welcome-section p {
          color: var(--text-secondary);
        }
        .quick-actions {
          margin-bottom: 32px;
        }
        .action-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          text-align: center;
          color: var(--text-primary);
          transition: all 0.2s;
        }
        .action-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }
        .action-icon {
          font-size: 2rem;
          color: var(--accent-primary);
          margin-bottom: 8px;
        }
        .action-card span {
          display: block;
          font-weight: 500;
        }
        .dashboard-grid {
          gap: 24px;
        }
        .ratings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .rating-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .rating-value {
          font-weight: 600;
          font-family: 'Space Grotesk', sans-serif;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-item .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .stat-item .stat-label {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .tournament-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tournament-item {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }
        .tournament-item:hover {
          background: var(--border-color);
        }
        .tournament-time {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .club-card {
          border-color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.05);
        }
        .text-muted {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

export default Home;
