import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { FaCalendar, FaClock, FaUsers, FaTrophy, FaPlus } from 'react-icons/fa';

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const [allRes, myRes] = await Promise.all([
        axios.get('/api/tournaments'),
        axios.get('/api/tournaments/my')
      ]);
      setTournaments(allRes.data);
      setMyTournaments(myRes.data);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeControl = (seconds, increment) => {
    if (!seconds) return 'Standard';
    const mins = Math.floor(seconds / 60);
    if (increment > 0) {
      return `${mins}+${increment}`;
    }
    return `${mins} min`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return <span className="status-badge upcoming">Upcoming</span>;
      case 'active':
        return <span className="status-badge active">In Progress</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      default:
        return null;
    }
  };

  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming');
  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const completedTournaments = tournaments.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className="tournaments-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tournaments</h1>
          <p className="page-subtitle">Compete in Swiss-system tournaments</p>
        </div>
        {isAdmin && (
          <Link to="/admin/tournaments/create" className="btn btn-primary">
            <FaPlus /> Create Tournament
          </Link>
        )}
      </div>

      {/* My Active Tournaments */}
      {myTournaments.filter(t => t.status === 'active').length > 0 && (
        <div className="my-tournaments-section">
          <h2>Your Active Tournaments</h2>
          <div className="tournament-grid">
            {myTournaments.filter(t => t.status === 'active').map(tournament => (
              <Link key={tournament.id} to={`/tournament/${tournament.id}`} className="tournament-card active">
                <div className="tournament-header">
                  <h3>{tournament.name}</h3>
                  {getStatusBadge(tournament.status)}
                </div>
                <div className="tournament-body">
                  <div className="tournament-meta">
                    <span>Round {tournament.current_round}/{tournament.total_rounds}</span>
                    <span>Your Score: {tournament.score}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingTournaments.length})
        </button>
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          In Progress ({activeTournaments.length})
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({completedTournaments.length})
        </button>
      </div>

      {/* Tournament List */}
      <div className="tournament-list">
        {activeTab === 'upcoming' && (
          upcomingTournaments.length > 0 ? (
            upcomingTournaments.map(tournament => (
              <TournamentCard key={tournament.id} tournament={tournament} formatDate={formatDate} formatTimeControl={formatTimeControl} />
            ))
          ) : (
            <div className="empty-state">
              <FaTrophy className="icon" />
              <h3>No upcoming tournaments</h3>
              <p>Check back later for new tournaments!</p>
            </div>
          )
        )}

        {activeTab === 'active' && (
          activeTournaments.length > 0 ? (
            activeTournaments.map(tournament => (
              <TournamentCard key={tournament.id} tournament={tournament} formatDate={formatDate} formatTimeControl={formatTimeControl} />
            ))
          ) : (
            <div className="empty-state">
              <FaTrophy className="icon" />
              <h3>No active tournaments</h3>
            </div>
          )
        )}

        {activeTab === 'completed' && (
          completedTournaments.length > 0 ? (
            completedTournaments.map(tournament => (
              <TournamentCard key={tournament.id} tournament={tournament} formatDate={formatDate} formatTimeControl={formatTimeControl} />
            ))
          ) : (
            <div className="empty-state">
              <FaTrophy className="icon" />
              <h3>No completed tournaments yet</h3>
            </div>
          )
        )}
      </div>

      <style jsx>{`
        .tournaments-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .my-tournaments-section {
          margin-bottom: 32px;
        }
        .my-tournaments-section h2 {
          margin-bottom: 16px;
          font-size: 1.1rem;
          color: var(--text-secondary);
        }
        .tournament-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
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
          transition: all 0.2s;
        }
        .tab:hover {
          background: var(--bg-tertiary);
        }
        .tab.active {
          background: var(--accent-primary);
          color: white;
        }
        .tournament-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.upcoming {
          background: rgba(99, 102, 241, 0.2);
          color: var(--accent-primary);
        }
        .status-badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: var(--accent-success);
        }
        .status-badge.completed {
          background: rgba(107, 114, 128, 0.2);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

const TournamentCard = ({ tournament, formatDate, formatTimeControl }) => (
  <Link to={`/tournament/${tournament.id}`} className="tournament-card">
    <div className="tournament-header">
      <h3>{tournament.name}</h3>
    </div>
    <div className="tournament-body">
      {tournament.description && (
        <p className="description">{tournament.description}</p>
      )}
      <div className="tournament-meta">
        <div className="meta-item">
          <FaCalendar />
          <span>{formatDate(tournament.start_time)}</span>
        </div>
        <div className="meta-item">
          <FaClock />
          <span>{formatTimeControl(tournament.time_control, tournament.increment)}</span>
        </div>
        <div className="meta-item">
          <FaUsers />
          <span>{tournament.participant_count || 0}/{tournament.max_players}</span>
        </div>
        <div className="meta-item">
          <FaTrophy />
          <span>{tournament.total_rounds} rounds</span>
        </div>
      </div>
    </div>
    
    <style jsx>{`
      .tournament-card {
        display: block;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        overflow: hidden;
        transition: all 0.2s;
        color: var(--text-primary);
      }
      .tournament-card:hover {
        border-color: var(--accent-primary);
        transform: translateY(-2px);
      }
      .tournament-card.active {
        border-color: var(--accent-success);
      }
      .tournament-header {
        padding: 16px 20px;
        background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .tournament-header h3 {
        margin: 0;
        font-size: 1.1rem;
      }
      .tournament-body {
        padding: 16px 20px;
      }
      .description {
        color: var(--text-secondary);
        font-size: 0.9rem;
        margin-bottom: 12px;
      }
      .tournament-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
      }
      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text-secondary);
        font-size: 0.875rem;
      }
    `}</style>
  </Link>
);

export default Tournaments;
