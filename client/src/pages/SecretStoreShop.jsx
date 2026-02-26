import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SecretStore.css';
import ChatWidget from '../components/ChatWidget';

const SecretStoreShop = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('CNY');
  const [symbol, setSymbol] = useState('¥');
  const [currencies, setCurrencies] = useState([]);
  const [buyMessage, setBuyMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [favorites, setFavorites] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [activeDiscount, setActiveDiscount] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('storeUser');
    if (!stored) {
      navigate('/hehe');
      return;
    }
    const userData = JSON.parse(stored);
    setUser(userData);
    loadCurrencies();
    loadFavorites(userData.email);
    
    // Check saved currency preference
    const savedCurrency = localStorage.getItem('storeCurrency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
      loadProducts(savedCurrency);
    } else {
      loadSettings();
    }
  }, [navigate]);

  const loadFavorites = async (email) => {
    try {
      const res = await fetch(`/api/secret-store/favorites/${email}`);
      const data = await res.json();
      setFavorites(data.favorites?.map(f => f.id) || []);
    } catch (err) {
      console.log('Could not load favorites');
    }
  };

  const toggleFavorite = async (productId) => {
    try {
      const res = await fetch('/api/secret-store/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, userEmail: user.email })
      });
      const data = await res.json();
      if (data.favorited) {
        setFavorites([...favorites, productId]);
      } else {
        setFavorites(favorites.filter(id => id !== productId));
      }
    } catch (err) {
      console.log('Error toggling favorite');
    }
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const res = await fetch('/api/secret-store/discount/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode })
      });
      const data = await res.json();
      if (data.valid) {
        setActiveDiscount(data.discount);
        alert(`✅ Discount applied! ${data.discount.percent_off}% OFF`);
      } else {
        alert('❌ Invalid or expired code');
      }
    } catch (err) {
      alert('Error checking code');
    }
  };

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

  const buyProduct = async (product) => {
    // Place the order
    try {
      const res = await fetch('/api/secret-store/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          buyerName: user.name,
          buyerEmail: user.email
        })
      });
      
      if (!res.ok) {
        alert('Failed to place order');
        return;
      }
    } catch (err) {
      alert('Error placing order');
      return;
    }
    
    // Show the message
    const today = new Date().getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const price = product.originalPrice.toFixed(2);
    
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

  // Get unique categories
  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesFavorites = !showFavoritesOnly || favorites.includes(p.id);
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  // Apply discount to price
  const getDiscountedPrice = (price) => {
    if (activeDiscount) {
      return price * (1 - activeDiscount.percent_off / 100);
    }
    return price;
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
            <button onClick={() => navigate('/hehe/wants')} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>🙏 Wants</button>
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

        {/* Discount Code */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="text"
            placeholder="🎟️ Enter discount code..."
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', width: '200px' }}
          />
          <button onClick={applyDiscount} style={{ padding: '10px 20px', background: '#f59e0b', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Apply</button>
          {activeDiscount && (
            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✅ {activeDiscount.percent_off}% OFF applied!</span>
          )}
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={{ marginLeft: 'auto', padding: '10px 20px', background: showFavoritesOnly ? '#ef4444' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}
          >
            {showFavoritesOnly ? '❤️ Favorites Only' : '🤍 Show Favorites'}
          </button>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
          <input 
            type="text"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px' }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{ 
                  padding: '10px 18px', 
                  background: categoryFilter === cat ? '#8b5cf6' : 'rgba(255,255,255,0.05)', 
                  border: categoryFilter === cat ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', 
                  color: '#fff', 
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: categoryFilter === cat ? '600' : '400'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '60px' }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.7)' }}>
            {products.length === 0 ? (
              <>
                <h2 style={{ marginBottom: '10px' }}>🚧 Coming Soon!</h2>
                <p>Products will be added here. Stay tuned!</p>
              </>
            ) : (
              <>
                <h2 style={{ marginBottom: '10px' }}>🔍 No results</h2>
                <p>Try a different search or category</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
            {filteredProducts.map(p => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                {/* Favorite Button */}
                <button 
                  onClick={() => toggleFavorite(p.id)}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px', zIndex: 10 }}
                >
                  {favorites.includes(p.id) ? '❤️' : '🤍'}
                </button>
                {/* Sale Badge */}
                {p.onSale && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}>
                    🔥 SALE
                  </div>
                )}
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '200px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🛍️</div>
                )}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '4px 10px', borderRadius: '20px' }}>{p.category}</span>
                    <span style={{ fontSize: '12px', background: p.stock > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: p.stock > 0 ? '#22c55e' : '#ef4444', padding: '4px 10px', borderRadius: '20px' }}>
                      {p.stock > 0 ? `📦 ${p.stock} left` : '❌ SOLD OUT'}
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: '18px' }}>{p.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 15px', minHeight: '40px' }}>{p.description || 'No description'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {p.onSale && (
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', textDecoration: 'line-through', marginRight: '8px' }}>{symbol}{p.regularPrice.toFixed(2)}</span>
                      )}
                      <span style={{ color: activeDiscount ? '#f59e0b' : '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>
                        {symbol}{getDiscountedPrice(p.price).toFixed(2)}
                      </span>
                      {activeDiscount && (
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginLeft: '5px' }}>(-{activeDiscount.percent_off}%)</span>
                      )}
                    </div>
                    <button 
                      onClick={() => buyProduct(p)} 
                      disabled={p.stock <= 0}
                      style={{ 
                        background: p.stock > 0 ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : '#444', 
                        border: 'none', 
                        padding: '12px 24px', 
                        borderRadius: '8px', 
                        color: '#fff', 
                        fontWeight: '600', 
                        cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                        opacity: p.stock > 0 ? 1 : 0.5
                      }}
                    >
                      {p.stock > 0 ? 'Buy Now' : 'Sold Out'}
                    </button>
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
      <ChatWidget user={user} />
    </div>
  );
};

export default SecretStoreShop;
