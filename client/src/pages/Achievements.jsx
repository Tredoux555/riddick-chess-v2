import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaLock, FaCheck, FaTrophy } from 'react-icons/fa';

const CATEGORIES = ['all', 'games', 'tournaments', 'puzzles', 'rating', 'social', 'special'];

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [progress, setProgress] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const [achievementsRes, progressRes] = await Promise.all([
        axios.get('/api/achievements'),
        axios.get('/api/achievements/progress')
      ]);
      setAchievements(achievementsRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements = activeCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === activeCategory);

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return '#9ca3af';
      case 'uncommon': return '#22c55e';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading achievements...</p>
      </div>
    );
  }

  return (
    <div className="achievements-page">
      <div className="page-header">
        <h1 className="page-title">Achievements</h1>
        <p className="page-subtitle">Track your progress and unlock rewards</p>
      </div>

      {progress && (
        <div className="progress-section">
          <div className="progress-card">
            <div className="progress-stat">
              <span className="stat-value">{progress.earned}</span>
              <span className="stat-label">Unlocked</span>
            </div>
            <div className="progress-divider"></div>
            <div className="progress-stat">
              <span className="stat-value">{progress.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="progress-divider"></div>
            <div className="progress-stat">
              <span className="stat-value">{progress.points}</span>
              <span className="stat-label">Points</span>
            </div>
            <div className="progress-divider"></div>
            <div className="progress-stat">
              <span className="stat-value">{progress.percentage}%</span>
              <span className="stat-label">Complete</span>
            </div>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress.percentage}%` }}></div>
          </div>
        </div>
      )}

      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="achievements-grid">
        {filteredAchievements.map(achievement => (
          <div 
            key={achievement.id} 
            className={`achievement-card ${achievement.earned ? 'earned' : 'locked'}`}
          >
            <div className="achievement-icon">
              {achievement.icon || '🏆'}
            </div>
            <div className="achievement-info">
              <h3 className="achievement-name">{achievement.name}</h3>
              <p className="achievement-desc">{achievement.description}</p>
              <div className="achievement-meta">
                <span 
                  className="rarity" 
                  style={{ color: getRarityColor(achievement.rarity) }}
                >
                  {achievement.rarity}
                </span>
                <span className="points">{achievement.points} pts</span>
              </div>
            </div>
            <div className="achievement-status">
              {achievement.earned ? (
                <FaCheck className="earned-icon" />
              ) : (
                <FaLock className="locked-icon" />
              )}
            </div>
            {achievement.earned && achievement.earned_at && (
              <div className="earned-date">
                {new Date(achievement.earned_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="empty-state">
          <FaTrophy className="icon" />
          <h3>No achievements in this category</h3>
        </div>
      )}

      <style jsx>{`
        .achievements-page {
          max-width: 1000px;
          margin: 0 auto;
        }
        .progress-section {
          margin-bottom: 32px;
        }
        .progress-card {
          display: flex;
          justify-content: center;
          gap: 32px;
          padding: 24px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          margin-bottom: 16px;
        }
        .progress-stat {
          text-align: center;
        }
        .progress-stat .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          color: var(--accent-primary);
        }
        .progress-stat .stat-label {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .progress-divider {
          width: 1px;
          background: var(--border-color);
        }
        .progress-bar-container {
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }
        .category-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        .category-tab {
          padding: 8px 16px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          white-space: nowrap;
        }
        .category-tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .achievement-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          position: relative;
          transition: all 0.2s;
        }
        .achievement-card.earned {
          border-color: var(--accent-success);
          background: rgba(16, 185, 129, 0.05);
        }
        .achievement-card.locked {
          opacity: 0.6;
        }
        .achievement-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
        }
        .achievement-info {
          flex: 1;
          min-width: 0;
        }
        .achievement-name {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .achievement-desc {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 8px;
        }
        .achievement-meta {
          display: flex;
          gap: 12px;
          font-size: 0.75rem;
        }
        .rarity {
          text-transform: capitalize;
          font-weight: 500;
        }
        .points {
          color: var(--text-muted);
        }
        .achievement-status {
          flex-shrink: 0;
        }
        .earned-icon {
          color: var(--accent-success);
          font-size: 1.25rem;
        }
        .locked-icon {
          color: var(--text-muted);
        }
        .earned-date {
          position: absolute;
          bottom: 8px;
          right: 12px;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

export default Achievements;
