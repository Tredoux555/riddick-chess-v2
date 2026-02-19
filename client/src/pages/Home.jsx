import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FaPlay, FaTrophy, FaPuzzlePiece, FaChartLine, FaCrown, FaChess, FaRobot, FaGraduationCap, FaGuitar } from 'react-icons/fa';

const Home = () => {
  const { user, isClubMember } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, tournamentsRes] = await Promise.all([
        axios.get('/api/auth/me'),
        axios.get('/api/tournaments?limit=3')
      ]);
      setStats(statsRes.data);
      setUpcomingTournaments(tournamentsRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  // Floating chess pieces for background
  const FloatingPieces = () => (
    <div className="floating-pieces">
      {['♔', '♕', '♖', '♗', '♘', '♙'].map((piece, i) => (
        <span 
          key={i} 
          className="floating-piece"
          style={{
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 0.5}s`,
            fontSize: `${2 + Math.random() * 2}rem`,
            opacity: 0.1 + Math.random() * 0.1,
          }}
        >
          {piece}
        </span>
      ))}
    </div>
  );

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="landing-page">
        <FloatingPieces />
        
        {/* Hero Section */}
        <div className="hero">
          <div className="hero-glow"></div>
          <div className="hero-badge">♟️ Built by a 10-year-old chess enthusiast</div>
          <h1 className="hero-title">
            <span className="hero-icon">♔</span>
            Riddick Chess
          </h1>
          <p className="hero-subtitle">Where Champions Are Made</p>
          <p className="hero-description">
            Play chess, battle AI bots, solve puzzles, compete in tournaments, and climb the leaderboards.
            Your journey to chess mastery starts here.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-hero btn-primary-hero">
              <span>Get Started Free</span>
              <span className="btn-arrow">→</span>
            </Link>
            <Link to="/login" className="btn-hero btn-secondary-hero">
              Sign In
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">6</span>
              <span className="hero-stat-label">AI Bots</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-number">∞</span>
              <span className="hero-stat-label">Puzzles</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-number">Live</span>
              <span className="hero-stat-label">Tournaments</span>
            </div>
          </div>
        </div>


        {/* Features Section */}
        <div className="features-section">
          <h2 className="section-title">Everything You Need</h2>
          <div className="features-grid">
            <div className="feature-card feature-card-primary">
              <div className="feature-icon-wrap">
                <FaChess />
              </div>
              <h3>Play Chess</h3>
              <p>Challenge friends or find opponents through matchmaking. Real-time games with no lag.</p>
              <Link to="/play" className="feature-link">Play Now →</Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-orange">
                <FaRobot />
              </div>
              <h3>Battle AI Bots</h3>
              <p>6 unique bots from beginner to master. Each with their own personality and playstyle!</p>
              <Link to="/bots" className="feature-link">Meet the Bots →</Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-purple">
                <FaPuzzlePiece />
              </div>
              <h3>Puzzles & Rush</h3>
              <p>Sharpen your tactics with rated puzzles. Compete in Puzzle Rush for the high score!</p>
              <Link to="/puzzles" className="feature-link">Start Solving →</Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-yellow">
                <FaTrophy />
              </div>
              <h3>Tournaments</h3>
              <p>Swiss-system tournaments with automatic pairings. Compete for glory!</p>
              <Link to="/tournaments" className="feature-link">View Tournaments →</Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-cyan">
                <FaChartLine />
              </div>
              <h3>Leaderboards</h3>
              <p>Glicko-2 ratings for Bullet, Blitz, Rapid & Classical. Track your progress!</p>
              <Link to="/leaderboards" className="feature-link">See Rankings →</Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrap feature-icon-pink">
                <FaGraduationCap />
              </div>
              <h3>Learn Chess</h3>
              <p>Video tutorials from basics to advanced tactics. Learn at your own pace!</p>
              <Link to="/learn" className="feature-link">Start Learning →</Link>
            </div>
          </div>
        </div>


        {/* Bots Showcase */}
        <div className="bots-showcase">
          <h2 className="section-title">Meet Your Opponents</h2>
          <p className="section-subtitle">6 unique AI personalities waiting to challenge you</p>
          <div className="bots-grid">
            {[
              { name: 'Buddy', emoji: '🐶', level: 'Beginner', desc: 'Your friendly starter bot' },
              { name: 'Charlie', emoji: '🎭', level: 'Easy', desc: 'Unpredictable and fun' },
              { name: 'Diana', emoji: '👸', level: 'Medium', desc: 'Elegant and calculated' },
              { name: 'Magnus', emoji: '🧙', level: 'Hard', desc: 'The wise strategist' },
              { name: 'Titan', emoji: '🤖', level: 'Expert', desc: 'Cold, calculating machine' },
              { name: 'Riddick', emoji: '😎', level: 'Master', desc: 'The ultimate challenge' },
            ].map((bot, i) => (
              <div key={i} className="bot-card">
                <div className="bot-emoji">{bot.emoji}</div>
                <div className="bot-name">{bot.name}</div>
                <div className="bot-level">{bot.level}</div>
              </div>
            ))}
          </div>
          <Link to="/bots" className="btn-hero btn-secondary-hero" style={{ marginTop: '32px' }}>
            Challenge a Bot →
          </Link>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <div className="cta-glow"></div>
          <h2>Ready to Play?</h2>
          <p>Join Riddick Chess today and start your journey to becoming a chess champion.</p>
          <Link to="/register" className="btn-hero btn-primary-hero">
            Create Free Account
          </Link>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p>Built with ❤️ by Riddick • Powered by passion for chess</p>
        </div>


        <style jsx>{`
          /* ========== LANDING PAGE STYLES ========== */
          .landing-page {
            position: relative;
            overflow: hidden;
          }

          /* Floating chess pieces background */
          .floating-pieces {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 0;
          }

          .floating-piece {
            position: absolute;
            animation: float 20s ease-in-out infinite;
            color: var(--accent-primary);
          }

          @keyframes float {
            0%, 100% { transform: translateY(100vh) rotate(0deg); }
            50% { transform: translateY(-100px) rotate(180deg); }
          }

          /* Hero Section */
          .hero {
            position: relative;
            text-align: center;
            padding: 80px 20px;
            z-index: 1;
          }


          .hero-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
            pointer-events: none;
            z-index: -1;
          }

          .hero-badge {
            display: inline-block;
            padding: 8px 20px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 50px;
            font-size: 0.9rem;
            color: var(--accent-primary);
            margin-bottom: 24px;
            animation: fadeInUp 0.6s ease;
          }

          .hero-title {
            font-size: clamp(3rem, 8vw, 5rem);
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            animation: fadeInUp 0.6s ease 0.1s both;
          }


          .hero-icon {
            font-size: 0.8em;
            animation: pulse 2s ease-in-out infinite;
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }

          .hero-subtitle {
            font-size: 1.5rem;
            color: var(--accent-primary);
            margin-bottom: 16px;
            animation: fadeInUp 0.6s ease 0.2s both;
          }

          .hero-description {
            color: var(--text-secondary);
            font-size: 1.1rem;
            max-width: 600px;
            margin: 0 auto 32px;
            line-height: 1.7;
            animation: fadeInUp 0.6s ease 0.3s both;
          }

          .hero-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
            animation: fadeInUp 0.6s ease 0.4s both;
          }


          /* Hero Buttons */
          .btn-hero {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.3s ease;
            text-decoration: none;
          }

          .btn-primary-hero {
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            color: white;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          }

          .btn-primary-hero:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5);
          }

          .btn-arrow {
            transition: transform 0.3s ease;
          }

          .btn-primary-hero:hover .btn-arrow {
            transform: translateX(4px);
          }

          .btn-secondary-hero {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
          }

          .btn-secondary-hero:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--accent-primary);
          }


          /* Hero Stats */
          .hero-stats {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 32px;
            margin-top: 48px;
            animation: fadeInUp 0.6s ease 0.5s both;
          }

          .hero-stat {
            text-align: center;
          }

          .hero-stat-number {
            display: block;
            font-size: 2rem;
            font-weight: 700;
            font-family: 'Space Grotesk', sans-serif;
            color: var(--accent-primary);
          }

          .hero-stat-label {
            font-size: 0.9rem;
            color: var(--text-muted);
          }

          .hero-stat-divider {
            width: 1px;
            height: 40px;
            background: var(--border-color);
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }


          /* Features Section */
          .features-section {
            padding: 60px 20px;
            position: relative;
            z-index: 1;
          }

          .section-title {
            font-size: 2.5rem;
            font-family: 'Space Grotesk', sans-serif;
            text-align: center;
            margin-bottom: 16px;
          }

          .section-subtitle {
            text-align: center;
            color: var(--text-secondary);
            margin-bottom: 48px;
          }

          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            max-width: 1200px;
            margin: 0 auto;
          }

          .feature-card {
            background: rgba(30, 30, 50, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 32px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }


          .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .feature-card:hover {
            border-color: var(--accent-primary);
            transform: translateY(-4px);
            box-shadow: 0 10px 40px rgba(99, 102, 241, 0.15);
          }

          .feature-card:hover::before {
            opacity: 1;
          }

          .feature-card-primary {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border-color: rgba(99, 102, 241, 0.3);
          }

          .feature-icon-wrap {
            width: 56px;
            height: 56px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin-bottom: 20px;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            color: white;
          }


          .feature-icon-orange { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
          .feature-icon-purple { background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); }
          .feature-icon-yellow { background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); }
          .feature-icon-cyan { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); }
          .feature-icon-pink { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }

          .feature-card h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .feature-card p {
            color: var(--text-secondary);
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 16px;
          }

          .feature-link {
            color: var(--accent-primary);
            font-weight: 500;
            font-size: 0.9rem;
            transition: all 0.2s ease;
          }

          .feature-link:hover {
            color: var(--accent-secondary);
            padding-left: 4px;
          }


          /* Bots Showcase */
          .bots-showcase {
            padding: 60px 20px;
            text-align: center;
            position: relative;
            z-index: 1;
          }

          .bots-grid {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
            max-width: 800px;
            margin: 0 auto;
          }

          .bot-card {
            background: rgba(30, 30, 50, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px 20px;
            width: 120px;
            transition: all 0.3s ease;
          }

          .bot-card:hover {
            transform: translateY(-8px);
            border-color: var(--accent-primary);
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2);
          }

          .bot-emoji {
            font-size: 2.5rem;
            margin-bottom: 12px;
          }

          .bot-name {
            font-weight: 600;
            margin-bottom: 4px;
          }

          .bot-level {
            font-size: 0.8rem;
            color: var(--text-muted);
          }


          /* CTA Section */
          .cta-section {
            position: relative;
            text-align: center;
            padding: 80px 20px;
            margin: 40px 0;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border-radius: 24px;
            border: 1px solid rgba(99, 102, 241, 0.2);
            z-index: 1;
          }

          .cta-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
            pointer-events: none;
            z-index: -1;
          }

          .cta-section h2 {
            font-size: 2.5rem;
            font-family: 'Space Grotesk', sans-serif;
            margin-bottom: 16px;
          }

          .cta-section p {
            color: var(--text-secondary);
            margin-bottom: 32px;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }

          /* Footer */
          .landing-footer {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
            font-size: 0.9rem;
            border-top: 1px solid var(--border-color);
            margin-top: 40px;
          }


          /* Mobile Responsive */
          @media (max-width: 768px) {
            .hero-title {
              flex-direction: column;
              gap: 8px;
            }
            
            .hero-stats {
              flex-direction: column;
              gap: 16px;
            }
            
            .hero-stat-divider {
              width: 40px;
              height: 1px;
            }
            
            .features-grid {
              grid-template-columns: 1fr;
            }
            
            .bots-grid {
              gap: 12px;
            }
            
            .bot-card {
              width: 100px;
              padding: 16px 12px;
            }
          }
        `}</style>
      </div>
    );
  }


  // Dashboard for authenticated users
  return (
    <div className="dashboard">
      <div className="welcome-section">
        <div className="welcome-glow"></div>
        <h1>Welcome back, <span className="username-highlight" style={{fontFamily: "'Space Grotesk', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"}}>{user.username}</span>! 👋</h1>
        <p>Ready to play some chess?</p>
      </div>

      <div className="quick-actions">
        <Link to="/play" className="action-card action-card-primary">
          <div className="action-icon-wrap"><FaPlay /></div>
          <span className="action-label">Play Now</span>
          <span className="action-desc">Find an opponent</span>
        </Link>
        <Link to="/bots" className="action-card">
          <div className="action-icon-wrap action-icon-orange"><FaRobot /></div>
          <span className="action-label">Battle Bots</span>
          <span className="action-desc">6 AI opponents</span>
        </Link>
        <Link to="/puzzles" className="action-card">
          <div className="action-icon-wrap action-icon-purple"><FaPuzzlePiece /></div>
          <span className="action-label">Puzzles</span>
          <span className="action-desc">Train tactics</span>
        </Link>
        <Link to="/tournaments" className="action-card">
          <div className="action-icon-wrap action-icon-yellow"><FaTrophy /></div>
          <span className="action-label">Tournaments</span>
          <span className="action-desc">Compete live</span>
        </Link>
      </div>


      <div className="dashboard-grid">
        {/* Ratings Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>🏆 Your Ratings</h3>
          </div>
          <div className="dash-card-body">
            {stats ? (
              <div className="ratings-grid">
                <div className="rating-item">
                  <span className="rating-emoji">⚡</span>
                  <span className="rating-type">Bullet</span>
                  <span className="rating-number">{Math.round(stats.bullet_rating || 500)}</span>
                </div>
                <div className="rating-item">
                  <span className="rating-emoji">🔥</span>
                  <span className="rating-type">Blitz</span>
                  <span className="rating-number">{Math.round(stats.blitz_rating || 500)}</span>
                </div>
                <div className="rating-item">
                  <span className="rating-emoji">⏱️</span>
                  <span className="rating-type">Rapid</span>
                  <span className="rating-number">{Math.round(stats.rapid_rating || 500)}</span>
                </div>
                <div className="rating-item">
                  <span className="rating-emoji">🧩</span>
                  <span className="rating-type">Puzzles</span>
                  <span className="rating-number">{Math.round(stats.puzzle_rating || 500)}</span>
                </div>
              </div>
            ) : (
              <p className="loading-text">Loading ratings...</p>
            )}
          </div>
        </div>


        {/* Stats Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>📊 Your Stats</h3>
          </div>
          <div className="dash-card-body">
            {stats ? (
              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-number">{stats.total_games || 0}</span>
                  <span className="stat-label">Games</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{stats.total_wins || 0}</span>
                  <span className="stat-label">Wins</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{stats.puzzles_solved || 0}</span>
                  <span className="stat-label">Puzzles</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{stats.best_streak || 0}</span>
                  <span className="stat-label">Best Streak</span>
                </div>
              </div>
            ) : (
              <p className="loading-text">Loading stats...</p>
            )}
          </div>
        </div>

        {/* Tournaments Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>🏅 Upcoming Tournaments</h3>
            <Link to="/tournaments" className="card-link">View All →</Link>
          </div>
          <div className="dash-card-body">
            {upcomingTournaments.length > 0 ? (
              <div className="tournament-list">
                {upcomingTournaments.map(t => (
                  <Link key={t.id} to={`/tournament/${t.id}`} className="tournament-item">
                    <span className="tournament-name">{t.name}</span>
                    <span className="tournament-date">{new Date(t.start_time).toLocaleDateString()}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty-text">No upcoming tournaments</p>
            )}
          </div>
        </div>


        {/* Club Member Card */}
        {isClubMember && (
          <div className="dash-card club-card">
            <div className="dash-card-header">
              <h3><FaCrown style={{ color: '#fbbf24' }} /> Club Member</h3>
            </div>
            <div className="dash-card-body">
              <p>You have access to exclusive club content!</p>
              <Link to="/club" className="btn-club">View Club Area →</Link>
            </div>
          </div>
        )}

        {/* Oupa link only for Riddick */}
        {user.username === 'Handsome Riddick 😎' && (
          <div className="dash-card">
            <div className="dash-card-body">
              <div className="quick-links">
                <Link to="/oupa" className="quick-link">👴 Play with Oupa</Link>
              </div>
            </div>
          </div>
        )}
      </div>


      <style jsx>{`
        /* ========== DASHBOARD STYLES ========== */
        .dashboard {
          padding: 20px 0;
        }

        .welcome-section {
          position: relative;
          margin-bottom: 32px;
        }

        .welcome-glow {
          position: absolute;
          top: -20px;
          left: -40px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        .welcome-section h1 {
          font-size: 2rem;
          font-family: 'Space Grotesk', sans-serif;
          margin-bottom: 8px;
        }

        .username-highlight {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-section p {
          color: var(--text-secondary);
        }


        /* Quick Actions */
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (max-width: 1000px) {
          .quick-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .quick-actions {
            grid-template-columns: 1fr;
          }
        }

        .action-card {
          background: rgba(30, 30, 50, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px 16px;
          text-align: center;
          color: var(--text-primary);
          transition: all 0.3s ease;
          text-decoration: none;
          min-width: 0;
        }

        .action-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(99, 102, 241, 0.15);
        }

        .action-card-primary {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .action-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          margin: 0 auto 12px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: white;
        }

        .action-icon-orange { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
        .action-icon-purple { background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); }
        .action-icon-yellow { background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); }

        .action-label {
          display: block;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .action-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
        }


        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .dash-card {
          background: rgba(30, 30, 50, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          min-width: 0;
        }

        .dash-card:hover {
          border-color: var(--border-light);
        }

        .dash-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .dash-card-header h3 {
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-link {
          font-size: 0.85rem;
          color: var(--accent-primary);
        }

        .dash-card-body {
          padding: 20px;
        }


        /* Ratings */
        .ratings-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rating-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-tertiary);
          border-radius: 12px;
          min-width: 0;
        }

        .rating-emoji {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .rating-type {
          flex: 1;
          font-size: 0.95rem;
          color: var(--text-secondary);
          min-width: 0;
        }

        .rating-number {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: #a78bfa;
          flex-shrink: 0;
        }

        /* Stats */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .stat-box {
          text-align: center;
          padding: 16px;
          background: var(--bg-tertiary);
          border-radius: 10px;
        }

        .stat-number {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--text-muted);
        }


        /* Tournaments */
        .tournament-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tournament-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          color: var(--text-primary);
          transition: all 0.2s ease;
        }

        .tournament-item:hover {
          background: var(--border-color);
        }

        .tournament-name {
          font-weight: 500;
        }

        .tournament-date {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* Club Card */
        .club-card {
          border-color: rgba(251, 191, 36, 0.3);
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%);
        }

        .btn-club {
          display: inline-block;
          margin-top: 12px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #000;
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-club:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
        }


        /* Quick Links */
        .quick-links {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .quick-link {
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .quick-link:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }

        /* Utility */
        .loading-text, .empty-text {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .quick-actions {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .ratings-grid, .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
