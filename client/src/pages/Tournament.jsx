import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaCalendar, FaClock, FaUsers, FaTrophy, FaCheck, FaEye, FaPlay } from 'react-icons/fa';

const Tournament = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTournament();
    loadActiveGames();
    
    // Refresh active games every 30 seconds
    const interval = setInterval(loadActiveGames, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const loadTournament = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/tournaments/${id}`);
      console.log('Tournament data:', response.data);
      setTournament(response.data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
      setError(err.message);
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveGames = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${id}/active-games`);
      setActiveGames(response.data || []);
    } catch (err) {
      console.error('Failed to load active games:', err);
    }
  };

  const spectateGame = (gameId) => {
    navigate(`/game/${gameId}`);
  };

  const handleRegister = async () => {
    try {
      await axios.post(`/api/tournaments/${id}/register`);
      toast.success('Registered for tournament!');
      loadTournament();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register');
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw from this tournament?')) return;
    try {
      await axios.post(`/api/tournaments/${id}/withdraw`);
      toast.success('Withdrawn from tournament');
      loadTournament();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to withdraw');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
        <p>Loading tournament...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
        <h3>Error loading tournament</h3>
        <p>{error}</p>
        <Link to="/tournaments" style={{ color: '#769656' }}>Back to Tournaments</Link>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
        <h3>Tournament not found</h3>
        <Link to="/tournaments" style={{ color: '#769656' }}>Back to Tournaments</Link>
      </div>
    );
  }

  const isRegistered = tournament.isRegistered;
  const canRegister = tournament.status === 'upcoming' && !isRegistered;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', color: 'white' }}>
      <h1>{tournament.name}</h1>
      {tournament.description && (
        <div style={{ 
          color: '#ccc', 
          whiteSpace: 'pre-line', 
          lineHeight: '1.8',
          background: 'rgba(255,255,255,0.05)',
          padding: '20px',
          borderRadius: '12px',
          marginTop: '15px'
        }}>
          {tournament.description}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
        <div><FaClock /> {tournament.time_control ? `${tournament.time_control / 60} min` : 'Standard'}</div>
        <div><FaUsers /> {tournament.participant_count || 0}/{tournament.max_players} players</div>
        <div><FaTrophy /> {tournament.total_rounds} rounds</div>
        <div>Status: <strong>{tournament.status}</strong></div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        {canRegister && (
          <button 
            onClick={handleRegister}
            style={{ padding: '10px 20px', background: '#769656', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Register
          </button>
        )}
        {isRegistered && (
          <>
            <span style={{ color: '#769656' }}><FaCheck /> Registered</span>
            {tournament.status === 'upcoming' && (
              <button 
                onClick={handleWithdraw}
                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
              >
                Withdraw
              </button>
            )}
          </>
        )}
      </div>

      {/* Live Games Section */}
      {tournament.status === 'active' && (
        <div style={{ marginTop: '30px' }}>
          <h2><FaEye /> Live Games ({activeGames.length})</h2>
          {activeGames.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px', marginTop: '15px' }}>
              {activeGames.map(game => (
                <div 
                  key={game.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '15px 20px', 
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{game.white_username}</span>
                    <span style={{ color: '#888', margin: '0 10px' }}>vs</span>
                    <span style={{ fontWeight: 'bold' }}>{game.black_username}</span>
                    <span style={{ color: '#666', marginLeft: '15px', fontSize: '14px' }}>
                      Round {game.round}
                    </span>
                  </div>
                  <button
                    onClick={() => spectateGame(game.game_id)}
                    style={{
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FaEye /> Watch
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', marginTop: '10px' }}>No games in progress right now.</p>
          )}
        </div>
      )}

      <h2 style={{ marginTop: '30px' }}>Participants ({tournament.participants?.length || 0})</h2>
      {tournament.participants && tournament.participants.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #444' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Player</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Rating</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {tournament.participants.map((player, index) => (
              <tr key={player.user_id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px' }}>{index + 1}</td>
                <td style={{ padding: '10px' }}>{player.username}</td>
                <td style={{ padding: '10px' }}>{Math.round(player.rating || 1500)}</td>
                <td style={{ padding: '10px' }}>{player.score || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: '#aaa' }}>No participants yet. Be the first to register!</p>
      )}

      <div style={{ marginTop: '30px' }}>
        <Link to="/tournaments" style={{ color: '#769656' }}>← Back to Tournaments</Link>
      </div>
    </div>
  );
};

export default Tournament;
