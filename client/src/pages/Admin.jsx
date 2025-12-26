import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaUsers, FaTrophy, FaShieldAlt, FaChartBar, FaCrown, FaBan, FaCheck } from 'react-icons/fa';

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
        </nav>
      </div>
      <div className="admin-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="club" element={<ClubMembers />} />
          <Route path="tournaments" element={<TournamentAdmin />} />
          <Route path="tournaments/create" element={<CreateTournament />} />
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
            {t.status} • {t.participant_count || 0} players • {new Date(t.start_time).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

const CreateTournament = () => {
  const [form, setForm] = useState({
    name: '', description: '', time_control: 300, increment: 0,
    max_players: 16, total_rounds: 5, start_time: ''
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
          <input type="number" className="form-input" value={form.time_control} onChange={e => setForm({...form, time_control: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Increment (seconds)</label>
          <input type="number" className="form-input" value={form.increment} onChange={e => setForm({...form, increment: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Max Players</label>
          <input type="number" className="form-input" value={form.max_players} onChange={e => setForm({...form, max_players: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Rounds</label>
          <input type="number" className="form-input" value={form.total_rounds} onChange={e => setForm({...form, total_rounds: +e.target.value})} />
        </div>
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input type="datetime-local" className="form-input" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
        </div>
        <button type="submit" className="btn btn-primary">Create Tournament</button>
      </form>
    </div>
  );
};

export default Admin;
