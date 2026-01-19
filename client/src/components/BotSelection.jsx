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

  const getDifficultyColor = (elo) => {
    if (elo < 600) return '#10b981';
    if (elo < 1000) return '#22d3ee';
    if (elo < 1400) return '#a78bfa';
    if (elo < 1800) return '#f59e0b';
    return '#ef4444';
  };

  const getDifficultyLabel = (elo) => {
    if (elo < 600) return 'Beginner';
    if (elo < 1000) return 'Easy';
    if (elo < 1400) return 'Medium';
    if (elo < 1800) return 'Hard';
    return 'Master';
  };


  if (loading) {
    return (
      <div className="loading-screen">
        <div className="chess-loader">
          <div className="loader-emoji">🤖</div>
          <p>Loading bots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bots-page">
      {/* Hero Section */}
      <div className="bots-hero">
        <div className="hero-glow"></div>
        <h1 className="bots-title">
          <span className="title-icon">🤖</span>
          Battle AI Opponents
        </h1>
        <p className="bots-subtitle">
          6 unique personalities from beginner to master. Who will you challenge?
        </p>
      </div>

      {/* Step 1: Color Selection */}
      <div className="step-section">
        <div className="step-badge">Step 1</div>
        <h2 className="step-title">Choose Your Color</h2>
        <div className="color-selection">
          <button 
            onClick={() => setSelectedColor('white')} 
            className={`color-btn color-white ${selectedColor === 'white' ? 'selected' : ''}`}
          >
            <span className="color-icon">♔</span>
            <span className="color-label">White</span>
            <span className="color-desc">Move first</span>
          </button>
          <button 
            onClick={() => setSelectedColor('random')} 
            className={`color-btn color-random ${selectedColor === 'random' ? 'selected' : ''}`}
          >
            <span className="color-icon">🎲</span>
            <span className="color-label">Random</span>
            <span className="color-desc">Surprise me!</span>
          </button>
          <button 
            onClick={() => setSelectedColor('black')} 
            className={`color-btn color-black ${selectedColor === 'black' ? 'selected' : ''}`}
          >
            <span className="color-icon">♚</span>
            <span className="color-label">Black</span>
            <span className="color-desc">Counter-play</span>
          </button>
        </div>
      </div>


      {/* Step 2: Bot Selection */}
      <div className="step-section">
        <div className="step-badge">Step 2</div>
        <h2 className="step-title">Choose Your Opponent</h2>
        <div className="bots-grid">
          {bots.map((bot) => (
            <div 
              key={bot.id} 
              onClick={() => setSelectedBot(bot)}
              className={`bot-card-new ${selectedBot?.id === bot.id ? 'selected' : ''}`}
            >
              <div className="bot-card-glow" style={{ background: `radial-gradient(circle, ${getDifficultyColor(bot.elo)}33 0%, transparent 70%)` }}></div>
              <div className="bot-emoji">{bot.emoji}</div>
              <h3 className="bot-name">{bot.name}</h3>
              <div className="bot-rating">
                <span className="rating-badge" style={{ background: getDifficultyColor(bot.elo) }}>
                  {getDifficultyLabel(bot.elo)}
                </span>
                <span className="elo-text">⭐ {bot.elo}</span>
              </div>
              <p className="bot-personality">{bot.personality || bot.description}</p>
              {selectedBot?.id === bot.id && (
                <div className="selected-indicator">✓ Selected</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Start Game Button */}
      <div className="start-section">
        {selectedBot ? (
          <button 
            onClick={startGame} 
            disabled={starting} 
            className="start-btn"
          >
            {starting ? (
              <>⏳ Starting...</>
            ) : (
              <>
                ⚔️ Play as {selectedColor === 'random' ? '🎲 Random' : selectedColor === 'white' ? '♔ White' : '♚ Black'} vs {selectedBot.name}!
              </>
            )}
          </button>
        ) : (
          <p className="select-prompt">👆 Click on a bot above to select your opponent!</p>
        )}
      </div>


      <style jsx>{`
        .bots-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .bots-hero {
          position: relative;
          text-align: center;
          padding: 60px 20px;
          margin-bottom: 40px;
        }

        .hero-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 300px;
          background: radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .bots-title {
          font-size: 3rem;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .title-icon {
          font-size: 3.5rem;
        }

        .bots-subtitle {
          font-size: 1.2rem;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto;
        }

        .step-section {
          margin-bottom: 48px;
        }

        .step-badge {
          display: inline-block;
          padding: 6px 16px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .step-title {
          font-size: 1.5rem;
          font-family: 'Space Grotesk', sans-serif;
          margin-bottom: 24px;
        }

        .color-selection {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .color-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 32px;
          background: rgba(30, 30, 50, 0.6);
          border: 2px solid var(--border-color);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 140px;
        }

        .color-btn:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
        }

        .color-btn.selected {
          border-color: var(--accent-primary);
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
        }

        .color-white.selected {
          background: rgba(255, 255, 255, 0.1);
        }

        .color-black.selected {
          background: rgba(0, 0, 0, 0.3);
        }

        .color-random.selected {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
        }

        .color-icon {
          font-size: 2.5rem;
          margin-bottom: 8px;
        }

        .color-label {
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }

        .color-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
        }


        .bots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .bot-card-new {
          position: relative;
          padding: 28px;
          background: rgba(30, 30, 50, 0.6);
          backdrop-filter: blur(10px);
          border: 2px solid var(--border-color);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .bot-card-new:hover {
          border-color: var(--border-light);
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .bot-card-new.selected {
          border-color: var(--accent-primary);
          box-shadow: 0 0 40px rgba(99, 102, 241, 0.3);
        }

        .bot-card-glow {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 200px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .bot-card-new:hover .bot-card-glow,
        .bot-card-new.selected .bot-card-glow {
          opacity: 1;
        }

        .bot-emoji {
          font-size: 4rem;
          text-align: center;
          margin-bottom: 12px;
        }

        .bot-name {
          text-align: center;
          font-size: 1.4rem;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .bot-rating {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .rating-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #000;
        }

        .elo-text {
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .bot-personality {
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 10px;
          background: var(--accent-primary);
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .start-section {
          text-align: center;
          padding: 40px 0;
        }

        .start-btn {
          padding: 20px 48px;
          font-size: 1.25rem;
          font-weight: 600;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border: none;
          border-radius: 16px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .start-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
        }

        .start-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .select-prompt {
          font-size: 1.1rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .bots-title {
            font-size: 2rem;
            flex-direction: column;
            gap: 8px;
          }
          .color-btn {
            padding: 16px 24px;
            min-width: 100px;
          }
          .color-icon {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default BotSelection;
