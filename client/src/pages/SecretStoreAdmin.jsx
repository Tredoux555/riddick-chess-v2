import React, { useState } from 'react';
import '../styles/SecretStore.css';

const SecretStoreAdmin = () => {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  const login = async () => {
    const res = await fetch(`/api/secret-store/admin/users?pass=${password}`);
    if (!res.ok) { alert('Wrong password'); return; }
    const data = await res.json();
    setUsers(data.users || []);
    setStats({
      pending: data.users?.filter(u => u.status === 'pending').length || 0,
      approved: data.users?.filter(u => u.status === 'approved').length || 0,
      rejected: data.users?.filter(u => u.status === 'rejected').length || 0
    });
    setLoggedIn(true);
  };

  const loadUsers = async () => {
    const res = await fetch(`/api/secret-store/admin/users?pass=${password}`);
    const data = await res.json();
    setUsers(data.users || []);
    setStats({
      pending: data.users?.filter(u => u.status === 'pending').length || 0,
      approved: data.users?.filter(u => u.status === 'approved').length || 0,
      rejected: data.users?.filter(u => u.status === 'rejected').length || 0
    });
  };


  const approve = async (id) => {
    await fetch('/api/secret-store/admin/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadUsers();
  };

  const reject = async (id) => {
    await fetch('/api/secret-store/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadUsers();
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await fetch('/api/secret-store/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadUsers();
  };

  if (!loggedIn) {
    return (
      <div className="secret-store-container">
        <div className="secret-store-box">
          <h1>👑 Admin</h1>
          <div className="form">
            <input type="password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="submit-btn" onClick={login}>Login</button>
          </div>
        </div>
      </div>
    );
  }


  const pending = users.filter(u => u.status === 'pending');
  const approved = users.filter(u => u.status === 'approved');
  const rejected = users.filter(u => u.status === 'rejected');

  const UserCard = ({ user, showActions }) => (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h4 style={{ margin: '0 0 5px', color: '#fff' }}>{user.name} <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', background: user.status === 'pending' ? 'rgba(251,191,36,0.2)' : user.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: user.status === 'pending' ? '#fbbf24' : user.status === 'approved' ? '#22c55e' : '#ef4444' }}>{user.status}</span></h4>
        <p style={{ margin: '0 0 5px', color: 'rgba(255,255,255,0.5)' }}>{user.email}</p>
        {user.reason && <p style={{ margin: '0 0 5px', color: 'rgba(255,255,255,0.5)' }}>"{user.reason}"</p>}
        <small style={{ color: 'rgba(255,255,255,0.3)' }}>Requested: {new Date(user.requestedAt).toLocaleString()}</small>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {showActions && <button onClick={() => approve(user.id)} style={{ padding: '10px 20px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>✓ Approve</button>}
        {showActions && <button onClick={() => reject(user.id)} style={{ padding: '10px 20px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>✗ Reject</button>}
        <button onClick={() => deleteUser(user.id)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>🗑</button>
      </div>
    </div>
  );

  return (
    <div className="secret-store-container">
      <div style={{ maxWidth: '1000px', width: '100%', padding: '20px' }}>
        <h1 style={{ color: '#fff', marginBottom: '30px' }}>👑 Secret Store Admin</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#fbbf24', margin: '0 0 5px' }}>{stats.pending}</h3><p style={{ color: '#fff', margin: 0 }}>Pending</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#22c55e', margin: '0 0 5px' }}>{stats.approved}</h3><p style={{ color: '#fff', margin: 0 }}>Approved</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', color: '#ef4444', margin: '0 0 5px' }}>{stats.rejected}</h3><p style={{ color: '#fff', margin: 0 }}>Rejected</p>
          </div>
        </div>

        
        <button onClick={loadUsers} style={{ marginBottom: '20px', padding: '10px 20px', background: '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>🔄 Refresh</button>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>⏳ Pending Requests</h2>
          {pending.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>No pending requests</p> : pending.map(u => <UserCard key={u.id} user={u} showActions />)}
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>✅ Approved Users</h2>
          {approved.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>No approved users</p> : approved.map(u => <UserCard key={u.id} user={u} showActions={false} />)}
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>❌ Rejected Users</h2>
          {rejected.length === 0 ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>No rejected users</p> : rejected.map(u => <UserCard key={u.id} user={u} showActions={false} />)}
        </div>
      </div>
    </div>
  );
};

export default SecretStoreAdmin;
