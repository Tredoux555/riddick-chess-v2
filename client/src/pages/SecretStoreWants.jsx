import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/SecretStore.css';

const SecretStoreWants = () => {
  const [user, setUser] = useState(null);
  const [wants, setWants] = useState([]);
  const [votedWants, setVotedWants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('votes');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [form, setForm] = useState({ title: '', description: '', image_url: '', category: 'General' });
  const [selectedWant, setSelectedWant] = useState(null);
  const [newComment, setNewComment] = useState('');
  const { theme } = useTheme();
  const successGreen = theme === 'light' ? '#0a6e2e' : '#22c55e';
  const navigate = useNavigate();

  const categories = ['All', 'General', 'Toys', 'Games', 'Food', 'School Supplies', 'Electronics', 'Clothing', 'Other'];

  useEffect(() => {
    const stored = localStorage.getItem('storeUser');
    if (!stored) {
      navigate('/hehe');
      return;
    }
    const userData = JSON.parse(stored);
    setUser(userData);
    loadWants();
    loadVotedWants(userData.email);
  }, [navigate]);

  const loadWants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (sort) params.append('sort', sort);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      
      const res = await fetch(`/api/secret-store/wants?${params}`);
      const data = await res.json();
      setWants(data.wants || []);
    } catch (err) {
      console.log('Error loading wants');
    }
    setLoading(false);
  };

  const loadVotedWants = async (email) => {
    try {
      const res = await fetch(`/api/secret-store/wants/votes/${email}`);
      const data = await res.json();
      setVotedWants(data.votedWants || []);
    } catch (err) {
      console.log('Error loading votes');
    }
  };

  useEffect(() => {
    if (user) loadWants();
  }, [filter, sort, categoryFilter]);

  const submitWant = async () => {
    if (!form.title.trim()) {
      alert('Please enter what you want!');
      return;
    }
    try {
      const res = await fetch('/api/secret-store/wants/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          userName: user.name,
          userEmail: user.email
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Your want has been submitted! Others can now vote for it!');
        setForm({ title: '', description: '', image_url: '', category: 'General' });
        setShowSubmitForm(false);
        loadWants();
        setVotedWants([...votedWants, data.want.id]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Error submitting want');
    }
  };

  const vote = async (wantId) => {
    try {
      const res = await fetch('/api/secret-store/wants/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wantId, userEmail: user.email })
      });
      const data = await res.json();
      if (data.voted) {
        setVotedWants([...votedWants, wantId]);
        setWants(wants.map(w => w.id === wantId ? { ...w, votes: w.votes + 1 } : w));
      } else {
        setVotedWants(votedWants.filter(id => id !== wantId));
        setWants(wants.map(w => w.id === wantId ? { ...w, votes: w.votes - 1 } : w));
      }
    } catch (err) {
      alert('Error voting');
    }
  };

  const viewDetails = async (want) => {
    try {
      const res = await fetch(`/api/secret-store/wants/${want.id}`);
      const data = await res.json();
      setSelectedWant({ ...data.want, comments: data.comments });
    } catch (err) {
      console.log('Error loading details');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch('/api/secret-store/wants/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wantId: selectedWant.id,
          userName: user.name,
          userEmail: user.email,
          comment: newComment
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedWant({
          ...selectedWant,
          comments: [data.comment, ...selectedWant.comments]
        });
        setNewComment('');
      }
    } catch (err) {
      alert('Error adding comment');
    }
  };

  const logout = () => {
    localStorage.removeItem('storeUser');
    navigate('/hehe');
  };

  if (!user) return null;

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' };
  const btnStyle = { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' };

  return (
    <div className="secret-store-container" style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ color: '#fff', margin: 0, fontSize: '28px' }}>🌟 I Want This!</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '5px 0 0' }}>Request products & vote for what you want!</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <Link to="/hehe/store" style={{ ...btnStyle, background: '#8b5cf6', color: '#fff', textDecoration: 'none' }}>🛒 Back to Store</Link>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hi, {user.name}!</span>
            <button onClick={logout} style={{ background: 'none', border: '1px solid #8b5cf6', padding: '8px 16px', borderRadius: '8px', color: '#8b5cf6', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>

        {/* Submit Want Button */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            style={{ ...btnStyle, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontSize: '16px', padding: '15px 30px' }}
          >
            {showSubmitForm ? '✕ Cancel' : '✨ I Want Something!'}
          </button>
        </div>

        {/* Submit Form */}
        {showSubmitForm && (
          <div style={{ background: 'rgba(245,158,11,0.1)', padding: '25px', borderRadius: '12px', marginBottom: '25px', border: '1px solid rgba(245,158,11,0.3)' }}>
            <h2 style={{ color: '#f59e0b', marginBottom: '15px' }}>✨ What do you want?</h2>
            <input 
              style={inputStyle} 
              placeholder="What do you want? (e.g., 'Rubik's Cube', 'Pokemon Cards') *" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
            />
            <textarea 
              style={{...inputStyle, height: '80px', resize: 'none'}} 
              placeholder="Tell us more about it... Why do you want it? Any specific brand/type?" 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})} 
            />
            <input 
              style={inputStyle} 
              placeholder="Image URL (optional - paste a link to a picture)" 
              value={form.image_url} 
              onChange={e => setForm({...form, image_url: e.target.value})} 
            />
            <select 
              style={inputStyle} 
              value={form.category} 
              onChange={e => setForm({...form, category: e.target.value})}
            >
              {categories.filter(c => c !== 'All').map(c => (
                <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c}</option>
              ))}
            </select>
            <button onClick={submitWant} style={{ ...btnStyle, background: '#22c55e', color: '#fff', width: '100%', marginTop: '10px' }}>
              🚀 Submit My Want!
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setFilter('all')} style={{ ...btnStyle, background: filter === 'all' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>All</button>
            <button onClick={() => setFilter('pending')} style={{ ...btnStyle, background: filter === 'pending' ? '#fbbf24' : 'rgba(255,255,255,0.1)', color: '#fff' }}>🔥 Wanted</button>
            <button onClick={() => setFilter('fulfilled')} style={{ ...btnStyle, background: filter === 'fulfilled' ? '#22c55e' : 'rgba(255,255,255,0.1)', color: '#fff' }}>✅ Fulfilled</button>
          </div>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
          >
            <option value="votes" style={{ background: '#1a1a2e' }}>🔥 Most Wanted</option>
            <option value="newest" style={{ background: '#1a1a2e' }}>🆕 Newest</option>
            <option value="oldest" style={{ background: '#1a1a2e' }}>📜 Oldest</option>
          </select>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
          >
            {categories.map(c => (
              <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c}</option>
            ))}
          </select>
        </div>

        {/* Wants Grid */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '60px' }}>Loading wants...</p>
        ) : wants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.7)' }}>
            <h2 style={{ marginBottom: '10px' }}>🤷 No wants yet!</h2>
            <p>Be the first to request something!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {wants.map(want => (
              <div key={want.id} style={{ 
                background: want.status === 'fulfilled' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', 
                borderRadius: '15px', 
                overflow: 'hidden', 
                border: want.status === 'fulfilled' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                position: 'relative'
              }}>
                {/* Status Badge */}
                {want.status === 'fulfilled' && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#22c55e', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    ✅ FULFILLED
                  </div>
                )}
                
                {/* Image */}
                {want.image_url ? (
                  <img src={want.image_url} alt={want.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                ) : (
                  <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, #f59e0b20, #d9770620)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🌟</div>
                )}
                
                <div style={{ padding: '20px' }}>
                  <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '4px 10px', borderRadius: '20px' }}>{want.category}</span>
                  <h3 style={{ color: '#fff', margin: '12px 0 8px', fontSize: '18px' }}>{want.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 10px', minHeight: '40px' }}>
                    {want.description ? (want.description.length > 100 ? want.description.substring(0, 100) + '...' : want.description) : 'No description'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: '0 0 15px' }}>
                    Requested by <strong style={{ color: '#f59e0b' }}>{want.requested_by_name}</strong>
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Vote Button */}
                    <button 
                      onClick={() => vote(want.id)}
                      disabled={want.status === 'fulfilled'}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 20px',
                        background: votedWants.includes(want.id) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '25px',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: want.status === 'fulfilled' ? 'default' : 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{votedWants.includes(want.id) ? '🔥' : '👍'}</span>
                      <span>{want.votes}</span>
                    </button>
                    
                    {/* Details Button */}
                    <button 
                      onClick={() => viewDetails(want)}
                      style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                      💬 Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedWant && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: '#1a1a2e', borderRadius: '15px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h2 style={{ color: '#fff', margin: 0 }}>{selectedWant.title}</h2>
                <button onClick={() => setSelectedWant(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
              </div>
              
              {selectedWant.image_url && (
                <img src={selectedWant.image_url} alt={selectedWant.title} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', marginBottom: '20px' }} />
              )}
              
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '15px' }}>{selectedWant.description || 'No description'}</p>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>{selectedWant.category}</span>
                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>🔥 {selectedWant.votes} votes</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>by {selectedWant.requested_by_name}</span>
              </div>
              
              {selectedWant.status === 'fulfilled' && (
                <div style={{ background: 'rgba(34,197,94,0.1)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <p style={{ color: successGreen, margin: 0, fontWeight: 'bold' }}>✅ This want has been fulfilled!</p>
                  {selectedWant.admin_notes && <p style={{ color: 'rgba(255,255,255,0.6)', margin: '10px 0 0', fontSize: '14px' }}>{selectedWant.admin_notes}</p>}
                </div>
              )}
              
              {/* Comments Section */}
              <h3 style={{ color: '#fff', marginBottom: '15px' }}>💬 Comments ({selectedWant.comments?.length || 0})</h3>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  style={{ flex: 1, padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                />
                <button onClick={addComment} style={{ ...btnStyle, background: '#8b5cf6', color: '#fff' }}>Send</button>
              </div>
              
              {selectedWant.comments?.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>No comments yet. Be the first!</p>
              ) : (
                selectedWant.comments?.map(c => (
                  <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                    <p style={{ color: '#f59e0b', margin: '0 0 5px', fontWeight: 'bold', fontSize: '14px' }}>{c.user_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '14px' }}>{c.comment}</p>
                    <small style={{ color: 'rgba(255,255,255,0.7)' }}>{new Date(c.created_at).toLocaleString()}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretStoreWants;
