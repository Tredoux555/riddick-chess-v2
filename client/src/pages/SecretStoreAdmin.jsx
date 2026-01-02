import React, { useState, useEffect } from 'react';
import '../styles/SecretStore.css';

const SecretStoreAdmin = () => {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState('orders');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [defaultCurrency, setDefaultCurrency] = useState('CNY');
  
  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', image: '', category: 'General', stock: '10', sale_price: '' });
  
  // Discounts
  const [discounts, setDiscounts] = useState([]);
  const [discountForm, setDiscountForm] = useState({ code: '', percent_off: '', uses_left: '-1' });

  // New store features
  const [wants, setWants] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReply, setChatReply] = useState('');
  const [loyaltyUsers, setLoyaltyUsers] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '', type: 'info' });
  const [flashSaleForm, setFlashSaleForm] = useState({ product_name: '', original_price: '', sale_price: '', ends_at: '' });

  const currencies = ['CNY', 'USD', 'EUR', 'GBP', 'ZAR', 'JPY', 'KRW', 'INR', 'AUD', 'CAD'];
  const currencyNames = {
    CNY: '¥ Chinese Yuan',
    USD: '$ US Dollar',
    EUR: '€ Euro',
    GBP: '£ British Pound',
    ZAR: 'R South African Rand',
    JPY: '¥ Japanese Yen',
    KRW: '₩ Korean Won',
    INR: '₹ Indian Rupee',
    AUD: 'A$ Australian Dollar',
    CAD: 'C$ Canadian Dollar'
  };

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
    loadProducts();
    loadSettings();
    loadOrders();
    loadDiscounts();
    setLoggedIn(true);
    loadWants();
    loadFlashSales();
    loadAnnouncements();
    loadChats();
    loadLoyalty();
  };

  const loadDiscounts = async () => {
    const res = await fetch(`/api/secret-store/admin/discounts?pass=${password}`);
    const data = await res.json();
    setDiscounts(data.discounts || []);
  };

  const addDiscount = async () => {
    if (!discountForm.code || !discountForm.percent_off) { alert('Code and percent required'); return; }
    await fetch('/api/secret-store/admin/discounts/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, ...discountForm, uses_left: parseInt(discountForm.uses_left) })
    });
    setDiscountForm({ code: '', percent_off: '', uses_left: '-1' });
    loadDiscounts();
  };

  const toggleDiscount = async (id) => {
    await fetch('/api/secret-store/admin/discounts/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadDiscounts();
  };

  const deleteDiscount = async (id) => {
    if (!window.confirm('Delete this discount code?')) return;
    await fetch('/api/secret-store/admin/discounts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadDiscounts();
  };

  const loadOrders = async () => {
    const res = await fetch(`/api/secret-store/admin/orders?pass=${password}`);
    const data = await res.json();
    setOrders(data.orders || []);
  };

  const markDelivered = async (id) => {
    await fetch('/api/secret-store/admin/orders/deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadOrders();
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order?')) return;
    await fetch('/api/secret-store/admin/orders/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadOrders();
  };

  const loadSettings = async () => {
    const res = await fetch('/api/secret-store/settings');
    const data = await res.json();
    setDefaultCurrency(data.defaultCurrency || 'CNY');
  };

  const updateCurrency = async (newCurrency) => {
    await fetch('/api/secret-store/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, defaultCurrency: newCurrency })
    });
    setDefaultCurrency(newCurrency);
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

  const loadProducts = async () => {
    const res = await fetch(`/api/secret-store/admin/products?pass=${password}`);
    const data = await res.json();
    setProducts(data.products || []);
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

  // Product functions
  const addProduct = async () => {
    if (!productForm.name || !productForm.price) { alert('Name and price required'); return; }
    try {
      const res = await fetch('/api/secret-store/admin/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass: password, ...productForm })
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Error: ' + (data.error || 'Failed to add product'));
        return;
      }
      alert('✅ Product added successfully!');
      setProductForm({ name: '', description: '', price: '', image: '', category: 'General', stock: '10', sale_price: '' });
      setShowAddProduct(false);
      loadProducts();
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const updateProduct = async () => {
    await fetch('/api/secret-store/admin/products/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id: editingProduct.id, ...productForm })
    });
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', image: '', category: 'General', stock: '10', sale_price: '' });
    loadProducts();
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await fetch('/api/secret-store/admin/products/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadProducts();
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large! Max 5MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      alert('Uploading image...');
      const res = await fetch('/api/secret-store/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProductForm(prev => ({ ...prev, image: data.url }));
        alert('✅ Image uploaded! Now click Add to save the product.');
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  };


  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image: product.image || '',
      category: product.category || 'General',
      stock: (product.stock || 0).toString(),
      sale_price: product.sale_price ? product.sale_price.toString() : ''
    });
  };

  // New store features functions
  const loadWants = async () => {
    const res = await fetch('/api/store-features/wants');
    const data = await res.json();
    setWants(data.wants || []);
  };

  const loadFlashSales = async () => {
    const res = await fetch('/api/store-features/flash-sales');
    const data = await res.json();
    setFlashSales(data.sales || []);
  };

  const loadAnnouncements = async () => {
    const res = await fetch('/api/store-features/announcements');
    const data = await res.json();
    setAnnouncements(data.announcements || []);
  };

  const loadChats = async () => {
    const res = await fetch(`/api/store-features/admin/chat?pass=${password}`);
    const data = await res.json();
    setChats(data.chats || []);
  };

  const loadLoyalty = async () => {
    const res = await fetch(`/api/store-features/admin/loyalty?pass=${password}`);
    const data = await res.json();
    setLoyaltyUsers(data.users || []);
  };

  const loadChatMessages = async (email) => {
    const res = await fetch(`/api/store-features/chat/${email}`);
    const data = await res.json();
    setChatMessages(data.messages || []);
    setSelectedChat(email);
  };

  const updateWantStatus = async (id, status) => {
    try {
      const res = await fetch('/api/store-features/admin/wants/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass: password, id, status })
      });
      if (res.ok) {
        alert('✅ Status updated to: ' + status);
        loadWants();
      } else {
        alert('❌ Failed to update');
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const addAnnouncement = async () => {
    if (!announcementForm.title) return;
    await fetch('/api/store-features/admin/announcements/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, ...announcementForm })
    });
    setAnnouncementForm({ title: '', message: '', type: 'info' });
    loadAnnouncements();
  };

  const deleteAnnouncement = async (id) => {
    await fetch('/api/store-features/admin/announcements/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadAnnouncements();
  };

  const addFlashSale = async () => {
    if (!flashSaleForm.product_name || !flashSaleForm.sale_price) return;
    await fetch('/api/store-features/admin/flash-sales/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, ...flashSaleForm, starts_at: new Date().toISOString(), ends_at: flashSaleForm.ends_at || new Date(Date.now() + 24*60*60*1000).toISOString() })
    });
    setFlashSaleForm({ product_name: '', original_price: '', sale_price: '', ends_at: '' });
    loadFlashSales();
  };

  const deleteFlashSale = async (id) => {
    await fetch('/api/store-features/admin/flash-sales/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id })
    });
    loadFlashSales();
  };

  const sendChatReply = async () => {
    if (!chatReply.trim() || !selectedChat) return;
    await fetch('/api/store-features/admin/chat/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, userEmail: selectedChat, message: chatReply })
    });
    setChatReply('');
    loadChatMessages(selectedChat);
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

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' };
  const btnStyle = { padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' };


  return (
    <div className="secret-store-container">
      <div style={{ maxWidth: '1000px', width: '100%', padding: '20px' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px' }}>👑 Secret Store Admin</h1>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <button onClick={() => setTab('orders')} style={{ ...btnStyle, background: tab === 'orders' ? '#22c55e' : 'rgba(255,255,255,0.1)', color: '#fff' }}>📦 Orders ({orders.filter(o => o.status === 'pending').length})</button>
          <button onClick={() => setTab('users')} style={{ ...btnStyle, background: tab === 'users' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>👥 Users</button>
          <button onClick={() => setTab('products')} style={{ ...btnStyle, background: tab === 'products' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>🛍️ Products ({products.length})</button>
          <button onClick={() => setTab('discounts')} style={{ ...btnStyle, background: tab === 'discounts' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: '#fff' }}>🎟️ Discounts ({discounts.length})</button>
          <button onClick={() => setTab('wants')} style={{ ...btnStyle, background: tab === 'wants' ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: '#fff' }}>🙏 Wants ({wants.filter(w => w.status === 'pending').length})</button>
          <button onClick={() => setTab('flash')} style={{ ...btnStyle, background: tab === 'flash' ? '#ef4444' : 'rgba(255,255,255,0.1)', color: '#fff' }}>⚡ Flash Sales</button>
          <button onClick={() => setTab('announce')} style={{ ...btnStyle, background: tab === 'announce' ? '#22c55e' : 'rgba(255,255,255,0.1)', color: '#fff' }}>📢 Announcements</button>
          <button onClick={() => setTab('loyalty')} style={{ ...btnStyle, background: tab === 'loyalty' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>⭐ Loyalty</button>
          <button onClick={() => setTab('chat')} style={{ ...btnStyle, background: tab === 'chat' ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>💬 Chat ({chats.length})</button>
          <button onClick={() => setTab('settings')} style={{ ...btnStyle, background: tab === 'settings' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>⚙️ Settings</button>
        </div>

        {tab === 'orders' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={loadOrders} style={{ ...btnStyle, background: '#333', color: '#fff' }}>🔄 Refresh</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(251,191,36,0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#fbbf24', margin: '0 0 5px' }}>{orders.filter(o => o.status === 'pending').length}</h3>
                <p style={{ color: '#fff', margin: 0 }}>Pending</p>
              </div>
              <div style={{ background: 'rgba(34,197,94,0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '36px', color: '#22c55e', margin: '0 0 5px' }}>{orders.filter(o => o.status === 'delivered').length}</h3>
                <p style={{ color: '#fff', margin: 0 }}>Delivered</p>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '30px', color: '#8b5cf6', margin: '0 0 5px' }}>¥{orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseFloat(o.product_price), 0).toFixed(2)}</h3>
                <p style={{ color: '#fff', margin: 0 }}>💰 Revenue</p>
              </div>
              <div style={{ background: 'rgba(99,102,241,0.1)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '30px', color: '#6366f1', margin: '0 0 5px' }}>¥{orders.reduce((sum, o) => sum + parseFloat(o.product_price), 0).toFixed(2)}</h3>
                <p style={{ color: '#fff', margin: 0 }}>📊 Total Sales</p>
              </div>
            </div>

            <h2 style={{ color: '#fff', marginBottom: '15px' }}>📦 Pending Orders</h2>
            {orders.filter(o => o.status === 'pending').length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>No pending orders</p>
            ) : (
              orders.filter(o => o.status === 'pending').map(order => (
                <div key={order.id} style={{ background: 'rgba(251,191,36,0.1)', padding: '20px', borderRadius: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h3 style={{ color: '#fff', margin: '0 0 5px' }}>{order.product_name}</h3>
                    <p style={{ color: '#fbbf24', fontSize: '20px', fontWeight: 'bold', margin: '0 0 5px' }}>¥{parseFloat(order.product_price).toFixed(2)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 5px' }}>👤 {order.buyer_name} ({order.buyer_email})</p>
                    <small style={{ color: 'rgba(255,255,255,0.4)' }}>Ordered: {new Date(order.ordered_at).toLocaleString()}</small>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => markDelivered(order.id)} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>✅ Mark Delivered</button>
                    <button onClick={() => deleteOrder(order.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
                  </div>
                </div>
              ))
            )}

            <h2 style={{ color: '#fff', margin: '30px 0 15px' }}>✅ Delivered Orders</h2>
            {orders.filter(o => o.status === 'delivered').length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>No delivered orders yet</p>
            ) : (
              orders.filter(o => o.status === 'delivered').map(order => (
                <div key={order.id} style={{ background: 'rgba(34,197,94,0.1)', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#fff' }}>{order.product_name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '15px' }}>¥{parseFloat(order.product_price).toFixed(2)}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '15px' }}>{order.buyer_name}</span>
                  </div>
                  <button onClick={() => deleteOrder(order.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '5px 15px' }}>🗑</button>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'settings' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>⚙️ Store Settings</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '10px' }}>Default Currency (prices are stored in this currency)</label>
              <select 
                value={defaultCurrency} 
                onChange={(e) => updateCurrency(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '250px' }}
              >
                {currencies.map(c => (
                  <option key={c} value={c} style={{ background: '#1a1a2e' }}>{currencyNames[c]}</option>
                ))}
              </select>
            </div>
            
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              💡 Tip: Set your default currency to where you price your products. Customers can switch currencies in the store and see converted prices.
            </p>
          </div>
        )}

        {tab === 'discounts' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>🎟️ Discount Codes</h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>➕ Add New Code</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input style={{ ...inputStyle, flex: 1, minWidth: '150px' }} placeholder="Code (e.g. NEWYEAR10)" value={discountForm.code} onChange={e => setDiscountForm({...discountForm, code: e.target.value})} />
                <input style={{ ...inputStyle, width: '100px' }} placeholder="% Off" type="number" min="1" max="100" value={discountForm.percent_off} onChange={e => setDiscountForm({...discountForm, percent_off: e.target.value})} />
                <input style={{ ...inputStyle, width: '120px' }} placeholder="Uses (-1=∞)" type="number" value={discountForm.uses_left} onChange={e => setDiscountForm({...discountForm, uses_left: e.target.value})} />
                <button onClick={addDiscount} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>Add</button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '8px' }}>Uses: -1 means unlimited uses</p>
            </div>
            
            <h3 style={{ color: '#fff', marginBottom: '10px' }}>Active Codes</h3>
            {discounts.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>No discount codes yet</p>
            ) : (
              discounts.map(d => (
                <div key={d.id} style={{ background: d.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '18px' }}>{d.code}</span>
                    <span style={{ color: '#22c55e', marginLeft: '15px' }}>{d.percent_off}% OFF</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '15px' }}>Uses left: {d.uses_left === -1 ? '∞' : d.uses_left}</span>
                    {!d.active && <span style={{ color: '#ef4444', marginLeft: '15px' }}>(Disabled)</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => toggleDiscount(d.id)} style={{ ...btnStyle, background: d.active ? '#ef4444' : '#22c55e', color: '#fff' }}>{d.active ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => deleteDiscount(d.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'users' && (
          <>
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
            <button onClick={loadUsers} style={{ ...btnStyle, background: '#333', color: '#fff', marginBottom: '20px' }}>🔄 Refresh</button>
            
            <h2 style={{ color: '#fff', marginBottom: '15px' }}>⏳ Pending ({pending.length})</h2>
            {pending.map(u => (
              <div key={u.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#fff' }}>{u.name}</strong> - <span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.email}</span>
                  {u.reason && <p style={{ color: 'rgba(255,255,255,0.4)', margin: '5px 0 0', fontSize: '14px' }}>"{u.reason}"</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => approve(u.id)} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>✓</button>
                  <button onClick={() => reject(u.id)} style={{ ...btnStyle, background: '#ef4444', color: '#fff' }}>✗</button>
                  <button onClick={() => deleteUser(u.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
                </div>
              </div>
            ))}

            
            <h2 style={{ color: '#fff', margin: '30px 0 15px' }}>✅ Approved ({approved.length})</h2>
            {approved.map(u => (
              <div key={u.id} style={{ background: 'rgba(34,197,94,0.1)', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><strong style={{ color: '#fff' }}>{u.name}</strong> - <span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.email}</span></div>
                <button onClick={() => deleteUser(u.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
              </div>
            ))}
            
            <h2 style={{ color: '#fff', margin: '30px 0 15px' }}>❌ Rejected ({rejected.length})</h2>
            {rejected.map(u => (
              <div key={u.id} style={{ background: 'rgba(239,68,68,0.1)', padding: '15px', borderRadius: '12px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><strong style={{ color: '#fff' }}>{u.name}</strong> - <span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.email}</span></div>
                <button onClick={() => deleteUser(u.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
              </div>
            ))}
          </>
        )}


        {tab === 'products' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => { setShowAddProduct(true); setEditingProduct(null); setProductForm({ name: '', description: '', price: '', image: '', category: 'General', stock: '10', sale_price: '' }); }} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>➕ Add Product</button>
              <button onClick={loadProducts} style={{ ...btnStyle, background: '#333', color: '#fff' }}>🔄 Refresh</button>
            </div>

            {/* Add/Edit Product Form */}
            {(showAddProduct || editingProduct) && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', marginBottom: '15px' }}>{editingProduct ? '✏️ Edit Product' : '➕ Add Product'}</h3>
                <input style={inputStyle} placeholder="Product name *" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                <textarea style={{...inputStyle, height: '80px', resize: 'none'}} placeholder="Description" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
                <input style={inputStyle} placeholder="Price in ¥ CNY * (e.g. 99.99)" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                
                {/* Image Upload */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>Product Image</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ ...btnStyle, background: '#8b5cf6', color: '#fff', cursor: 'pointer' }}>
                      📷 Upload Image
                      <input type="file" accept="image/*" onChange={uploadImage} style={{ display: 'none' }} />
                    </label>
                    {productForm.image && <span style={{ color: '#22c55e' }}>✓ Image uploaded</span>}
                  </div>
                  {productForm.image && (
                    <div style={{ marginTop: '10px' }}>
                      <img src={productForm.image} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                      <button onClick={() => setProductForm({...productForm, image: ''})} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕ Remove</button>
                    </div>
                  )}
                </div>
                
                <select style={inputStyle} value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                  <option value="General">General</option>
                  <option value="Chess Sets">Chess Sets</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Digital">Digital</option>
                </select>
                <input style={inputStyle} placeholder="Stock quantity" type="number" min="0" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                <input style={inputStyle} placeholder="Sale price ¥ (optional - leave empty for no sale)" type="number" step="0.01" value={productForm.sale_price} onChange={e => setProductForm({...productForm, sale_price: e.target.value})} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={editingProduct ? updateProduct : addProduct} style={{ ...btnStyle, background: '#8b5cf6', color: '#fff' }}>{editingProduct ? 'Update' : 'Add'}</button>
                  <button onClick={() => { setShowAddProduct(false); setEditingProduct(null); }} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Cancel</button>
                </div>
              </div>
            )}


            {/* Product List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {products.map(p => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                  {p.image && <img src={p.image} alt={p.name} style={{ width: '100%', height: '150px', objectFit: 'cover', background: '#222' }} />}
                  {!p.image && <div style={{ width: '100%', height: '150px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>No image</div>}
                  <div style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '4px 8px', borderRadius: '4px' }}>{p.category}</span>
                      <span style={{ fontSize: '12px', background: p.stock > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: p.stock > 0 ? '#22c55e' : '#ef4444', padding: '4px 8px', borderRadius: '4px' }}>📦 {p.stock || 0} in stock</span>
                    </div>
                    <h3 style={{ color: '#fff', margin: '10px 0 5px' }}>{p.name}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '0 0 10px' }}>{p.description || 'No description'}</p>
                    <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold', margin: '0 0 15px' }}>¥{p.price.toFixed(2)} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>CNY</span></p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => startEditProduct(p)} style={{ ...btnStyle, flex: 1, background: '#8b5cf6', color: '#fff' }}>✏️ Edit</button>
                      <button onClick={() => deleteProduct(p.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {products.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px' }}>No products yet. Add your first product!</p>}
          </>
        )}

        {tab === 'wants' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>🙏 Product Requests</h2>
            {wants.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>No requests yet</p>
            ) : (
              wants.map(want => (
                <div key={want.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ color: '#fff', margin: '0 0 5px' }}>{want.title}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '14px' }}>{want.description}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: '5px 0 0', fontSize: '12px' }}>By: {want.requested_by_name} | Votes: {want.votes} | Status: {want.status}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => updateWantStatus(want.id, 'approved')} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>✓ Approve</button>
                    <button onClick={() => updateWantStatus(want.id, 'denied')} style={{ ...btnStyle, background: '#ef4444', color: '#fff' }}>✗ Deny</button>
                    <button onClick={() => updateWantStatus(want.id, 'fulfilled')} style={{ ...btnStyle, background: '#8b5cf6', color: '#fff' }}>✓ Done</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'flash' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>⚡ Flash Sales</h2>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>Add Flash Sale</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input placeholder="Product name" value={flashSaleForm.product_name} onChange={e => setFlashSaleForm({...flashSaleForm, product_name: e.target.value})} style={inputStyle} />
                <input placeholder="Original ¥" type="number" value={flashSaleForm.original_price} onChange={e => setFlashSaleForm({...flashSaleForm, original_price: e.target.value})} style={{ ...inputStyle, width: '100px' }} />
                <input placeholder="Sale ¥" type="number" value={flashSaleForm.sale_price} onChange={e => setFlashSaleForm({...flashSaleForm, sale_price: e.target.value})} style={{ ...inputStyle, width: '100px' }} />
                <input type="datetime-local" value={flashSaleForm.ends_at} onChange={e => setFlashSaleForm({...flashSaleForm, ends_at: e.target.value})} style={inputStyle} />
                <button onClick={addFlashSale} style={{ ...btnStyle, background: '#ef4444', color: '#fff' }}>Add Sale</button>
              </div>
            </div>
            {flashSales.map(sale => (
              <div key={sale.id} style={{ background: 'rgba(239,68,68,0.1)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#fff', margin: 0 }}>{sale.product_name}</h3>
                  <p style={{ color: '#ef4444', margin: '5px 0 0' }}>¥{sale.original_price} → ¥{sale.sale_price} | Ends: {new Date(sale.ends_at).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteFlashSale(sale.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'announce' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>📢 Announcements</h2>
            <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <input placeholder="Title" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} style={{ ...inputStyle, marginBottom: '10px' }} />
              <textarea placeholder="Message" value={announcementForm.message} onChange={e => setAnnouncementForm({...announcementForm, message: e.target.value})} style={{ ...inputStyle, height: '80px', resize: 'none', marginBottom: '10px' }} />
              <select value={announcementForm.type} onChange={e => setAnnouncementForm({...announcementForm, type: e.target.value})} style={{ ...inputStyle, marginBottom: '10px' }}>
                <option value="info">ℹ️ Info</option>
                <option value="sale">🔥 Sale</option>
                <option value="new">🆕 New</option>
                <option value="important">⚠️ Important</option>
              </select>
              <button onClick={addAnnouncement} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>Post</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} style={{ background: 'rgba(34,197,94,0.1)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#fff', margin: 0 }}>{a.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: '5px 0 0' }}>{a.message}</p>
                </div>
                <button onClick={() => deleteAnnouncement(a.id)} style={{ ...btnStyle, background: 'rgba(255,255,255,0.1)', color: '#fff' }}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'loyalty' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>⭐ Loyalty Leaderboard</h2>
            {loyaltyUsers.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>No loyalty data yet</p>
            ) : (
              loyaltyUsers.map((u, i) => (
                <div key={u.id} style={{ background: i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '24px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</span>
                    <div>
                      <h3 style={{ color: '#fff', margin: 0 }}>{u.user_name || u.user_email}</h3>
                      <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '14px' }}>{u.user_email}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#fbbf24', margin: 0, fontWeight: 'bold' }}>{u.points} pts</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>Spent: ¥{parseFloat(u.total_spent).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'chat' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>💬 Customer Chats</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ width: '200px' }}>
                {chats.map(chat => (
                  <div key={chat.user_email} onClick={() => loadChatMessages(chat.user_email)} style={{ padding: '10px', background: selectedChat === chat.user_email ? '#8b5cf6' : 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                    <p style={{ color: '#fff', margin: 0, fontWeight: 'bold' }}>{chat.user_name || 'Unknown'}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '12px' }}>{chat.user_email}</p>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                {selectedChat ? (
                  <>
                    <div style={{ height: '300px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                      {chatMessages.map(msg => (
                        <div key={msg.id} style={{ marginBottom: '10px', textAlign: msg.is_admin ? 'right' : 'left' }}>
                          <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '12px', background: msg.is_admin ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>{msg.message}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input placeholder="Reply..." value={chatReply} onChange={e => setChatReply(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatReply()} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={sendChatReply} style={{ ...btnStyle, background: '#8b5cf6', color: '#fff' }}>Send</button>
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>Select a chat to view</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretStoreAdmin;
