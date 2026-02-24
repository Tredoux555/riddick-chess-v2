/**
 * Secret Store Routes - Using Postgres Database
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ADMIN_PASS = process.env.ADMIN_PASS;
if (!ADMIN_PASS) {
  console.error('⚠️  WARNING: ADMIN_PASS environment variable is not set! Secret Store admin routes will be inaccessible.');
}

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
    
    // Add sale price column
    await pool.query(`ALTER TABLE secret_store_products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2)`).catch(() => {});
    
    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES secret_store_products(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_favorites (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES secret_store_products(id) ON DELETE CASCADE,
        user_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_id, user_email)
      )
    `);
    
    // Discount codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_discounts (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        percent_off INTEGER CHECK (percent_off >= 1 AND percent_off <= 100),
        active BOOLEAN DEFAULT true,
        uses_left INTEGER DEFAULT -1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // WANTS SYSTEM - Let customers request products!
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_wants (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        category VARCHAR(100) DEFAULT 'General',
        requested_by_name VARCHAR(255),
        requested_by_email VARCHAR(255),
        votes INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        fulfilled_product_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        fulfilled_at TIMESTAMP
      )
    `);
    
    // Track who voted on what (one vote per user per want)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_want_votes (
        id SERIAL PRIMARY KEY,
        want_id INTEGER REFERENCES secret_store_wants(id) ON DELETE CASCADE,
        user_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(want_id, user_email)
      )
    `);
    
    // Comments on wants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_store_want_comments (
        id SERIAL PRIMARY KEY,
        want_id INTEGER REFERENCES secret_store_wants(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Wants system tables ready');
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
      price: p.sale_price ? parseFloat((p.sale_price * rate).toFixed(2)) : parseFloat((p.price * rate).toFixed(2)),
      regularPrice: parseFloat((p.price * rate).toFixed(2)),
      salePrice: p.sale_price ? parseFloat((p.sale_price * rate).toFixed(2)) : null,
      onSale: !!p.sale_price,
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
    res.json({ products: result.rows.map(p => ({ ...p, price: parseFloat(p.price), stock: p.stock || 0, sale_price: p.sale_price ? parseFloat(p.sale_price) : null })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/admin/products/add', async (req, res) => {
  const { pass, name, description, price, image, category, stock, sale_price } = req.body;
  console.log('🛍️ Add product request:', name, 'Image length:', image ? image.length : 0);
  
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
  try {
    const result = await pool.query(
      `INSERT INTO secret_store_products (name, description, price, image, category, stock, sale_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description || '', parseFloat(price), image || '', category || 'General', parseInt(stock) || 10, sale_price ? parseFloat(sale_price) : null]
    );
    console.log('✅ Product saved to DB, id:', result.rows[0].id);
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products/update', async (req, res) => {
  const { pass, id, name, description, price, image, category, stock, sale_price } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(
      `UPDATE secret_store_products SET name = $1, description = $2, price = $3, image = $4, category = $5, stock = $6, sale_price = $7, updated_at = NOW() WHERE id = $8`,
      [name, description || '', parseFloat(price), image || '', category || 'General', parseInt(stock) || 0, sale_price ? parseFloat(sale_price) : null, id]
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

// ========== REVIEWS ==========
router.get('/reviews/:productId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM secret_store_reviews WHERE product_id = $1 ORDER BY created_at DESC`,
      [req.params.productId]
    );
    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg, COUNT(*) as count FROM secret_store_reviews WHERE product_id = $1`,
      [req.params.productId]
    );
    res.json({ 
      reviews: result.rows, 
      average: parseFloat(avgResult.rows[0].avg) || 0,
      count: parseInt(avgResult.rows[0].count) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reviews/add', async (req, res) => {
  const { productId, userName, userEmail, rating, comment } = req.body;
  if (!productId || !userName || !userEmail || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO secret_store_reviews (product_id, user_name, user_email, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [productId, userName, userEmail, rating, comment || '']
    );
    res.json({ success: true, review: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== FAVORITES ==========
router.get('/favorites/:email', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.* FROM secret_store_favorites f JOIN secret_store_products p ON f.product_id = p.id WHERE f.user_email = $1`,
      [req.params.email]
    );
    res.json({ favorites: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/favorites/toggle', async (req, res) => {
  const { productId, userEmail } = req.body;
  if (!productId || !userEmail) return res.status(400).json({ error: 'Missing fields' });
  try {
    const exists = await pool.query(
      `SELECT * FROM secret_store_favorites WHERE product_id = $1 AND user_email = $2`,
      [productId, userEmail]
    );
    if (exists.rows.length > 0) {
      await pool.query(`DELETE FROM secret_store_favorites WHERE product_id = $1 AND user_email = $2`, [productId, userEmail]);
      res.json({ success: true, favorited: false });
    } else {
      await pool.query(`INSERT INTO secret_store_favorites (product_id, user_email) VALUES ($1, $2)`, [productId, userEmail]);
      res.json({ success: true, favorited: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DISCOUNT CODES ==========
router.post('/discount/check', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  try {
    const result = await pool.query(
      `SELECT * FROM secret_store_discounts WHERE UPPER(code) = UPPER($1) AND active = true AND (uses_left = -1 OR uses_left > 0)`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.json({ valid: false, error: 'Invalid or expired code' });
    }
    res.json({ valid: true, discount: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/discount/use', async (req, res) => {
  const { code } = req.body;
  try {
    await pool.query(
      `UPDATE secret_store_discounts SET uses_left = uses_left - 1 WHERE UPPER(code) = UPPER($1) AND uses_left > 0`,
      [code]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Manage discount codes
router.get('/admin/discounts', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT * FROM secret_store_discounts ORDER BY created_at DESC`);
    res.json({ discounts: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/discounts/add', async (req, res) => {
  const { pass, code, percent_off, uses_left } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  if (!code || !percent_off) return res.status(400).json({ error: 'Code and percent required' });
  try {
    const result = await pool.query(
      `INSERT INTO secret_store_discounts (code, percent_off, uses_left) VALUES (UPPER($1), $2, $3) RETURNING *`,
      [code, percent_off, uses_left || -1]
    );
    res.json({ success: true, discount: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/discounts/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM secret_store_discounts WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/discounts/toggle', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`UPDATE secret_store_discounts SET active = NOT active WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NOTIFICATIONS ==========
router.get('/admin/notifications', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const pendingOrders = await pool.query(`SELECT COUNT(*) FROM secret_store_orders WHERE status = 'pending'`);
    const pendingUsers = await pool.query(`SELECT COUNT(*) FROM secret_store_users WHERE status = 'pending'`);
    res.json({ 
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      pendingUsers: parseInt(pendingUsers.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== WANTS SYSTEM ==========

// Get all wants (public - for store)
router.get('/wants', async (req, res) => {
  const { status, sort, category } = req.query;
  try {
    let query = `SELECT * FROM secret_store_wants`;
    const conditions = [];
    const params = [];
    
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }
    
    // Sort options
    if (sort === 'votes') {
      query += ` ORDER BY votes DESC, created_at DESC`;
    } else if (sort === 'oldest') {
      query += ` ORDER BY created_at ASC`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }
    
    const result = await pool.query(query, params);
    res.json({ wants: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single want with comments
router.get('/wants/:id', async (req, res) => {
  try {
    const want = await pool.query(`SELECT * FROM secret_store_wants WHERE id = $1`, [req.params.id]);
    if (want.rows.length === 0) {
      return res.status(404).json({ error: 'Want not found' });
    }
    const comments = await pool.query(
      `SELECT * FROM secret_store_want_comments WHERE want_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ want: want.rows[0], comments: comments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a new want
router.post('/wants/submit', async (req, res) => {
  const { title, description, image_url, category, userName, userEmail } = req.body;
  if (!title || !userName || !userEmail) {
    return res.status(400).json({ error: 'Title, name and email required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO secret_store_wants (title, description, image_url, category, requested_by_name, requested_by_email) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || '', image_url || '', category || 'General', userName, userEmail]
    );
    // Auto-vote for your own want
    await pool.query(
      `INSERT INTO secret_store_want_votes (want_id, user_email) VALUES ($1, $2)`,
      [result.rows[0].id, userEmail]
    );
    console.log('🌟 New want submitted:', title, 'by', userName);
    res.json({ success: true, want: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote on a want
router.post('/wants/vote', async (req, res) => {
  const { wantId, userEmail } = req.body;
  if (!wantId || !userEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    // Check if already voted
    const existing = await pool.query(
      `SELECT * FROM secret_store_want_votes WHERE want_id = $1 AND user_email = $2`,
      [wantId, userEmail]
    );
    
    if (existing.rows.length > 0) {
      // Remove vote
      await pool.query(`DELETE FROM secret_store_want_votes WHERE want_id = $1 AND user_email = $2`, [wantId, userEmail]);
      await pool.query(`UPDATE secret_store_wants SET votes = votes - 1 WHERE id = $1`, [wantId]);
      res.json({ success: true, voted: false, message: 'Vote removed' });
    } else {
      // Add vote
      await pool.query(`INSERT INTO secret_store_want_votes (want_id, user_email) VALUES ($1, $2)`, [wantId, userEmail]);
      await pool.query(`UPDATE secret_store_wants SET votes = votes + 1 WHERE id = $1`, [wantId]);
      res.json({ success: true, voted: true, message: 'Vote added' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if user voted on wants
router.get('/wants/votes/:email', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT want_id FROM secret_store_want_votes WHERE user_email = $1`,
      [req.params.email]
    );
    res.json({ votedWants: result.rows.map(r => r.want_id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to want
router.post('/wants/comment', async (req, res) => {
  const { wantId, userName, userEmail, comment } = req.body;
  if (!wantId || !userName || !userEmail || !comment) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO secret_store_want_comments (want_id, user_name, user_email, comment) VALUES ($1, $2, $3, $4) RETURNING *`,
      [wantId, userName, userEmail, comment]
    );
    res.json({ success: true, comment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trending/top wants
router.get('/wants/trending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM secret_store_wants WHERE status = 'pending' ORDER BY votes DESC LIMIT 5`
    );
    res.json({ trending: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all wants with stats
router.get('/admin/wants', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT * FROM secret_store_wants ORDER BY votes DESC, created_at DESC`);
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'fulfilled') as fulfilled,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM secret_store_wants
    `);
    res.json({ wants: result.rows, stats: stats.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update want status
router.post('/admin/wants/status', async (req, res) => {
  const { pass, id, status, admin_notes } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    if (status === 'fulfilled') {
      await pool.query(
        `UPDATE secret_store_wants SET status = $1, admin_notes = $2, fulfilled_at = NOW() WHERE id = $3`,
        [status, admin_notes || '', id]
      );
    } else {
      await pool.query(
        `UPDATE secret_store_wants SET status = $1, admin_notes = $2 WHERE id = $3`,
        [status, admin_notes || '', id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete want
router.post('/admin/wants/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM secret_store_wants WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Link want to product (mark fulfilled with product)
router.post('/admin/wants/fulfill', async (req, res) => {
  const { pass, id, productId } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(
      `UPDATE secret_store_wants SET status = 'fulfilled', fulfilled_product_id = $1, fulfilled_at = NOW() WHERE id = $2`,
      [productId, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
