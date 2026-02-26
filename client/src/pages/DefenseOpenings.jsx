import React, { useState, useEffect, Component } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaArrowLeft, FaChessKnight, FaTrophy, FaLock } from 'react-icons/fa';
import defenseOpenings from '../data/defenseOpenings';

// Error boundary
class DefenseOpeningsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#4da6ff' }}>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DIFFICULTY_COLORS = {
  beginner: { bg: '#10b981', label: 'Beginner' },
  intermediate: { bg: '#f59e0b', label: 'Intermediate' },
  advanced: { bg: '#ef4444', label: 'Advanced' },
};

const DefenseOpenings = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Load progress from localStorage
    try {
      const saved = localStorage.getItem('defense_openings_progress');
      if (saved) setProgress(JSON.parse(saved));
    } catch (e) { /* ignore */ }
  }, []);

  const getProgressLabel = (id) => {
    const p = progress[id];
    if (!p || (!p.guided && !p.unguided && !p.mastered)) {
      return { label: 'Not Started', color: '#c8c8dc', icon: null };
    }
    if (p.mastered) return { label: 'Mastered', color: '#10b981', icon: <FaTrophy /> };
    if (p.unguided) return { label: 'Unguided ✓', color: '#4da6ff', icon: <FaShieldAlt /> };
    if (p.guided) return { label: 'Guided ✓', color: '#4da6ff', icon: <FaLock /> };
    return { label: 'In Progress', color: '#3b82f6', icon: <FaChessKnight /> };
  };

  const masteredCount = Object.values(progress).filter(p => p?.mastered).length;
  const completedCount = Object.values(progress).filter(p => p?.guided || p?.unguided || p?.mastered).length;

  const handleCardClick = (defenseId) => {
    navigate(`/killer-defenses/${defenseId}`);
  };

  return (
    <DefenseOpeningsErrorBoundary>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <Link to="/club" style={styles.backLink}>
              <FaArrowLeft /> Back to Club
            </Link>
          </div>
          <div style={styles.titleRow}>
            <FaShieldAlt style={{ fontSize: 36, color: '#4da6ff' }} />
            <h1 style={styles.title}>Killer Defenses</h1>
            <FaShieldAlt style={{ fontSize: 36, color: '#4da6ff' }} />
          </div>
          <p style={styles.subtitle}>
            Learn to Survive the Deadliest Openings
          </p>

          {/* Progress bar */}
          <div style={styles.progressSection}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${(completedCount / 10) * 100}%` }} />
            </div>
            <span style={styles.progressText}>
              {completedCount}/10 completed {masteredCount > 0 && ` | ${masteredCount} mastered`}
            </span>
          </div>
        </div>

        {/* Opening Cards Grid */}
        <div style={styles.grid}>
          {defenseOpenings.map((defense, index) => {
            const diffColor = DIFFICULTY_COLORS[defense.difficulty];
            const prog = getProgressLabel(defense.id);

            return (
              <div
                key={defense.id}
                onClick={() => handleCardClick(defense.id)}
                style={{
                  ...styles.card,
                  ...(hoveredId === defense.id ? styles.cardHover : {}),
                  borderLeft: `4px solid ${diffColor.bg}`,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredId(defense.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Rank badge */}
                <div style={styles.rankBadge}>#{index + 1}</div>

                {/* Top section */}
                <div style={styles.cardTop}>
                  <span style={styles.emoji}>{defense.emoji}</span>
                  <h3 style={styles.cardTitle}>{defense.name}</h3>
                </div>

                {/* Player color badge */}
                <div style={styles.badgeRow}>
                  <span style={{
                    ...styles.colorBadge,
                    background: defense.playerColor === 'white' ? '#f8f8f8' : '#333',
                    color: defense.playerColor === 'white' ? '#333' : '#f8f8f8',
                  }}>
                    You play: {defense.playerColor}
                  </span>
                </div>

                {/* Attacker color badge */}
                <div style={styles.badgeRow}>
                  <span style={{
                    ...styles.attackerBadge,
                    background: defense.attackerColor === 'white' ? '#f8f8f8' : '#333',
                    color: defense.attackerColor === 'white' ? '#333' : '#f8f8f8',
                  }}>
                    Bot attacks as: {defense.attackerColor}
                  </span>
                </div>

                {/* Move count */}
                <div style={styles.moveCount}>
                  {defense.totalMoves} moves
                </div>

                {/* Description */}
                <p style={styles.cardDesc}>{defense.description}</p>

                {/* Key idea */}
                <p style={styles.keyIdea}>{defense.keyIdea}</p>

                {/* Footer info */}
                <div style={styles.cardFooter}>
                  <span style={{
                    ...styles.diffBadge,
                    background: diffColor.bg + '22',
                    color: diffColor.bg,
                    border: `1px solid ${diffColor.bg}44`,
                  }}>
                    {diffColor.label}
                  </span>
                </div>

                {/* Progress */}
                {prog.label !== 'Not Started' && (
                  <div style={{ ...styles.progressBadge, color: prog.color }}>
                    {prog.icon} {prog.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div style={styles.infoSection}>
          <h3 style={styles.infoTitle}>How It Works</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <span style={styles.infoEmoji}>1</span>
              <p>Pick a defence from the list above</p>
            </div>
            <div style={styles.infoCard}>
              <span style={styles.infoEmoji}>2</span>
              <p><strong>Guided Coach:</strong> Follow the green arrows showing exact defensive moves</p>
            </div>
            <div style={styles.infoCard}>
              <span style={styles.infoEmoji}>3</span>
              <p><strong>Unguided Test:</strong> Face the attack alone and defend without hints</p>
            </div>
            <div style={styles.infoCard}>
              <span style={styles.infoEmoji}>4</span>
              <p>Master both modes and unlock the trophy badge for complete mastery</p>
            </div>
          </div>
        </div>
      </div>
    </DefenseOpeningsErrorBoundary>
  );
};

const styles = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '20px 16px 60px',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#e0e0ee',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0ee',
    margin: '8px 0 20px',
  },
  progressSection: {
    maxWidth: 400,
    margin: '0 auto',
  },
  progressBar: {
    height: 8,
    background: 'var(--bg-tertiary)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4da6ff, #17a2b8)',
    borderRadius: 4,
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: 13,
    color: '#c8c8dc',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
    marginBottom: 40,
  },
  card: {
    position: 'relative',
    background: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: '20px 20px 16px',
    textDecoration: 'none',
    color: 'var(--text-primary)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardHover: {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'var(--bg-tertiary)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: '#c8c8dc',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  badgeRow: {
    display: 'flex',
  },
  moveCount: {
    fontSize: 12,
    color: '#c8c8dc',
    fontWeight: 600,
  },
  cardDesc: {
    fontSize: 14,
    color: '#e0e0ee',
    margin: 0,
    lineHeight: 1.5,
  },
  keyIdea: {
    fontSize: 13,
    color: '#4da6ff',
    margin: 0,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  cardFooter: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 12,
    border: '1px solid var(--border-color)',
  },
  attackerBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 12,
    border: '1px solid var(--border-color)',
  },
  diffBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  progressBadge: {
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  infoSection: {
    textAlign: 'center',
    padding: '32px 0',
    borderTop: '1px solid var(--border-color)',
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 20,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
    maxWidth: 900,
    margin: '0 auto',
  },
  infoCard: {
    background: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: 20,
    border: '1px solid var(--border-color)',
  },
  infoEmoji: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#4da6ff22',
    color: '#4da6ff',
    fontWeight: 800,
    fontSize: 16,
    marginBottom: 10,
  },
};

export default DefenseOpenings;
