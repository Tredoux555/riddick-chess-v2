import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SecretStore.css';

const SecretStoreShop = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('CNY');
  const [symbol, setSymbol] = useState('¥');
  const [currencies, setCurrencies] = useState([]);
  const [buyMessage, setBuyMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('storeUser');
    if (!stored) {
      navigate('/hehe');
      return;
    }
    setUser(JSON.parse(stored));
    loadCurrencies();
    
    // Check saved currency preference
    const savedCurrency = localStorage.getItem('storeCurrency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
      loadProducts(savedCurrency);
    } else {
      loadSettings();
    }
  }, [navigate]);

  const loadSettings = async () => {
    const res = await fetch('/api/secret-store/settings');
    const data = await res.json();
    setCurrency(data.defaultCurrency);
    setSymbol(data.symbol);
    loadProducts(data.defaultCurrency);
  };

  const loadCurrencies = async () => {
    const res = await fetch('/api/secret-store/currencies');
    const data = await res.json();
    setCurrencies(data.available || []);
  };


  const loadProducts = async (cur) => {
    try {
      const res = await fetch(`/api/secret-store/products?currency=${cur || currency}`);
      const data = await res.json();
      setProducts(data.products || []);
      setSymbol(data.symbol);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('storeCurrency', newCurrency);
    loadProducts(newCurrency);
  };

  const logout = () => {
    localStorage.removeItem('storeUser');
    navigate('/hehe');
  };

  const buyProduct = (product) => {
    const today = new Date().getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const price = product.price.toFixed(2);
    
    let message;
    if (today === 0 || today === 5 || today === 6) {
      // Friday (5), Saturday (6), or Sunday (0)
      message = `Remember to bring the ${price} yuan next week Monday!`;
    } else {
      // Monday through Thursday
      message = `Remember to come to school early to deliver the ${price} yuan to school tomorrow!`;
    }
    
    setBuyMessage({ productName: product.name, message });
  };

  const closeBuyMessage = () => {
    setBuyMessage(null);
  };

  if (!user) return null;

  const currencyNames = {
    CNY: 'Chinese Yuan',
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    ZAR: 'South African Rand',
    JPY: 'Japanese Yen',
    KRW: 'Korean Won',
    INR: 'Indian Rupee',
    AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar'
  };


  return (
    <div className="secret-store-container" style={{ minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: '28px' }}>🛒 Secret Store</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {/* Currency Selector */}
            <select 
              value={currency} 
              onChange={(e) => changeCurrency(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
            >
              {currencies.map(c => (
                <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c} - {currencyNames[c]}</option>
              ))}
            </select>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Welcome, {user.name}!</span>
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
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                    <span style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>{symbol}{p.price.toFixed(2)}</span>
                    <button onClick={() => buyProduct(p)} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', padding: '12px 24px', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Buy Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buy Message Popup */}
        {buyMessage && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: '20px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', border: '1px solid rgba(139,92,246,0.3)' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ color: '#22c55e', marginBottom: '15px' }}>Order Placed!</h2>
              <h3 style={{ color: '#fff', marginBottom: '20px' }}>{buyMessage.productName}</h3>
              <p style={{ color: '#fbbf24', fontSize: '18px', lineHeight: '1.6', marginBottom: '30px' }}>{buyMessage.message}</p>
              <button onClick={closeBuyMessage} style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none', padding: '15px 40px', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>Got it! 👍</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretStoreShop;
