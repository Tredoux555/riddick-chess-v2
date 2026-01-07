import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SecretStore.css';

const StoreWants = () => {
  const [user, setUser] = useState(null);
  const [wants, setWants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', image_url: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('storeUser');
    if (!stored) {
      navigate('/hehe');
      return;
    }
    setUser(JSON.parse(stored));
    loadWants();
  }, [navigate]);

  const loadWants = async () => {
    const res = await fetch('/api/store-features/wants');
    const data = await res.json();
    setWants(data.wants || []);
  };

  const submitWant = async () => {
    if (!form.title) { alert('Please enter what you want!'); return; }
    await fetch('/api/store-features/wants/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, userName: user.name, userEmail: user.email })
    });
    setForm({ title: '', description: '', image_url: '' });
    setShowForm(false);
    loadWants();
    alert('✅ Request submitted! Others can vote for it!');
  };

  const vote = async (id) => {
    await fetch('/api/store-features/wants/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    loadWants();
  };

  if (!user) return null;

  const statusColors = {
    pending: '#fbbf24',
    approved: '#22c55e',
    denied: '#ef4444',
    fulfilled: '#8b5cf6'
  };

  return (
    <div className="secret-store-container" style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 style={{ color: '#fff', margin: '0 0 5px' }}>🙏 Want Something?</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Request products you want us to sell!</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/hehe/store')} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>← Back to Store</button>
            <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#8b5cf6', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>+ Request Product</button>
          </div>
        </div>

        {showForm && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px', marginBottom: '25px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>What do you want us to sell?</h3>
            <input 
              placeholder="Product name *" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})}
              style={{ width: '100%', padding: '12px', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            />
            <textarea 
              placeholder="Description (optional) - tell us why you want it!"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              style={{ width: '100%', padding: '12px', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', height: '80px', resize: 'none' }}
            />
            <input 
              placeholder="Image URL (optional)"
              value={form.image_url}
              onChange={e => setForm({...form, image_url: e.target.value})}
              style={{ width: '100%', padding: '12px', marginBottom: '15px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={submitWant} style={{ padding: '12px 25px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Submit Request</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '12px 25px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: '15px' }}>
          {wants.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '40px' }}>No requests yet. Be the first!</p>
          ) : (
            wants.map(want => (
              <div key={want.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <button 
                  onClick={() => vote(want.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', background: 'rgba(139,92,246,0.2)', border: 'none', borderRadius: '12px', cursor: 'pointer', minWidth: '70px' }}
                >
                  <span style={{ fontSize: '24px' }}>👆</span>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '20px' }}>{want.votes}</span>
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <h3 style={{ color: '#fff', margin: 0 }}>{want.title}</h3>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: `${statusColors[want.status]}22`, color: statusColors[want.status], textTransform: 'uppercase' }}>{want.status}</span>
                  </div>
                  {want.description && <p style={{ color: 'rgba(255,255,255,0.6)', margin: '5px 0', fontSize: '14px' }}>{want.description}</p>}
                  <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '12px' }}>Requested by {want.requested_by_name}</p>
                </div>
                {want.image_url && (
                  <img src={want.image_url} alt={want.title} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreWants;


