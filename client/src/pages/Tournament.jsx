import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaCalendar, FaClock, FaUsers, FaTrophy, FaCheck } from 'react-icons/fa';

const Tournament = () => {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('standings');
  const [rounds, setRounds] = useState([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    setLoading(true);
    try {
      const [tournamentRes, roundsRes] = await Promise.all([
        axios.get(`/api/tournaments/${id}`),
        axios.get(`/api/tournaments/${id}/rounds`)
      ]);
      setTournament(tournamentRes.data);
      setRounds(roundsRes.data);
    } catch (error) {
      console.error('Failed to load tournament:', error);
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`/api/tournaments/${id}/register`);
      toast.success('Registered for tournament!');
      loadTournament();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to register');
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw?')) return;
    
    try {
      await axios.post(`/api/tournaments/${id}/withdraw`);
      toast.success('Withdrawn from tournament');
      loadTournament();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to withdraw');
    }
  };

  const handleStartTournament = async () => {
    if (!window.confirm('Start the tournament now?')) return;
    
    try {
      await axios.post(`/api/tournaments/${id}/start`);
      toast.success('Tournament started!');
      loadTournament();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start tournament');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeControl = (seconds, increment) => {
    const mins = Math.floor(seconds / 60);
    return increment > 0 ? `${mins}+${increment}` : `${mins} min`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading tournament...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="empty-state">
        <h3>Tournament not found</h3>
        <Link to="/tournaments" className="btn btn-primary">Back to Tournaments</Link>
      </div>
    );
  }

  const isRegistered = tournament.isRegistered;
  const canRegister = tournament.status === 'upcoming' && !isRegistered;
  const canWithdraw = tournament.status !== 'completed' && isRegistered;
  const canStart = isAdmin && tournament.status === 'upcoming' && tournament.participants?.length >= 2;

  return (
    <div className="tournament-page">
      <div className="tournament-header-section">
        <div className="tournament-info">
          <h1>{tournament.name}</h1>
          {tournament.description && <p className="description">{tournament.description}</p>}
          
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
              <span>{tournament.participant_count || tournament.participants?.length || 0}/{tournament.max_players} players</span>
            </div>
            <div className="meta-item">
              <FaTrophy />
              <span>{tournament.total_rounds} rounds (Swiss)</span>
            </div>
          </div>

          <div className="status-info">
            <span className={`status-badge ${tournament.status}`}>
              {tournament.status === 'upcoming' ? 'Registration Open' :
               tournament.status === 'active' ? `Round ${tournament.current_round}/${tournament.total_rounds}` :
               'Completed'}
            </span>
          </div>
        </div>

        <div className="tournament-actions">
          {canRegister && (
            <button className="btn btn-primary btn-lg" onClick={handleRegister}>
              Register
            </button>
          )}
          {canWithdraw && (
            <button className="btn btn-danger" onClick={handleWithdraw}>
              Withdraw
            </button>
          )}
          {canStart && (
            <button className="btn btn-success btn-lg" onClick={handleStartTournament}>
              Start Tournament
            </button>
          )}
          {isRegistered && <span className="registered-badge"><FaCheck /> Registered</span>}
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'standings' ? 'active' : ''}`}
          onClick={() => setActiveTab('standings')}
        >
          Standings
        </button>
        <button 
          className={`tab ${activeTab === 'pairings' ? 'active' : ''}`}
          onClick={() => setActiveTab('pairings')}
        >
          Pairings
        </button>
        <button 
          className={`tab ${activeTab === 'rounds' ? 'active' : ''}`}
          onClick={() => setActiveTab('rounds')}
        >
          All Rounds
        </button>
      </div>

      {activeTab === 'standings' && (
        <div className="standings-section">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Rating</th>
                <th>Score</th>
                <th>Buchholz</th>
              </tr>
            </thead>
            <tbody>
              {tournament.participants?.map((player, index) => (
                <tr key={player.user_id} className={player.user_id === user.id ? 'current-user' : ''}>
                  <td className={`rank rank-${index + 1}`}>{index + 1}</td>
                  <td>
                    <Link to={`/profile/${player.user_id}`} className="player-link">
                      {player.avatar && <img src={player.avatar} alt="" className="player-avatar" />}
                      {player.username}
                    </Link>
                  </td>
                  <td>{Math.round(player.rating || 1500)}</td>
                  <td className="score">{player.score}</td>
                  <td>{player.buchholz?.toFixed(1) || '0.0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'pairings' && tournament.currentPairings && (
        <div className="pairings-section">
          <h3>Round {tournament.current_round} Pairings</h3>
          <div className="pairings-list">
            {tournament.currentPairings.map((pairing, index) => (
              <div key={index} className="pairing-card">
                {pairing.is_bye ? (
                  <div className="bye-pairing">
                    <span className="player">{pairing.white_username}</span>
                    <span className="bye-label">BYE</span>
                  </div>
                ) : (
                  <>
                    <div className="pairing-players">
                      <span className="player white">{pairing.white_username}</span>
                      <span className="vs">vs</span>
                      <span className="player black">{pairing.black_username}</span>
                    </div>
                    {pairing.result ? (
                      <span className="result">{pairing.result}</span>
                    ) : pairing.game_id ? (
                      <Link to={`/game/${pairing.game_id}`} className="btn btn-sm btn-primary">
                        {(pairing.white_player_id === user.id || pairing.black_player_id === user.id) ? 'Play' : 'Watch'}
                      </Link>
                    ) : (
                      <span className="pending">Pending</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'rounds' && (
        <div className="rounds-section">
          {rounds.map((round) => (
            <div key={round.round} className="round-section">
              <h3>Round {round.round}</h3>
              <div className="pairings-list">
                {round.pairings.map((pairing, index) => (
                  <div key={index} className="pairing-card compact">
                    {pairing.is_bye ? (
                      <span>{pairing.white_username} - BYE</span>
                    ) : (
                      <>
                        <span>{pairing.white_username} vs {pairing.black_username}</span>
                        <span className="result">{pairing.result || '—'}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {rounds.length === 0 && (
            <div className="empty-state">
              <p>No rounds played yet</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .tournament-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .tournament-header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding: 24px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
        }
        .tournament-info h1 {
          margin-bottom: 8px;
        }
        .description {
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        .tournament-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 16px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
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
        .tournament-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
        }
        .registered-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--accent-success);
          font-weight: 500;
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
        }
        .tab.active {
          background: var(--accent-primary);
          color: white;
        }
        .standings-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .standings-table th,
        .standings-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        .standings-table th {
          background: var(--bg-tertiary);
          font-weight: 500;
          color: var(--text-muted);
        }
        .standings-table tr.current-user {
          background: rgba(99, 102, 241, 0.1);
        }
        .rank-1 { color: gold; font-weight: 700; }
        .rank-2 { color: silver; font-weight: 700; }
        .rank-3 { color: #cd7f32; font-weight: 700; }
        .score { font-weight: 600; }
        .player-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }
        .player-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }
        .pairings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pairing-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--bg-card);
          border-radius: var(--radius-md);
        }
        .pairing-card.compact {
          padding: 12px 16px;
        }
        .pairing-players {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .vs {
          color: var(--text-muted);
        }
        .bye-pairing {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .bye-label {
          color: var(--text-muted);
          font-style: italic;
        }
        .result {
          font-weight: 600;
        }
        .pending {
          color: var(--text-muted);
        }
        .round-section {
          margin-bottom: 24px;
        }
        .round-section h3 {
          margin-bottom: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};

export default Tournament;
