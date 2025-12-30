import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SecretStore.css';

const SecretStoreShop = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('storeUser');
    if (!stored) {
      navigate('/hehe');
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('storeUser');
    navigate('/hehe');
  };

  if (!user) return null;

  return (
    <div className="secret-store-container">
      <div className="secret-store-box" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0 }}>🛒 Secret Store</h1>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)', marginRight: '15px' }}>Welcome, {user.name}</span>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
          <h2>🚧 Coming Soon!</h2>
          <p>Products will be added here. Stay tuned!</p>
        </div>
      </div>
    </div>
  );
};

export default SecretStoreShop;
