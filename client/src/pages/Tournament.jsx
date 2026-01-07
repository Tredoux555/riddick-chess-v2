import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaCalendar, FaClock, FaUsers, FaTrophy, FaCheck, FaEye, FaPlay } from 'react-icons/fa';

const Tournament = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Initial load - shows loading spinner
  const loadTournament = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/tournaments/${id}`);
      setTournament(response.data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh - no spinner, no error toast
  const silentRefresh = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${id}`);
      setTournament(response.data);
    } catch (err) {
      // Silent fail
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

  const verifyPayment = async () => {
    try {
      const response = await axios.post(`/api/payments/tournament/${id}/verify-payment`);
      if (response.data.status === 'completed') {
        toast.success('Payment successful! You are now registered.');
        setProcessingPayment(false);
        loadTournament();
        // Remove query param
        navigate(`/tournament/${id}`, { replace: true });
      } else {
        // Payment still pending, check again in a moment
        setTimeout(verifyPayment, 2000);
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      // If payment was completed but verification failed, still try to refresh
      setTimeout(() => {
        setProcessingPayment(false);
        loadTournament();
        navigate(`/tournament/${id}`, { replace: true });
      }, 3000);
    }
  };

  const handleRegister = async () => {
    try {
      setProcessingPayment(true);
      const response = await axios.post(`/api/payments/tournament/${id}/checkout`);
      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (err) {
      setProcessingPayment(false);
      toast.error(err.response?.data?.error || 'Failed to start payment');
    }
  };

  useEffect(() => {
    loadTournament();
    loadActiveGames();
    
    // Check for payment status in URL
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setProcessingPayment(true);
      verifyPayment();
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment cancelled');
      // Remove query param
      navigate(`/tournament/${id}`, { replace: true });
    }
    
    // Silent refresh every 3 seconds (no loading spinner)
    const interval = setInterval(() => {
      silentRefresh();
      loadActiveGames();
    }, 3000);
    return () => clearInterval(interval);
  }, [id, searchParams]);

  const spectateGame = (gameId) => {
    navigate(`/game/${gameId}`);
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

  const handleStartTournament = async () => {
    const playerCount = tournament.participants?.length || 0;
    if (playerCount < 2) {
      toast.error('Need at least 2 players to start!');
      return;
    }
    if (!window.confirm(`Start tournament with ${playerCount} players?\n\nThis will generate Round 1 pairings.`)) return;
    try {
      await axios.post(`/api/tournaments/${id}/start`);
      toast.success('🏆 Tournament started! Round 1 pairings generated.');
      loadTournament();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start tournament');
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
      {/* Charity Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        padding: '15px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}>
        💚 Every dollar funds free schools in South Africa. Play chess, change lives.
      </div>

      {processingPayment && (
        <div style={{
          background: 'rgba(118, 150, 86, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'center',
          border: '2px solid #769656'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>🔄 Processing payment...</p>
          <p style={{ color: '#aaa', fontSize: '14px' }}>Please wait while we verify your payment and register you.</p>
        </div>
      )}

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

      <div style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        {canRegister && (
          <button 
            onClick={handleRegister}
            disabled={processingPayment}
            style={{ 
              padding: '10px 20px', 
              background: processingPayment ? '#555' : '#769656', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: processingPayment ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {processingPayment ? 'Processing...' : 'Pay $1 & Register'}
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
        
        {/* Admin: Start Tournament */}
        {isAdmin && tournament.status === 'upcoming' && (
          <button 
            onClick={handleStartTournament}
            style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <FaPlay style={{ marginRight: '6px' }} />
            Start Tournament
          </button>
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
                <td style={{ padding: '10px' }}>{Math.round(player.rating || 500)}</td>
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
