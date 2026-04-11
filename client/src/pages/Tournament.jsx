import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaClock, FaUsers, FaTrophy, FaCheck, FaEye, FaPlay, FaChess } from 'react-icons/fa';

const Tournament = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registering, setRegistering] = useState(false);

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

  const silentRefresh = async () => {
    try {
      const [tRes, gRes] = await Promise.all([
        axios.get(`/api/tournaments/${id}`),
        axios.get(`/api/tournaments/${id}/active-games`)
      ]);
      setTournament(tRes.data);
      setActiveGames(gRes.data || []);
    } catch (err) {
      // silent
    }
  };

  const loadRounds = async () => {
    try {
      const res = await axios.get(`/api/tournaments/${id}/rounds`);
      setRounds(res.data || []);
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    loadTournament();
    loadRounds();
    const interval = setInterval(() => {
      silentRefresh();
      loadRounds();
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      await axios.post(`/api/tournaments/${id}/register`);
      toast.success('You are now registered!');
      loadTournament();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register');
    } finally {
      setRegistering(false);
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

  const handleStartTournament = async () => {
    const playerCount = tournament.participants?.length || 0;
    if (playerCount < 2) {
      toast.error('Need at least 2 players to start!');
      return;
    }
    if (!window.confirm(`Start tournament with ${playerCount} players?\n\nThis will generate Round 1 pairings.`)) return;
    try {
      await axios.post(`/api/tournaments/${id}/start`);
      toast.success('Tournament started! Round 1 pairings generated.');
      loadTournament();
      loadRounds();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start tournament');
    }
  };

  // --- Loading / Error states ---
  if (loading) {
    return <div style={styles.center}><p>Loading tournament...</p></div>;
  }
  if (error) {
    return (
      <div style={styles.center}>
        <h3>Error loading tournament</h3>
        <p>{error}</p>
        <Link to="/tournaments" style={{ color: '#95cc75' }}>Back to Tournaments</Link>
      </div>
    );
  }
  if (!tournament) {
    return (
      <div style={styles.center}>
        <h3>Tournament not found</h3>
        <Link to="/tournaments" style={{ color: '#95cc75' }}>Back to Tournaments</Link>
      </div>
    );
  }

  const isRegistered = tournament.isRegistered;
  const canRegister = tournament.status === 'upcoming' && !isRegistered;

  // Find the current user's pairing for the active round
  const myPairing = tournament.currentPairings?.find(
    p => p.white_player_id === user?.id || p.black_player_id === user?.id
  );

  // Format a result for display
  const formatResult = (result) => {
    if (!result) return '...';
    if (result === '1-0') return '1 - 0';
    if (result === '0-1') return '0 - 1';
    if (result === '1/2-1/2') return '½ - ½';
    if (result === '0-0') return '0 - 0';
    return result;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', color: 'white' }}>
      {/* Back link at top */}
      <Link to="/tournaments" style={{ color: '#95cc75', fontSize: '14px' }}>← Back to Tournaments</Link>

      {/* Header */}
      <h1 style={{ marginTop: '10px', marginBottom: '5px' }}>{tournament.name}</h1>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#b0b0c4', fontSize: '14px' }}>
        <span><FaClock style={{ marginRight: '4px' }} />{tournament.time_control ? `${tournament.time_control / 60}+${tournament.increment || 0}` : 'Standard'}</span>
        <span><FaUsers style={{ marginRight: '4px' }} />{tournament.participant_count || 0}/{tournament.max_players}</span>
        <span><FaTrophy style={{ marginRight: '4px' }} />{tournament.total_rounds} rounds</span>
        <span>{tournament.type === 'round-robin' ? 'Round Robin' : 'Swiss'}</span>
        <span style={{
          color: tournament.status === 'active' ? '#4ade80' : tournament.status === 'completed' ? '#94a3b8' : '#facc15',
          fontWeight: 'bold'
        }}>
          {tournament.status === 'active' ? `Round ${tournament.current_round}/${tournament.total_rounds}` : tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
        </span>
      </div>

      {tournament.description && (
        <div style={styles.descriptionBox}>
          {tournament.description}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {canRegister && (
          <button onClick={handleRegister} disabled={registering} style={{
            ...styles.btn, background: registering ? '#555' : '#769656',
            cursor: registering ? 'not-allowed' : 'pointer'
          }}>
            {registering ? 'Registering...' : 'Register'}
          </button>
        )}
        {isRegistered && tournament.status === 'upcoming' && (
          <>
            <span style={{ color: '#95cc75' }}><FaCheck /> Registered</span>
            <button onClick={handleWithdraw} style={{ ...styles.btn, background: '#ef4444', fontSize: '13px', padding: '6px 14px' }}>
              Withdraw
            </button>
          </>
        )}
        {isAdmin && tournament.status === 'upcoming' && (
          <button onClick={handleStartTournament} style={{ ...styles.btn, background: '#f59e0b' }}>
            <FaPlay style={{ marginRight: '6px' }} /> Start Tournament
          </button>
        )}
      </div>

      {/* ============ YOUR MATCH (the key missing piece) ============ */}
      {tournament.status === 'active' && isRegistered && myPairing && (
        <div style={styles.myMatchBox}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Your Round {tournament.current_round} Match
          </div>
          {myPairing.is_bye ? (
            <div style={{ fontSize: '18px' }}>You have a bye this round (automatic win)</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '18px' }}>
                <span style={{ color: myPairing.white_player_id === user?.id ? '#fff' : '#b0b0c4' }}>{myPairing.white_username}</span>
                <span style={{ color: '#666', margin: '0 10px' }}>vs</span>
                <span style={{ color: myPairing.black_player_id === user?.id ? '#fff' : '#b0b0c4' }}>{myPairing.black_username}</span>
              </div>
              {myPairing.result ? (
                <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'bold' }}>
                  Result: {formatResult(myPairing.result)}
                </span>
              ) : myPairing.game_id ? (
                <button onClick={() => navigate(`/game/${myPairing.game_id}`)} style={styles.playBtn}>
                  <FaChess style={{ marginRight: '6px' }} /> Play Game
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ============ LIVE GAMES ============ */}
      {tournament.status === 'active' && activeGames.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '10px' }}><FaEye /> Live Games</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {activeGames.map(game => (
              <div key={game.game_id} style={styles.gameRow}>
                <div>
                  <strong>{game.white_username}</strong>
                  <span style={{ color: '#666', margin: '0 8px' }}>vs</span>
                  <strong>{game.black_username}</strong>
                  <span style={{ color: '#666', marginLeft: '10px', fontSize: '13px' }}>R{game.round}</span>
                </div>
                <button onClick={() => navigate(`/game/${game.game_id}`)} style={styles.watchBtn}>
                  <FaEye /> Watch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ STANDINGS ============ */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '10px' }}>
          {tournament.status === 'completed' ? 'Final Standings' : 'Standings'} ({tournament.participants?.length || 0})
        </h3>
        {tournament.participants && tournament.participants.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #444', fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase' }}>
                  <th style={styles.th}>#</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>Player</th>
                  <th style={styles.th}>Rating</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Played</th>
                  <th style={styles.th}>TB</th>
                </tr>
              </thead>
              <tbody>
                {tournament.participants.map((player, index) => {
                  const isMe = player.user_id === user?.id;
                  return (
                    <tr key={player.user_id} style={{
                      borderBottom: '1px solid #333',
                      background: isMe ? 'rgba(118, 150, 86, 0.15)' : 'transparent'
                    }}>
                      <td style={styles.td}>
                        {index === 0 && tournament.status === 'completed' ? '🥇' :
                         index === 1 && tournament.status === 'completed' ? '🥈' :
                         index === 2 && tournament.status === 'completed' ? '🥉' : index + 1}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'left', fontWeight: isMe ? 'bold' : 'normal' }}>
                        {player.username} {isMe && <span style={{ color: '#769656', fontSize: '12px' }}>(you)</span>}
                      </td>
                      <td style={styles.td}>{Math.round(player.rating || 500)}</td>
                      <td style={{ ...styles.td, fontWeight: 'bold', color: '#fff' }}>{player.score ?? 0}</td>
                      <td style={styles.td}>{player.games_played ?? 0}</td>
                      <td style={{ ...styles.td, color: '#94a3b8' }}>{player.buchholz != null ? Number(player.buchholz).toFixed(1) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#d0d0e0' }}>No participants yet. Be the first to register!</p>
        )}
      </div>

      {/* ============ ROUNDS ============ */}
      {(tournament.status === 'active' || tournament.status === 'completed') && rounds.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ marginBottom: '10px' }}>Rounds</h3>
          {rounds.slice().reverse().map(round => (
            <div key={round.round} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#b0b0c4', marginBottom: '6px' }}>
                Round {round.round}
                {round.round === tournament.current_round && tournament.status === 'active' && (
                  <span style={{ color: '#4ade80', marginLeft: '8px', fontSize: '12px' }}>In progress</span>
                )}
              </div>
              <div style={{ display: 'grid', gap: '4px' }}>
                {round.pairings.map((p, i) => {
                  const isMyGame = p.white_player_id === user?.id || p.black_player_id === user?.id;
                  return (
                    <div key={i} style={{
                      ...styles.roundRow,
                      background: isMyGame ? 'rgba(118, 150, 86, 0.12)' : 'rgba(255,255,255,0.03)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <span style={{ fontWeight: p.white_player_id === user?.id ? 'bold' : 'normal' }}>
                          {p.white_username || 'BYE'}
                        </span>
                        <span style={{ color: '#666', fontSize: '13px' }}>vs</span>
                        <span style={{ fontWeight: p.black_player_id === user?.id ? 'bold' : 'normal' }}>
                          {p.is_bye ? 'BYE' : (p.black_username || 'BYE')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontSize: '13px', fontWeight: 'bold',
                          color: p.result ? '#fff' : '#666'
                        }}>
                          {formatResult(p.result)}
                        </span>
                        {!p.result && !p.is_bye && p.game_id && (
                          isMyGame ? (
                            <button onClick={() => navigate(`/game/${p.game_id}`)} style={styles.smallPlayBtn}>
                              Play
                            </button>
                          ) : (
                            <button onClick={() => navigate(`/game/${p.game_id}`)} style={styles.smallWatchBtn}>
                              Watch
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px', paddingBottom: '40px' }}>
        <Link to="/tournaments" style={{ color: '#95cc75' }}>← Back to Tournaments</Link>
      </div>
    </div>
  );
};

// --- Styles ---
const styles = {
  center: { padding: '40px', textAlign: 'center', color: 'white' },
  btn: {
    padding: '10px 20px', color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center'
  },
  descriptionBox: {
    color: '#ccc', whiteSpace: 'pre-line', lineHeight: '1.7',
    background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px', marginTop: '12px', fontSize: '14px'
  },
  myMatchBox: {
    marginTop: '20px', padding: '20px', borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(118, 150, 86, 0.2) 0%, rgba(118, 150, 86, 0.08) 100%)',
    border: '2px solid #769656'
  },
  playBtn: {
    padding: '10px 24px', background: '#769656', color: 'white', border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center'
  },
  watchBtn: {
    background: '#6366f1', color: 'white', border: 'none', padding: '6px 14px',
    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px'
  },
  gameRow: {
    background: 'rgba(255,255,255,0.04)', padding: '10px 16px', borderRadius: '8px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  roundRow: {
    padding: '8px 14px', borderRadius: '6px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px'
  },
  th: { padding: '8px 10px', textAlign: 'center', fontSize: '12px' },
  td: { padding: '8px 10px', textAlign: 'center' },
  smallPlayBtn: {
    padding: '4px 12px', background: '#769656', color: 'white', border: 'none',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
  },
  smallWatchBtn: {
    padding: '4px 12px', background: '#6366f1', color: 'white', border: 'none',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
  }
};

export default Tournament;
