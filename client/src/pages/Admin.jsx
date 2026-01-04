import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaUsers, FaTrophy, FaShieldAlt, FaChartBar, FaCrown, FaBan, FaCheck, 
  FaHeartbeat, FaDownload, FaSync, FaCheckCircle, FaTimesCircle, 
  FaExclamationTriangle, FaEdit, FaTrash, FaKey, FaLink, FaVolumeMute,
  FaStar, FaTimes, FaUserCog, FaBullhorn, FaComments
} from 'react-icons/fa';

const Admin = () => {
  const location = useLocation();
  
  return (
    <div className="admin-page">
      <div className="admin-sidebar">
        <h2><FaShieldAlt /> Admin</h2>
        <nav>
          <Link to="/admin/riddick" className={location.pathname === '/admin/riddick' ? 'active' : ''}>
            <FaChartBar /> Dashboard
          </Link>
          <Link to="/admin/riddick/users" className={location.pathname === '/admin/riddick/users' ? 'active' : ''}>
            <FaUsers /> Users
          </Link>
          <Link to="/admin/riddick/club" className={location.pathname === '/admin/riddick/club' ? 'active' : ''}>
            <FaCrown /> Club Members
          </Link>
          <Link to="/admin/riddick/tournaments" className={location.pathname.includes('/admin/riddick/tournaments') ? 'active' : ''}>
            <FaTrophy /> Tournaments
          </Link>
          <Link to="/admin/riddick/announcements" className={location.pathname === '/admin/riddick/announcements' ? 'active' : ''}>
            <FaBullhorn /> Announcements
          </Link>
          <Link to="/admin/riddick/chats" className={location.pathname === '/admin/riddick/chats' ? 'active' : ''}>
            <FaComments /> Chat Monitor
          </Link>
          <Link to="/admin/riddick/health" className={location.pathname === '/admin/riddick/health' ? 'active' : ''}>
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
          <Route path="announcements" element={<Announcements />} />
          <Route path="chats" element={<ChatMonitor />} />
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
  const [bannedIPs, setBannedIPs] = useState([]);
  const [newBanIP, setNewBanIP] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    axios.get('/api/admin/stats').then(r => setStats(r.data)).catch(console.error);
    fetchBannedIPs();
  }, []);

  const fetchBannedIPs = async () => {
    try {
      const res = await axios.get('/api/admin/banned-ips');
      setBannedIPs(res.data);
    } catch (err) {
      console.error('Failed to fetch banned IPs:', err);
    }
  };

  const handleBanIP = async () => {
    if (!newBanIP) return alert('Enter an IP address');
    try {
      await axios.post('/api/admin/ban-ip', {
        ip_address: newBanIP,
        reason: banReason
      });
      setNewBanIP('');
      setBanReason('');
      fetchBannedIPs();
      toast.success(`Banned IP: ${newBanIP}`);
    } catch (err) {
      toast.error('Failed to ban IP');
    }
  };

  const handleUnbanIP = async (ip) => {
    if (!window.confirm(`Unban ${ip}?`)) return;
    try {
      await axios.delete(`/api/admin/unban-ip/${encodeURIComponent(ip)}`);
      fetchBannedIPs();
      toast.success(`Unbanned IP: ${ip}`);
    } catch (err) {
      toast.error('Failed to unban IP');
    }
  };
  
  if (!stats) return <div className="spinner"></div>;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div>
        <div className="stat-card"><div className="stat-value">{stats.onlineUsers}</div><div className="stat-label">Online Now</div></div>
        <div className="stat-card"><div className="stat-value">{stats.totalGames}</div><div className="stat-label">Games Played</div></div>
        <div className="stat-card"><div className="stat-value">{stats.activeGames}</div><div className="stat-label">Active Games</div></div>
        <div className="stat-card"><div className="stat-value">{stats.clubMembers}</div><div className="stat-label">Club Members</div></div>
        <div className="stat-card"><div className="stat-value">{stats.activeTournaments}</div><div className="stat-label">Active Tournaments</div></div>
      </div>

      {/* IP Ban Section */}
      <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '20px', marginTop: '20px', border: '2px solid #ef4444' }}>
        <h3 style={{ color: '#ef4444', marginTop: 0 }}>🚫 IP Ban Management</h3>
        
        {/* Ban new IP */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="IP Address (e.g. 192.168.1.1)"
            value={newBanIP}
            onChange={(e) => setNewBanIP(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#0a0a0f', color: '#fff', minWidth: '150px' }}
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#0a0a0f', color: '#fff', minWidth: '150px' }}
          />
          <button onClick={handleBanIP} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔨 Ban IP
          </button>
        </div>

        {/* Banned IPs list */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {bannedIPs.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No banned IPs</p>
          ) : (
            bannedIPs.map((ban) => (
              <div key={ban.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#0a0a0f', borderRadius: '8px', marginBottom: '8px' }}>
                <div>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{ban.ip_address}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '10px', fontSize: '12px' }}>{ban.reason}</span>
                  <span style={{ color: '#666', marginLeft: '10px', fontSize: '12px' }}>{new Date(ban.banned_at).toLocaleDateString()}</span>
                </div>
                <button onClick={() => handleUnbanIP(ban.ip_address)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  Unban
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        h1 { margin-bottom: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [actionData, setActionData] = useState({});
  
  useEffect(() => { loadUsers(); }, []);
  
  const loadUsers = async () => {
    const r = await axios.get('/api/admin/users');
    setUsers(r.data);
  };
  
  const handleAction = async (action, userId, data = {}) => {
    try {
      switch (action) {
        case 'ban':
          await axios.post(`/api/admin/users/${userId}/ban`, data);
          toast.success('User banned');
          break;
        case 'unban':
          await axios.post(`/api/admin/users/${userId}/unban`);
          toast.success('User unbanned');
          break;
        case 'mute':
          await axios.post(`/api/admin/users/${userId}/mute`, data);
          toast.success('User muted');
          break;
        case 'unmute':
          await axios.post(`/api/admin/users/${userId}/unmute`);
          toast.success('User unmuted');
          break;
        case 'delete':
          if (!window.confirm('DELETE this account permanently? This cannot be undone!')) return;
          await axios.delete(`/api/admin/users/${userId}`);
          toast.success('Account deleted');
          break;
        case 'resetPassword':
          const pwRes = await axios.post(`/api/admin/users/${userId}/reset-password`, data);
          toast.success(`Password reset! Temp: ${pwRes.data.tempPassword}`);
          setActionData({ ...actionData, tempPassword: pwRes.data.tempPassword });
          return; // Don't close modal yet
        case 'generateResetLink':
          const linkRes = await axios.post(`/api/admin/users/${userId}/generate-reset-link`);
          toast.success('Reset link generated!');
          setActionData({ ...actionData, resetLink: linkRes.data.resetLink });
          return;
        case 'makeAdmin':
          await axios.post(`/api/admin/users/${userId}/make-admin`);
          toast.success('User is now admin');
          break;
        case 'removeAdmin':
          await axios.post(`/api/admin/users/${userId}/remove-admin`);
          toast.success('Admin removed');
          break;
        case 'resetRatings':
          if (!window.confirm('Reset all ratings to 500?')) return;
          await axios.post(`/api/admin/users/${userId}/reset-ratings`);
          toast.success('Ratings reset');
          break;
        case 'editUser':
          await axios.put(`/api/admin/users/${userId}`, data);
          toast.success('User updated');
          break;
        default:
          break;
      }
      loadUsers();
      setModalAction(null);
      setSelectedUser(null);
      setActionData({});
    } catch (error) {
      toast.error(error.response?.data?.error || 'Action failed');
    }
  };
  
  const filtered = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div>
      <h1>User Management</h1>
      <input 
        className="form-input" 
        placeholder="Search by username or email..." 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        style={{ marginBottom: '16px', maxWidth: '400px' }} 
      />
      
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={u.is_banned ? 'banned' : ''}>
                <td>
                  <div className="user-cell">
                    <span className="username">{u.username}</span>
                    {u.is_admin && <FaStar className="admin-badge" title="Admin" />}
                    {u.is_club_member && <FaCrown className="club-badge" title="Club Member" />}
                  </div>
                </td>
                <td>{u.email}</td>
                <td>{u.blitz_rating || 500}</td>
                <td>
                  {u.is_banned ? <span className="status banned"><FaBan /> Banned</span> : 
                   u.is_muted ? <span className="status muted"><FaVolumeMute /> Muted</span> :
                   <span className="status active"><FaCheck /> Active</span>}
                </td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-sm btn-icon" onClick={() => { setSelectedUser(u); setModalAction('manage'); }} title="Manage User">
                    <FaUserCog />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Management Modal */}
      {selectedUser && modalAction === 'manage' && (
        <div className="modal-overlay" onClick={() => { setSelectedUser(null); setModalAction(null); setActionData({}); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaUserCog /> Manage: {selectedUser.username}</h2>
              <button className="close-btn" onClick={() => { setSelectedUser(null); setModalAction(null); setActionData({}); }}><FaTimes /></button>
            </div>
            
            <div className="modal-body">
              <div className="user-info">
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Rating:</strong> {selectedUser.blitz_rating || 500}</p>
                <p><strong>Games:</strong> {selectedUser.total_games || 0}</p>
                <p><strong>Joined:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
              
              <div className="action-section">
                <h4>🔐 Password</h4>
                <div className="action-buttons">
                  <button className="btn btn-sm" onClick={() => setModalAction('resetPassword')}>
                    <FaKey /> Set Temp Password
                  </button>
                  <button className="btn btn-sm" onClick={() => setModalAction('generateLink')}>
                    <FaLink /> Generate Reset Link
                  </button>
                </div>
              </div>
              
              <div className="action-section">
                <h4>✏️ Edit User</h4>
                <div className="action-buttons">
                  <button className="btn btn-sm" onClick={() => setModalAction('editUser')}>
                    <FaEdit /> Edit Username/Email
                  </button>
                  <button className="btn btn-sm" onClick={() => handleAction('resetRatings', selectedUser.id)}>
                    <FaSync /> Reset Ratings
                  </button>
                </div>
              </div>
              
              <div className="action-section">
                <h4>⚖️ Moderation</h4>
                <div className="action-buttons">
                  {selectedUser.is_banned ? (
                    <button className="btn btn-sm btn-success" onClick={() => handleAction('unban', selectedUser.id)}>
                      <FaCheck /> Unban
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-warning" onClick={() => setModalAction('ban')}>
                      <FaBan /> Ban User
                    </button>
                  )}
                  {selectedUser.is_muted ? (
                    <button className="btn btn-sm btn-success" onClick={() => handleAction('unmute', selectedUser.id)}>
                      <FaCheck /> Unmute
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-warning" onClick={() => setModalAction('mute')}>
                      <FaVolumeMute /> Mute User
                    </button>
                  )}
                </div>
              </div>
              
              <div className="action-section">
                <h4>👑 Privileges</h4>
                <div className="action-buttons">
                  {selectedUser.is_admin ? (
                    <button className="btn btn-sm btn-warning" onClick={() => handleAction('removeAdmin', selectedUser.id)}>
                      <FaTimes /> Remove Admin
                    </button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => handleAction('makeAdmin', selectedUser.id)}>
                      <FaStar /> Make Admin
                    </button>
                  )}
                </div>
              </div>
              
              <div className="action-section danger-zone">
                <h4>⚠️ Danger Zone</h4>
                <button className="btn btn-sm btn-danger" onClick={() => handleAction('delete', selectedUser.id)}>
                  <FaTrash /> Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Reset Password */}
      {selectedUser && modalAction === 'resetPassword' && (
        <div className="modal-overlay" onClick={() => setModalAction('manage')}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <h3><FaKey /> Reset Password</h3>
            <p>Set a temporary password for {selectedUser.username}</p>
            <input 
              className="form-input" 
              placeholder="Leave empty for random password"
              value={actionData.newPassword || ''}
              onChange={e => setActionData({ ...actionData, newPassword: e.target.value })}
            />
            {actionData.tempPassword && (
              <div className="result-box">
                <strong>Temp Password:</strong> <code>{actionData.tempPassword}</code>
                <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(actionData.tempPassword)}>Copy</button>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalAction('manage')}>Back</button>
              <button className="btn btn-primary" onClick={() => handleAction('resetPassword', selectedUser.id, { newPassword: actionData.newPassword })}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sub-Modal: Generate Reset Link */}
      {selectedUser && modalAction === 'generateLink' && (
        <div className="modal-overlay" onClick={() => setModalAction('manage')}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <h3><FaLink /> Generate Reset Link</h3>
            <p>Generate a password reset link for {selectedUser.username}</p>
            {actionData.resetLink ? (
              <div className="result-box">
                <strong>Reset Link:</strong>
                <input className="form-input" readOnly value={actionData.resetLink} />
                <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(actionData.resetLink)}>Copy</button>
                <p className="hint">Send this link to the user. Expires in 24 hours.</p>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => handleAction('generateResetLink', selectedUser.id)}>
                Generate Link
              </button>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalAction('manage')}>Back</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sub-Modal: Ban User */}
      {selectedUser && modalAction === 'ban' && (
        <div className="modal-overlay" onClick={() => setModalAction('manage')}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <h3><FaBan /> Ban User</h3>
            <div className="form-group">
              <label>Reason</label>
              <input className="form-input" value={actionData.reason || ''} onChange={e => setActionData({ ...actionData, reason: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Duration (hours, empty = permanent)</label>
              <select className="form-input" value={actionData.duration || ''} onChange={e => setActionData({ ...actionData, duration: e.target.value })}>
                <option value="">Permanent</option>
                <option value="1">1 hour</option>
                <option value="24">1 day</option>
                <option value="168">1 week</option>
                <option value="720">1 month</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalAction('manage')}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleAction('ban', selectedUser.id, actionData)}>Ban User</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sub-Modal: Mute User */}
      {selectedUser && modalAction === 'mute' && (
        <div className="modal-overlay" onClick={() => setModalAction('manage')}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <h3><FaVolumeMute /> Mute User</h3>
            <p>Prevent user from sending chat messages</p>
            <div className="form-group">
              <label>Duration (hours, empty = permanent)</label>
              <select className="form-input" value={actionData.duration || ''} onChange={e => setActionData({ ...actionData, duration: e.target.value })}>
                <option value="">Permanent</option>
                <option value="1">1 hour</option>
                <option value="24">1 day</option>
                <option value="168">1 week</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalAction('manage')}>Cancel</button>
              <button className="btn btn-warning" onClick={() => handleAction('mute', selectedUser.id, actionData)}>Mute User</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sub-Modal: Edit User */}
      {selectedUser && modalAction === 'editUser' && (
        <div className="modal-overlay" onClick={() => setModalAction('manage')}>
          <div className="modal small" onClick={e => e.stopPropagation()}>
            <h3><FaEdit /> Edit User</h3>
            <div className="form-group">
              <label>Username</label>
              <input className="form-input" value={actionData.username ?? selectedUser.username} onChange={e => setActionData({ ...actionData, username: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="form-input" value={actionData.email ?? selectedUser.email} onChange={e => setActionData({ ...actionData, email: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModalAction('manage')}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleAction('editUser', selectedUser.id, actionData)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        h1 { margin-bottom: 24px; }
        .users-table { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border-color); }
        th { color: var(--text-muted); font-weight: 500; }
        tr.banned { opacity: 0.6; background: rgba(239, 68, 68, 0.1); }
        .user-cell { display: flex; align-items: center; gap: 8px; }
        .admin-badge { color: gold; }
        .club-badge { color: #a855f7; }
        .status { display: flex; align-items: center; gap: 4px; font-size: 0.875rem; }
        .status.banned { color: #ef4444; }
        .status.muted { color: #f59e0b; }
        .status.active { color: #10b981; }
        .btn-icon { padding: 8px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
        .modal.small { max-width: 400px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header h2 { display: flex; align-items: center; gap: 8px; margin: 0; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); }
        .modal-body { display: flex; flex-direction: column; gap: 20px; }
        .user-info { background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); }
        .user-info p { margin: 4px 0; }
        .action-section { border-top: 1px solid var(--border-color); padding-top: 16px; }
        .action-section h4 { margin: 0 0 12px 0; font-size: 0.9rem; }
        .action-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
        .danger-zone { border-color: #ef4444; }
        .danger-zone h4 { color: #ef4444; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; margin-bottom: 4px; font-size: 0.875rem; color: var(--text-muted); }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
        .result-box { background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); margin: 12px 0; }
        .result-box code { background: var(--bg-primary); padding: 4px 8px; border-radius: 4px; }
        .hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; }
        .btn-warning { background: #f59e0b; color: white; }
      `}</style>
    </div>
  );
};


const ClubMembers = () => {
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  
  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    try {
      const [m, r] = await Promise.all([
        axios.get('/api/club/members'),
        axios.get('/api/club/join-requests')
      ]);
      setMembers(m.data);
      setRequests(r.data);
    } catch (e) { console.error(e); }
  };
  
  const handleApprove = async (id) => {
    await axios.post(`/api/club/join-requests/${id}/approve`);
    toast.success('Approved!');
    loadData();
  };
  
  const handleReject = async (id) => {
    await axios.post(`/api/club/join-requests/${id}/reject`);
    toast.success('Rejected');
    loadData();
  };
  
  const handleRevoke = async (id) => {
    if (!window.confirm('Remove from club?')) return;
    await axios.post(`/api/club/members/${id}/revoke`);
    toast.success('Membership revoked');
    loadData();
  };
  
  return (
    <div>
      <h1>Club Members</h1>
      
      {requests.length > 0 && (
        <div className="section">
          <h3>Pending Requests ({requests.length})</h3>
          {requests.map(r => (
            <div key={r.id} className="card row">
              <span>{r.username}</span>
              <div className="actions">
                <button className="btn btn-sm btn-success" onClick={() => handleApprove(r.id)}><FaCheck /></button>
                <button className="btn btn-sm btn-danger" onClick={() => handleReject(r.id)}><FaTimes /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="section">
        <h3>Members ({members.length})</h3>
        {members.map(m => (
          <div key={m.id} className="card row">
            <span>{m.username}</span>
            <button className="btn btn-sm btn-danger" onClick={() => handleRevoke(m.id)}>Revoke</button>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .section { margin-bottom: 24px; }
        .section h3 { margin-bottom: 12px; }
        .card.row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; margin-bottom: 8px; }
        .actions { display: flex; gap: 8px; }
      `}</style>
    </div>
  );
};

const TournamentAdmin = () => {
  const [tournaments, setTournaments] = useState([]);
  const [creating, setCreating] = useState(false);
  
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = () => {
    axios.get('/api/tournaments').then(r => setTournaments(r.data));
  };

  const createOfficialTournament = async () => {
    if (!window.confirm('Create the Official Back-to-School Tournament?\n\n🏆 Riddick from G5-1\'s Official Tournament\n⏱️ 10 min games, 8hr forfeit window\n📅 Jan 5-9 signup, Jan 9-11 games')) return;
    
    setCreating(true);
    try {
      const res = await axios.post('/api/tournaments/create-official-tournament');
      toast.success('🏆 Tournament created!');
      loadTournaments();
      alert(`✅ Tournament created!\n\nID: ${res.data.tournament.id}\nView at: /tournament/${res.data.tournament.id}\n\nShare with students!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const deleteTournament = async (id, name) => {
    if (!window.confirm(`🗑️ DELETE tournament?\n\n"${name}"\n\nThis cannot be undone!`)) return;
    try {
      await axios.delete(`/api/tournaments/${id}`);
      toast.success('Tournament deleted');
      loadTournaments();
    } catch (err) {
      toast.error('Failed to delete tournament');
    }
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>Tournaments</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={createOfficialTournament} 
            disabled={creating}
            className="btn"
            style={{ background: '#10b981', color: 'white', fontWeight: 'bold' }}
          >
            {creating ? '⏳ Creating...' : '🏆 Create Official Tournament'}
          </button>
          <Link to="/admin/riddick/tournaments/create" className="btn btn-primary">+ Custom Tournament</Link>
        </div>
      </div>
      {tournaments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p>No tournaments yet. Click the green button above to create one!</p>
        </div>
      )}
      {tournaments.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>{t.name}</h3>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {t.status} • {t.participant_count || 0} players • ID: {t.id}
            </p>
          </div>
          <button 
            onClick={() => deleteTournament(t.id, t.name)}
            className="btn btn-sm"
            style={{ background: '#ef4444', color: 'white' }}
          >
            <FaTrash /> Delete
          </button>
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
      window.location.href = '/admin/riddick/tournaments';
    } catch (err) {
      toast.error('Failed to create tournament');
    }
  };
  
  return (
    <div style={{ maxWidth: '500px' }}>
      <h1>Create Tournament</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label>Name</label><input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="form-group"><label>Description</label><textarea className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
        <div className="form-group"><label>Time Control (sec)</label><input type="number" className="form-input" value={form.timeControl} onChange={e => setForm({...form, timeControl: +e.target.value})} /></div>
        <div className="form-group"><label>Increment (sec)</label><input type="number" className="form-input" value={form.increment} onChange={e => setForm({...form, increment: +e.target.value})} /></div>
        <div className="form-group"><label>Max Players</label><input type="number" className="form-input" value={form.maxPlayers} onChange={e => setForm({...form, maxPlayers: +e.target.value})} /></div>
        <div className="form-group"><label>Rounds</label><input type="number" className="form-input" value={form.totalRounds} onChange={e => setForm({...form, totalRounds: +e.target.value})} /></div>
        <div className="form-group"><label>Start Time</label><input type="datetime-local" className="form-input" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} /></div>
        <button type="submit" className="btn btn-primary">Create Tournament</button>
      </form>
    </div>
  );
};

const ChatMonitor = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: '', limit: 100 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [usersByIp, setUsersByIp] = useState([]);

  useEffect(() => { loadChats(); }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      params.append('limit', filter.limit);
      const r = await axios.get(`/api/admin/chats?${params}`);
      setChats(r.data);
    } catch (err) {
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const lookupIP = async (ip) => {
    if (!ip || ip === 'unknown') return toast.error('No IP available');
    try {
      const r = await axios.get(`/api/admin/users-by-ip/${encodeURIComponent(ip)}`);
      setUsersByIp(r.data);
      toast.success(`Found ${r.data.length} user(s) with this IP`);
    } catch (err) {
      toast.error('IP lookup failed');
    }
  };

  const banIP = async (ip) => {
    if (!ip || ip === 'unknown') return toast.error('No IP available');
    if (!window.confirm(`Ban IP ${ip}?`)) return;
    try {
      await axios.post('/api/admin/ban-ip', { ip_address: ip, reason: 'Banned by admin' });
      toast.success(`IP ${ip} banned`);
    } catch (err) {
      toast.error('Failed to ban IP');
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString();
  };

  return (
    <div>
      <h1><FaComments /> Chat Monitor</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>View all chat messages and IP addresses</p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search messages..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
        />
        <select
          value={filter.limit}
          onChange={(e) => setFilter({ ...filter, limit: e.target.value })}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
        >
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={200}>Last 200</option>
          <option value={500}>Last 500</option>
        </select>
        <button onClick={loadChats} className="btn btn-primary"><FaSync /> Refresh</button>
      </div>

      {usersByIp.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <h3>Users with selected IP:</h3>
          {usersByIp.map(u => (
            <div key={u.id} style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{u.username} ({u.email}) - {u.message_count} messages {u.is_banned && '🚫 BANNED'}</span>
            </div>
          ))}
          <button onClick={() => setUsersByIp([])} className="btn btn-sm">Close</button>
        </div>
      )}

      {loading ? (
        <p>Loading chats...</p>
      ) : chats.length === 0 ? (
        <p>No chat messages found</p>
      ) : (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>From</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>To</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Message</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>IP</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chats.map(chat => (
                <tr key={chat.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{formatTime(chat.created_at)}</td>
                  <td style={{ padding: '10px' }}>{chat.sender_username || `User #${chat.sender_id}`}</td>
                  <td style={{ padding: '10px' }}>{chat.receiver_username || `User #${chat.receiver_id}`}</td>
                  <td style={{ padding: '10px', maxWidth: '300px', wordBreak: 'break-word' }}>{chat.content}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>{chat.ip_address || '-'}</td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => lookupIP(chat.ip_address)} className="btn btn-sm" title="Lookup IP">🔍</button>
                      <button onClick={() => banIP(chat.ip_address)} className="btn btn-sm btn-danger" title="Ban IP">🚫</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', type: 'info', isPinned: false, expiresIn: '' });
  
  useEffect(() => { loadAnnouncements(); }, []);
  
  const loadAnnouncements = async () => {
    const r = await axios.get('/api/admin/announcements');
    setAnnouncements(r.data);
  };
  
  const handleCreate = async (e) => {
    e.preventDefault();
    await axios.post('/api/admin/announcements', form);
    toast.success('Announcement created!');
    setForm({ title: '', content: '', type: 'info', isPinned: false, expiresIn: '' });
    loadAnnouncements();
  };
  
  const handleDelete = async (id) => {
    await axios.delete(`/api/admin/announcements/${id}`);
    toast.success('Deleted');
    loadAnnouncements();
  };
  
  return (
    <div>
      <h1><FaBullhorn /> Announcements</h1>
      
      <form onSubmit={handleCreate} className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <h3>Create Announcement</h3>
        <div className="form-group"><label>Title</label><input className="form-input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
        <div className="form-group"><label>Content</label><textarea className="form-input" value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group"><label>Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
            </select>
          </div>
          <div className="form-group"><label>Expires (hours)</label><input type="number" className="form-input" value={form.expiresIn} onChange={e => setForm({...form, expiresIn: e.target.value})} placeholder="Never" /></div>
        </div>
        <label><input type="checkbox" checked={form.isPinned} onChange={e => setForm({...form, isPinned: e.target.checked})} /> Pin to top</label>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>Create</button>
      </form>
      
      {announcements.map(a => (
        <div key={a.id} className="card" style={{ padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4>{a.is_pinned && '📌 '}{a.title}</h4>
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}><FaTrash /></button>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>{a.content}</p>
          <small>By {a.author_username} • {new Date(a.created_at).toLocaleDateString()}</small>
        </div>
      ))}
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
      toast.error('Health check failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!results) return;
    let text = `RIDDICK CHESS HEALTH CHECK REPORT\n================================\nTimestamp: ${results.timestamp}\nServer: ${results.server}\nDuration: ${results.duration}ms\n\nSUMMARY: ${results.summary.passed}/${results.summary.total} passed (${results.summary.passRate}%)\n\nDETAILED RESULTS:\n`;
    results.tests.forEach(t => {
      const icon = t.status === 'pass' ? '✅' : t.status === 'fail' ? '❌' : '⚠️';
      text += `${icon} [${t.category}] ${t.name}: ${t.status.toUpperCase()}`;
      if (t.details) text += ` - ${JSON.stringify(t.details)}`;
      if (t.error) text += ` - ERROR: ${t.error}`;
      text += '\n';
    });
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const filteredTests = results?.tests.filter(t => filter === 'all' || t.status === filter) || [];
  const categories = results ? [...new Set(results.tests.map(t => t.category))] : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1><FaHeartbeat /> Health Check</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={runHealthCheck} disabled={loading}>
            <FaSync className={loading ? 'spin' : ''} /> {loading ? 'Running...' : 'Run Check'}
          </button>
          {results && <button className="btn btn-secondary" onClick={copyToClipboard}>📋 Copy for Claude</button>}
        </div>
      </div>

      {results && (
        <>
          <div className="summary-cards">
            <div className="sc total"><div className="val">{results.summary.total}</div><div className="lbl">Total</div></div>
            <div className="sc pass"><div className="val">{results.summary.passed}</div><div className="lbl">Passed</div></div>
            <div className="sc fail"><div className="val">{results.summary.failed}</div><div className="lbl">Failed</div></div>
            <div className="sc warn"><div className="val">{results.summary.warnings}</div><div className="lbl">Warnings</div></div>
            <div className="sc rate"><div className="val">{results.summary.passRate}%</div><div className="lbl">Pass Rate</div></div>
          </div>

          <div style={{ margin: '16px 0', display: 'flex', gap: '8px' }}>
            {['all', 'pass', 'fail', 'warn'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'pass' ? '✅' : f === 'fail' ? '❌' : '⚠️'} {f !== 'all' && f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {categories.map(cat => {
            const tests = filteredTests.filter(t => t.category === cat);
            if (tests.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: '20px' }}>
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>{cat}</h3>
                {tests.map((t, i) => (
                  <div key={i} style={{ padding: '10px', background: 'var(--bg-card)', marginBottom: '4px', borderRadius: '4px', borderLeft: `4px solid ${t.status === 'pass' ? '#10b981' : t.status === 'fail' ? '#ef4444' : '#f59e0b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t.status === 'pass' ? <FaCheckCircle style={{color:'#10b981'}}/> : t.status === 'fail' ? <FaTimesCircle style={{color:'#ef4444'}}/> : <FaExclamationTriangle style={{color:'#f59e0b'}}/>} {t.name}</span>
                      <span style={{ fontSize: '0.75rem', color: t.status === 'pass' ? '#10b981' : t.status === 'fail' ? '#ef4444' : '#f59e0b' }}>{t.status.toUpperCase()}</span>
                    </div>
                    {t.details && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{JSON.stringify(t.details)}</div>}
                    {t.error && <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>Error: {t.error}</div>}
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      {!results && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <FaHeartbeat style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
          <h3>No Results</h3>
          <p>Click "Run Check" to test all systems</p>
        </div>
      )}

      <style jsx>{`
        .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
        .sc { background: var(--bg-card); padding: 16px; border-radius: 8px; text-align: center; }
        .sc .val { font-size: 1.5rem; font-weight: 700; }
        .sc .lbl { font-size: 0.75rem; color: var(--text-muted); }
        .sc.pass .val { color: #10b981; }
        .sc.fail .val { color: #ef4444; }
        .sc.warn .val { color: #f59e0b; }
        .sc.rate .val { color: var(--accent-primary); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Admin;
