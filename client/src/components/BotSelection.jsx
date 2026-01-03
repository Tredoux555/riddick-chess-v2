import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BotSelection = () => {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [selectedColor, setSelectedColor] = useState('white');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  useEffect(() => { fetchBots(); }, []);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots/list');
      const data = await res.json();
      if (Array.isArray(data)) setBots(data);
    } catch (err) { console.error('Failed to fetch bots:', err); }
    finally { setLoading(false); }
  };

  const startGame = async () => {
    if (!selectedBot) return;
    setStarting(true);
    try {
      const res = await fetch('/api/bots/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ botId: selectedBot.id, userColor: selectedColor })
      });
      const data = await res.json();
      if (data.gameId) navigate(`/bot-game/${data.gameId}`);
    } catch (err) { console.error('Failed to start game:', err); }
    finally { setStarting(false); }
  };

  if (loading) return <div className="loading-screen"><div className="chess-loader"><div className="piece">🤖</div><p>Loading bots...</p></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🤖 Play Against Bots</h1>
        <p>Choose your opponent and test your skills!</p>
      </div>
      
      <div className="bots-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {bots.map((bot) => (
          <div 
            key={bot.id} 
            onClick={() => setSelectedBot(bot)}
            className={`bot-card ${selectedBot?.id === bot.id ? 'selected' : ''}`}
            style={{
              padding: '20px',
              borderRadius: '12px',
              cursor: 'pointer',
              background: selectedBot?.id === bot.id ? 'var(--primary)' : 'var(--surface)',
              border: selectedBot?.id === bot.id ? '2px solid var(--primary-light)' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '10px' }}>{bot.emoji}</div>
            <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>{bot.name}</h3>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '10px' }}>⭐ {bot.elo} ELO</div>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>{bot.description}</p>
          </div>
        ))}
      </div>

      {selectedBot && (
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>♟️ Choose Your Color</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <button onClick={() => setSelectedColor('white')} className={`btn ${selectedColor === 'white' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '15px 25px' }}>
              ♔ White
            </button>
            <button onClick={() => setSelectedColor('random')} className={`btn ${selectedColor === 'random' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '15px 25px' }}>
              🎲 Random
            </button>
            <button onClick={() => setSelectedColor('black')} className={`btn ${selectedColor === 'black' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '15px 25px' }}>
              ♚ Black
            </button>
          </div>
        </div>
      )}

      {selectedBot && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={startGame} disabled={starting} className="btn btn-primary btn-lg" style={{ padding: '15px 40px', fontSize: '18px' }}>
            {starting ? '⏳ Starting...' : `⚔️ Challenge ${selectedBot.name}!`}
          </button>
        </div>
      )}

      {!selectedBot && <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>👆 Click on a bot to select your opponent!</p>}
    </div>
  );
};

export default BotSelection;
