import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaCrown, FaCalendar, FaPlus, FaTrash, FaThumbtack } from 'react-icons/fa';

const Club = () => {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('announcements');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'announcement', isPinned: false });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [c, e] = await Promise.all([
        axios.get('/api/club/content'),
        axios.get('/api/club/events')
      ]);
      setContent(c.data);
      setEvents(e.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      await axios.post('/api/club/content', {
        title: form.title, content: form.content,
        content_type: form.type, is_pinned: form.isPinned
      });
      toast.success('Created!');
      setShowModal(false);
      setForm({ title: '', content: '', type: 'announcement', isPinned: false });
      loadData();
    } catch (e) { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      await axios.delete(`/api/club/content/${id}`);
      loadData();
    } catch (e) { toast.error('Failed'); }
  };

  const announcements = content.filter(c => c.content_type === 'announcement');
  const resources = content.filter(c => c.content_type === 'resource');

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="club-page">
      <div className="club-banner">
        <FaCrown style={{ fontSize: '3rem', marginBottom: '16px' }} />
        <h1>Chess Club</h1>
        <p>Exclusive content for members</p>
      </div>

      {isAdmin && (
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginBottom: '24px' }}>
          <FaPlus /> Create Content
        </button>
      )}

      <div className="tabs">
        {['announcements', 'events', 'resources'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'announcements' && (
        <div className="content-list">
          {announcements.map(item => (
            <div key={item.id} className={`card ${item.is_pinned ? 'pinned' : ''}`}>
              {item.is_pinned && <span className="pinned-badge"><FaThumbtack /> Pinned</span>}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>{item.title}</h3>
                {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FaTrash /></button>}
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '12px 0' }}>{item.content}</p>
              <small style={{ color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString()}</small>
            </div>
          ))}
          {announcements.length === 0 && <div className="empty-state"><h3>No announcements</h3></div>}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="content-list">
          {events.map(e => (
            <div key={e.id} className="card">
              <h3>{e.title}</h3>
              <p style={{ color: 'var(--text-secondary)' }}>{e.description}</p>
              <p><FaCalendar /> {new Date(e.event_date).toLocaleString()}</p>
            </div>
          ))}
          {events.length === 0 && <div className="empty-state"><h3>No events</h3></div>}
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="content-list">
          {resources.map(item => (
            <div key={item.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3>{item.title}</h3>
                {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}><FaTrash /></button>}
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{item.content}</p>
            </div>
          ))}
          {resources.length === 0 && <div className="empty-state"><h3>No resources</h3></div>}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: '24px', maxWidth: '500px' }}>
            <h2>Create Content</h2>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="announcement">Announcement</option>
                <option value="resource">Resource</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea className="form-input" rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input type="checkbox" checked={form.isPinned} onChange={e => setForm({...form, isPinned: e.target.checked})} />
              Pin this content
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .club-page { max-width: 800px; margin: 0 auto; }
        .club-banner { text-align: center; padding: 40px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border-radius: var(--radius-lg); margin-bottom: 24px; }
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; }
        .tab { padding: 8px 16px; background: var(--bg-card); border: none; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-md); }
        .tab.active { background: var(--accent-primary); color: white; }
        .content-list { display: flex; flex-direction: column; gap: 16px; }
        .card.pinned { border-color: var(--accent-warning); }
        .pinned-badge { display: inline-flex; align-items: center; gap: 4px; color: var(--accent-warning); font-size: 0.8rem; margin-bottom: 8px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: var(--bg-card); border-radius: var(--radius-lg); width: 90%; }
      `}</style>
    </div>
  );
};

export default Club;
