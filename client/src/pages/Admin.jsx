import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaUsers, FaTrophy, FaShieldAlt, FaChartBar, FaCrown, FaBan, FaCheck, FaHeartbeat, FaDownload, FaSync, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';

const Admin = () => {
  const location = useLocation();
  
  return (
    <div className="admin-page">
      <div className="admin-sidebar">
        <h2><FaShieldAlt /> Admin</h2>
        <nav>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            <FaChartBar /> Dashboard
          </Link>
          <Link to="/admin/users" className={location.pathname === '/admin/users' ? 'active' : ''}>
            <FaUsers /> Users
          </Link>
          <Link to="/admin/club" className={location.pathname === '/admin/club' ? 'active' : ''}>
            <FaCrown /> Club Members
          </Link>
          <Link to="/admin/tournaments" className={location.pathname.includes('/admin/tournaments') ? 'active' : ''}>
            <FaTrophy /> Tournaments
          </Link>
          <Link to="/admin/health" className={location.pathname === '/admin/health' ? 'active' : ''}>
            <FaHeartbeat /> Health Check
          </Link>
        </nav>
      </div>
      <div className="admin-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="club" element={<ClubMembers />} />
          <Route path="tournaments" element={<TournamentAdmin />} />
          <Route path="tournaments/create" element={<CreateTournament />} />
          <Route path="health" element={<HealthCheck />} />
        </Routes>
      </div>
      <style jsx>{`
        .admin-page { display: flex; min-height: calc(100vh - 80px); margin: -24px; }
        .admin-sidebar { width: 220px; background: var(--bg-card); padding: 24px; border-right: 1px solid var(--border-color); }
        .admin-sidebar h2 { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 1.25rem; }
        .admin-sidebar nav { display: flex; flex-direction: column; gap: 8px; }
        .admin-sidebar a { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-md); color: var(--text-secondary); }
        .admin-sidebar a:hover, .admin-sidebar a.active { background: var(--bg-tertiary); color: var(--text-primary); }
        .admin-content { flex: 1; padding: 24px; overflow-y: auto; }
      `}</style>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    axios.get('/api/admin/stats').then(r => setStats(r.data)).catch(console.error);
  }, []);
  
  if (!stats) return <div className="spinner"></div>;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Users</div></div>
        <div className="stat-card"><div className="stat-value">{stats.totalGames}</div><div className="stat-label">Games</div></div>
        <div className="stat-card"><div className="stat-value">{stats.activeTournaments}</div><div className="stat-label">Active Tournaments</div></div>
        <div className="stat-card"><div className="stat-value">{stats.clubMembers}</div><div className="stat-label">Club Members</div></div>
      </div>
      <style jsx>{`
        h1 { margin-bottom: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-card { background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); text-align: center; }
        .stat-value { font-size: 2rem; font-weight: 700; color: var(--accent-primary); }
        .stat-label { color: var(--text-muted); }
      `}</style>
    </div>
  );
};

