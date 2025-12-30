import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SecretStore.css';

const SecretStoreShop = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('storeUser');
    if (!stored) {
      navigate('/hehe');
      return;
    }
    setUser(JSON.parse(stored));
    loadProducts();
  }, [navigate]);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/secret-store/products');
      const data = await res.json();
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('storeUser');
    navigate('/hehe');
  };

  if (!user) return null;


  return (
    <div className="secret-store-container" style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px' }}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: '28px' }}>🛒 Secret Store</h1>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)', marginRight: '15px' }}>Welcome, {user.name}!</span>
            <button onClick={logout} style={{ background: 'none', border: '1px solid #8b5cf6', padding: '8px 16px', borderRadius: '8px', color: '#8b5cf6', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '60px' }}>Loading products...</p>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
            <h2 style={{ marginBottom: '10px' }}>🚧 Coming Soon!</h2>
            <p>Products will be added here. Stay tuned!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
            {products.map(p => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.3s' }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '200px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🛍️</div>
                )}
                <div style={{ padding: '20px' }}>
                  <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '4px 10px', borderRadius: '20px' }}>{p.category}</span>
                  <h3 style={{ color: '#fff', margin: '12px 0 8px', fontSize: '18px' }}>{p.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 15px', minHeight: '40px' }}>{p.description || 'No description'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>R{p.price.toFixed(2)}</span>
                    <button style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', padding: '12px 24px', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Buy Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretStoreShop;
