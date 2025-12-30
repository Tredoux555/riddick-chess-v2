/**
 * Secret Store Routes - Using Postgres Database
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ADMIN_PASS = process.env.ADMIN_PASS || 'riddick123';

// Configure multer for memory storage (no disk needed)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});


// Currency conversion rates (from CNY)
const CURRENCY_RATES = {
  CNY: 1, USD: 0.14, EUR: 0.13, GBP: 0.11, ZAR: 2.5,
  JPY: 21, KRW: 180, INR: 11.5, AUD: 0.21, CAD: 0.19
};

const CURRENCY_SYMBOLS = {
  CNY: '¥', USD: '$', EUR: '€', GBP: '£', ZAR: 'R',
  JPY: '¥', KRW: '₩', INR: '₹', AUD: 'A$', CAD: 'C$'
};

// Initialize tables on startup
async function initTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image TEXT,
        category VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    try {
      await pool.query(`ALTER TABLE secret_store_products ALTER COLUMN image TYPE TEXT`);
      console.log('✅ Image column updated to TEXT');
    } catch (e) {
      console.log('ℹ️ Image column already TEXT or table new');
    }
    
    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_orders (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES secret_store_products(id),
        product_name VARCHAR(255),
        product_price DECIMAL(10,2),
        buyer_name VARCHAR(255),
        buyer_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        ordered_at TIMESTAMP DEFAULT NOW(),
        delivered_at TIMESTAMP
      )
    `);
    
    // Add stock column if not exists
    await pool.query(`ALTER TABLE secret_store_products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 10`).catch(() => {});
    
    console.log('✅ Orders table ready');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT
      )
    `);
    await pool.query(`INSERT INTO secret_store_settings (key, value) VALUES ('defaultCurrency', 'CNY') ON CONFLICT (key) DO NOTHING`);
    console.log('✅ Secret Store tables initialized');
  } catch (err) {
    console.error('Secret Store DB init error:', err.message);
  }
}
initTables();


// ========== CURRENCIES ==========
router.get('/currencies', (req, res) => {
  res.json({ rates: CURRENCY_RATES, symbols: CURRENCY_SYMBOLS, available: Object.keys(CURRENCY_RATES) });
});

router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(`SELECT value FROM secret_store_settings WHERE key = 'defaultCurrency'`);
    const currency = result.rows[0]?.value || 'CNY';
    res.json({ defaultCurrency: currency, symbol: CURRENCY_SYMBOLS[currency] });
  } catch (err) {
    res.json({ defaultCurrency: 'CNY', symbol: '¥' });
  }
});

router.post('/admin/settings', async (req, res) => {
  const { pass, defaultCurrency } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`UPDATE secret_store_settings SET value = $1 WHERE key = 'defaultCurrency'`, [defaultCurrency]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USER ACCESS ==========
router.post('/request-access', async (req, res) => {
  const { name, email, reason } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  try {
    const exists = await pool.query(`SELECT * FROM secret_store_users WHERE email = $1`, [email.toLowerCase()]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Already requested', status: exists.rows[0].status });
    await pool.query(`INSERT INTO secret_store_users (name, email, reason) VALUES ($1, $2, $3)`, [name, email.toLowerCase(), reason || '']);
    res.json({ success: true, message: 'Request sent! Wait for approval.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await pool.query(`SELECT * FROM secret_store_users WHERE email = $1`, [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found. Request access first.' });
    const user = result.rows[0];
    res.json({ status: user.status, name: user.name, message: user.status === 'approved' ? 'Welcome!' : user.status === 'pending' ? 'Still waiting' : 'Denied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN USERS ==========
router.get('/admin/users', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT id, name, email, reason, status, requested_at, approved_at FROM secret_store_users ORDER BY requested_at DESC`);
    res.json({ users: result.rows.map(u => ({ ...u, requestedAt: u.requested_at, approvedAt: u.approved_at })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/approve', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`UPDATE secret_store_users SET status = 'approved', approved_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/reject', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`UPDATE secret_store_users SET status = 'rejected' WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM secret_store_users WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ========== PRODUCTS ==========
router.get('/products', async (req, res) => {
  const { currency } = req.query;
  try {
    const settingsRes = await pool.query(`SELECT value FROM secret_store_settings WHERE key = 'defaultCurrency'`);
    const targetCurrency = currency || settingsRes.rows[0]?.value || 'CNY';
    const rate = CURRENCY_RATES[targetCurrency] || 1;
    const symbol = CURRENCY_SYMBOLS[targetCurrency] || '¥';
    
    const result = await pool.query(`SELECT * FROM secret_store_products ORDER BY created_at DESC`);
    const products = result.rows.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      originalPrice: parseFloat(p.price),
      price: parseFloat((p.price * rate).toFixed(2)),
      image: p.image,
      category: p.category,
      stock: p.stock || 0,
      currency: targetCurrency,
      symbol: symbol
    }));
    res.json({ products, currency: targetCurrency, symbol });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/products', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT * FROM secret_store_products ORDER BY created_at DESC`);
    console.log('📦 Products loaded:', result.rows.length, 'First image length:', result.rows[0]?.image?.length || 0);
    res.json({ products: result.rows.map(p => ({ ...p, price: parseFloat(p.price), stock: p.stock || 0 })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/admin/products/add', async (req, res) => {
  const { pass, name, description, price, image, category, stock } = req.body;
  console.log('🛍️ Add product request:', name, 'Image length:', image ? image.length : 0);
  
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
  try {
    const result = await pool.query(
      `INSERT INTO secret_store_products (name, description, price, image, category, stock) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || '', parseFloat(price), image || '', category || 'General', parseInt(stock) || 10]
    );
    console.log('✅ Product saved to DB, id:', result.rows[0].id);
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products/update', async (req, res) => {
  const { pass, id, name, description, price, image, category, stock } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(
      `UPDATE secret_store_products SET name = $1, description = $2, price = $3, image = $4, category = $5, stock = $6, updated_at = NOW() WHERE id = $7`,
      [name, description || '', parseFloat(price), image || '', category || 'General', parseInt(stock) || 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM secret_store_products WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image upload - store as base64 in response (will be saved to DB with product)
router.post('/admin/upload-image', upload.single('image'), (req, res) => {
  console.log('📷 Upload request received');
  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ error: 'No image uploaded' });
  }
  
  console.log('📷 File received:', req.file.originalname, req.file.size, 'bytes');
  
  // Convert buffer to base64 data URL (memory storage)
  const base64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const dataUrl = `data:${mimeType};base64,${base64}`;
  
  console.log('✅ Base64 created, length:', dataUrl.length);
  
  res.json({ success: true, url: dataUrl });
});

// ========== ORDERS ==========

// Place an order (for approved users)
router.post('/order', async (req, res) => {
  const { productId, buyerName, buyerEmail } = req.body;
  if (!productId || !buyerName || !buyerEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Get product details
    const productRes = await pool.query(`SELECT * FROM secret_store_products WHERE id = $1`, [productId]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productRes.rows[0];
    
    // Check stock
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'Sorry, this product is sold out!' });
    }
    
    // Create order
    const result = await pool.query(
      `INSERT INTO secret_store_orders (product_id, product_name, product_price, buyer_name, buyer_email) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [productId, product.name, product.price, buyerName, buyerEmail]
    );
    
    // Decrease stock
    await pool.query(`UPDATE secret_store_products SET stock = stock - 1 WHERE id = $1`, [productId]);
    
    console.log('🛒 New order:', buyerName, 'bought', product.name, '- Stock remaining:', product.stock - 1);
    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error('❌ Order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all orders
router.get('/admin/orders', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT * FROM secret_store_orders ORDER BY ordered_at DESC`);
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Mark order as delivered
router.post('/admin/orders/deliver', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`UPDATE secret_store_orders SET status = 'delivered', delivered_at = NOW() WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete order
router.post('/admin/orders/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM secret_store_orders WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