const HealthCheck = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/api/healthcheck/health-check');
      setResults(r.data);
      toast.success(`Health check complete: ${r.data.summary.passed}/${r.data.summary.total} passed`);
    } catch (e) {
      toast.error('Health check failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const exportData = {
      ...results,
      exportedAt: new Date().toISOString(),
      exportFormat: 'riddick-chess-health-report'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const copyToClipboard = () => {
    if (!results) return;
    const text = formatResultsAsText(results);
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard! Paste this to Claude for debugging.');
  };

  const formatResultsAsText = (r) => {
    let text = `RIDDICK CHESS HEALTH CHECK REPORT\n`;
    text += `================================\n`;
    text += `Timestamp: ${r.timestamp}\n`;
    text += `Server: ${r.server}\n`;
    text += `Duration: ${r.duration}ms\n\n`;
    text += `SUMMARY: ${r.summary.passed}/${r.summary.total} passed (${r.summary.passRate}%)\n`;
    text += `- Passed: ${r.summary.passed}\n`;
    text += `- Failed: ${r.summary.failed}\n`;
    text += `- Warnings: ${r.summary.warnings}\n\n`;
    text += `DETAILED RESULTS:\n`;
    text += `=================\n`;
    
    const categories = [...new Set(r.tests.map(t => t.category))];
    categories.forEach(cat => {
      text += `\n[${cat}]\n`;
      r.tests.filter(t => t.category === cat).forEach(t => {
        const icon = t.status === 'pass' ? '✅' : t.status === 'fail' ? '❌' : '⚠️';
        text += `${icon} ${t.name}: ${t.status.toUpperCase()}`;
        if (t.details) text += ` - ${JSON.stringify(t.details)}`;
        if (t.error) text += ` - ERROR: ${t.error}`;
        text += '\n';
      });
    });
    return text;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <FaCheckCircle style={{ color: '#10b981' }} />;
      case 'fail': return <FaTimesCircle style={{ color: '#ef4444' }} />;
      case 'warn': return <FaExclamationTriangle style={{ color: '#f59e0b' }} />;
      default: return null;
    }
  };

  const filteredTests = results?.tests.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  }) || [];

  const categories = results ? [...new Set(results.tests.map(t => t.category))] : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1><FaHeartbeat /> System Health Check</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={runHealthCheck} disabled={loading}>
            <FaSync className={loading ? 'spin' : ''} /> {loading ? 'Running...' : 'Run Health Check'}
          </button>
          {results && (
            <>
              <button className="btn btn-secondary" onClick={exportResults}>
                <FaDownload /> Export JSON
              </button>
              <button className="btn btn-secondary" onClick={copyToClipboard}>
                📋 Copy for Claude
              </button>
            </>
          )}
        </div>
      </div>

      {results && (
        <>
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="value">{results.summary.total}</div>
              <div className="label">Total Tests</div>
            </div>
            <div className="summary-card passed">
              <div className="value">{results.summary.passed}</div>
              <div className="label">Passed</div>
            </div>
            <div className="summary-card failed">
              <div className="value">{results.summary.failed}</div>
              <div className="label">Failed</div>
            </div>
            <div className="summary-card warnings">
              <div className="value">{results.summary.warnings}</div>
              <div className="label">Warnings</div>
            </div>
            <div className="summary-card rate">
              <div className="value">{results.summary.passRate}%</div>
              <div className="label">Pass Rate</div>
            </div>
          </div>

          <div style={{ margin: '20px 0', display: 'flex', gap: '8px' }}>
            <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All</button>
            <button className={`btn btn-sm ${filter === 'pass' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pass')}>✅ Passed</button>
            <button className={`btn btn-sm ${filter === 'fail' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('fail')}>❌ Failed</button>
            <button className={`btn btn-sm ${filter === 'warn' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('warn')}>⚠️ Warnings</button>
          </div>

          {categories.map(cat => {
            const catTests = filteredTests.filter(t => t.category === cat);
            if (catTests.length === 0) return null;
            return (
              <div key={cat} className="test-category">
                <h3>{cat}</h3>
                <div className="test-list">
                  {catTests.map((t, i) => (
                    <div key={i} className={`test-item ${t.status}`}>
                      <div className="test-header">
                        {getStatusIcon(t.status)}
                        <span className="test-name">{t.name}</span>
                        <span className={`test-status ${t.status}`}>{t.status.toUpperCase()}</span>
                      </div>
                      {t.details && (
                        <div className="test-details">
                          {Object.entries(t.details).map(([k, v]) => (
                            <span key={k}><strong>{k}:</strong> {JSON.stringify(v)}</span>
                          ))}
                        </div>
                      )}
                      {t.error && <div className="test-error">Error: {t.error}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="meta-info">
            <p>Timestamp: {results.timestamp}</p>
            <p>Duration: {results.duration}ms</p>
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="empty-state">
          <FaHeartbeat style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
          <h3>No Health Check Results</h3>
          <p>Click "Run Health Check" to test all systems</p>
        </div>
      )}

      <style jsx>{`
        .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); text-align: center; }
        .summary-card .value { font-size: 2rem; font-weight: 700; }
        .summary-card .label { color: var(--text-muted); font-size: 0.875rem; }
        .summary-card.passed .value { color: #10b981; }
        .summary-card.failed .value { color: #ef4444; }
        .summary-card.warnings .value { color: #f59e0b; }
        .summary-card.rate .value { color: var(--accent-primary); }
        .test-category { margin-bottom: 24px; }
        .test-category h3 { margin-bottom: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
        .test-list { display: flex; flex-direction: column; gap: 8px; }
        .test-item { background: var(--bg-card); padding: 12px 16px; border-radius: var(--radius-md); border-left: 4px solid; }
        .test-item.pass { border-left-color: #10b981; }
        .test-item.fail { border-left-color: #ef4444; }
        .test-item.warn { border-left-color: #f59e0b; }
        .test-header { display: flex; align-items: center; gap: 12px; }
        .test-name { flex: 1; font-weight: 500; }
        .test-status { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
        .test-status.pass { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .test-status.fail { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .test-status.warn { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .test-details { margin-top: 8px; font-size: 0.875rem; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 16px; }
        .test-error { margin-top: 8px; font-size: 0.875rem; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 4px; }
        .meta-info { margin-top: 24px; color: var(--text-muted); font-size: 0.875rem; }
        .empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  
  useEffect(() => { loadUsers(); }, []);
  
  const loadUsers = async () => {
    const r = await axios.get('/api/admin/users');
    setUsers(r.data);
  };
  
  const toggleBan = async (id, banned) => {
    await axios.post(`/api/admin/users/${id}/${banned ? 'unban' : 'ban'}`);
    toast.success(banned ? 'User unbanned' : 'User banned');
    loadUsers();
  };
  
  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <div>
      <h1>Users</h1>
      <input className="form-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '16px', maxWidth: '300px' }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Username</th><th>Email</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
              <td>{u.is_banned ? <span style={{ color: 'var(--accent-danger)' }}>Banned</span> : 'Active'}</td>
              <td>
                <button className={`btn btn-sm ${u.is_banned ? 'btn-success' : 'btn-danger'}`} onClick={() => toggleBan(u.id, u.is_banned)}>
                  {u.is_banned ? <><FaCheck /> Unban</> : <><FaBan /> Ban</>}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{`
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { color: var(--text-muted); font-weight: 500; }
      `}</style>
    </div>
  );
};

const ClubMembers = () => {
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  
  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    const [m, p] = await Promise.all([
      axios.get('/api/club/members'),
      axios.get('/api/club/pending')
    ]);
    setMembers(m.data);
    setPending(p.data);
  };
  
  const verify = async (id) => {
    await axios.post(`/api/club/members/${id}/verify`);
    toast.success('Member verified!');
    loadData();
  };
  
  const revoke = async (id) => {
    if (!window.confirm('Revoke membership?')) return;
    await axios.post(`/api/club/members/${id}/revoke`);
    loadData();
  };
  
  return (
    <div>
      <h1>Club Members</h1>
      
      {pending.length > 0 && (
        <>
          <h3 style={{ marginBottom: '12px' }}>Pending Verification</h3>
          <div style={{ marginBottom: '24px' }}>
            {pending.map(u => (
              <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: '8px' }}>
                <span>{u.username}</span>
                <button className="btn btn-sm btn-success" onClick={() => verify(u.id)}>Verify</button>
              </div>
            ))}
          </div>
        </>
      )}
      
      <h3 style={{ marginBottom: '12px' }}>Current Members ({members.length})</h3>
      {members.map(m => (
        <div key={m.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginBottom: '8px' }}>
          <span>{m.username}</span>
          <button className="btn btn-sm btn-danger" onClick={() => revoke(m.id)}>Revoke</button>
        </div>
      ))}
    </div>
  );
};

const TournamentAdmin = () => {
  const [tournaments, setTournaments] = useState([]);
  
  useEffect(() => {
    axios.get('/api/tournaments').then(r => setTournaments(r.data));
  }, []);
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1>Tournaments</h1>
        <Link to="/admin/tournaments/create" className="btn btn-primary">Create Tournament</Link>
      </div>
      {tournaments.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: '12px' }}>
          <h3>{t.name}</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {t.status} • {t.participant_count || 0} players • {t.start_time ? new Date(t.start_time).toLocaleDateString() : 'TBD'}
          </p>
        </div>
      ))}
    </div>
  );
};

const CreateTournament = () => {
  const [form, setForm] = useState({
    name: '', description: '', timeControl: 300, increment: 0,
    maxPlayers: 16, totalRounds: 5, startTime: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/tournaments', form);
      toast.success('Tournament created!');
      window.location.href = '/admin/tournaments';
    } catch (err) {
      toast.error('Failed to create tournament');
    }
  };
  
  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>Create Tournament</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Time Control (seconds)</label>
          <input type="number" className="form-input" value={form.timeControl} onChange={e => setForm({...form, timeControl: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Increment (seconds)</label>
          <input type="number" className="form-input" value={form.increment} onChange={e => setForm({...form, increment: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Players</label>
          <input type="number" className="form-input" value={form.maxPlayers} onChange={e => setForm({...form, maxPlayers: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Rounds</label>
          <input type="number" className="form-input" value={form.totalRounds} onChange={e => setForm({...form, totalRounds: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input type="datetime-local" className="form-input" required value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
        </div>
        <button type="submit" className="btn btn-primary">Create Tournament</button>
      </form>
    </div>
  );
};

export default Admin;
