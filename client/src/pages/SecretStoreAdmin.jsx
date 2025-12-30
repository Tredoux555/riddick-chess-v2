import React, { useState, useEffect } from 'react';
import '../styles/SecretStore.css';

const SecretStoreAdmin = () => {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [defaultCurrency, setDefaultCurrency] = useState('CNY');
  
  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', image: '', category: 'General' });

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
    setLoggedIn(true);
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
    await fetch('/api/secret-store/admin/products/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, ...productForm })
    });
    setProductForm({ name: '', description: '', price: '', image: '', category: 'General' });
    setShowAddProduct(false);
    loadProducts();
  };

  const updateProduct = async () => {
    await fetch('/api/secret-store/admin/products/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: password, id: editingProduct.id, ...productForm })
    });
    setEditingProduct(null);
    setProductForm({ name: '', description: '', price: '', image: '', category: 'General' });
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
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('/api/secret-store/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProductForm({ ...productForm, image: data.url });
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err) {
      alert('Upload error');
    }
  };


  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image: product.image || '',
      category: product.category || 'General'
    });
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
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <button onClick={() => setTab('users')} style={{ ...btnStyle, background: tab === 'users' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>👥 Users</button>
          <button onClick={() => setTab('products')} style={{ ...btnStyle, background: tab === 'products' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>🛍️ Products ({products.length})</button>
          <button onClick={() => setTab('settings')} style={{ ...btnStyle, background: tab === 'settings' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: '#fff' }}>⚙️ Settings</button>
        </div>

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
              <button onClick={() => { setShowAddProduct(true); setEditingProduct(null); setProductForm({ name: '', description: '', price: '', image: '', category: 'General' }); }} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>➕ Add Product</button>
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
                    <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '4px 8px', borderRadius: '4px' }}>{p.category}</span>
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
      </div>
    </div>
  );
};

export default SecretStoreAdmin;
