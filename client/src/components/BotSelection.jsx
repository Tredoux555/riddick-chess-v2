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
        <p>Choose your color and opponent!</p>
      </div>
      
      {/* Color Selection - Always visible at top */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px', 
        padding: '20px', 
        background: 'var(--surface)', 
        borderRadius: '12px',
        border: '2px solid var(--primary)'
      }}>
        <h3 style={{ marginBottom: '15px' }}>Step 1: Choose Your Color</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button 
            onClick={() => setSelectedColor('white')} 
            className={`btn ${selectedColor === 'white' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ 
              padding: '20px 30px', 
              fontSize: '18px',
              background: selectedColor === 'white' ? '#fff' : 'var(--surface)',
              color: selectedColor === 'white' ? '#000' : 'var(--text)',
              border: selectedColor === 'white' ? '3px solid var(--primary)' : '2px solid var(--border)'
            }}
          >
            ♔ White
          </button>
          <button 
            onClick={() => setSelectedColor('random')} 
            className={`btn ${selectedColor === 'random' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ 
              padding: '20px 30px', 
              fontSize: '18px',
              border: selectedColor === 'random' ? '3px solid var(--primary)' : '2px solid var(--border)'
            }}
          >
            🎲 Random
          </button>
          <button 
            onClick={() => setSelectedColor('black')} 
            className={`btn ${selectedColor === 'black' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ 
              padding: '20px 30px', 
              fontSize: '18px',
              background: selectedColor === 'black' ? '#333' : 'var(--surface)',
              color: selectedColor === 'black' ? '#fff' : 'var(--text)',
              border: selectedColor === 'black' ? '3px solid var(--primary)' : '2px solid var(--border)'
            }}
          >
            ♚ Black
          </button>
        </div>
      </div>

      {/* Bot Selection */}
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Step 2: Choose Your Opponent</h3>
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
              border: selectedBot?.id === bot.id ? '3px solid var(--primary-light)' : '2px solid transparent',
              transition: 'all 0.2s',
              transform: selectedBot?.id === bot.id ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '10px' }}>{bot.emoji}</div>
            <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>{bot.name}</h3>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '10px' }}>⭐ {bot.elo} ELO</div>
            <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>{bot.personality || bot.description}</p>
          </div>
        ))}
      </div>

      {/* Start Button */}
      <div style={{ textAlign: 'center' }}>
        {selectedBot ? (
          <button onClick={startGame} disabled={starting} className="btn btn-primary btn-lg" style={{ padding: '20px 50px', fontSize: '20px' }}>
            {starting ? '⏳ Starting...' : `⚔️ Play as ${selectedColor === 'random' ? '🎲' : selectedColor === 'white' ? '♔ White' : '♚ Black'} vs ${selectedBot.name}!`}
          </button>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>👆 Click on a bot above to select your opponent!</p>
        )}
      </div>
    </div>
  );
};

export default BotSelection;
