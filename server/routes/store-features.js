const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

const ADMIN_PASS = process.env.ADMIN_PASS;
if (!ADMIN_PASS) {
  console.error('⚠️  WARNING: ADMIN_PASS environment variable is not set! Store feature admin routes will be inaccessible.');
}

// Initialize all new tables
async function initFeatureTables() {
  try {
    // WANTS SYSTEM
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_wants (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        requested_by_name VARCHAR(255),
        requested_by_email VARCHAR(255),
        votes INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // LOYALTY POINTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_loyalty (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) UNIQUE NOT NULL,
        user_name VARCHAR(255),
        points INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // REFERRALS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_referrals (
        id SERIAL PRIMARY KEY,
        referrer_email VARCHAR(255) NOT NULL,
        referrer_name VARCHAR(255),
        referred_email VARCHAR(255) NOT NULL,
        referred_name VARCHAR(255),
        code VARCHAR(50) UNIQUE,
        used BOOLEAN DEFAULT false,
        reward_given BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // FLASH SALES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_flash_sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        product_name VARCHAR(255),
        original_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // GIFT CARDS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_gift_cards (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance DECIMAL(10,2) NOT NULL,
        from_name VARCHAR(255),
        from_email VARCHAR(255),
        to_name VARCHAR(255),
        to_email VARCHAR(255),
        message TEXT,
        redeemed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ANNOUNCEMENTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // CHAT MESSAGES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_chat (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        message TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Store feature tables initialized');
  } catch (err) {
    console.error('Store features DB init error:', err.message);
  }
}
initFeatureTables();

// ========== WANTS SYSTEM ==========
router.get('/wants', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM store_wants ORDER BY votes DESC, created_at DESC`);
    res.json({ wants: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/wants/add', async (req, res) => {
  const { title, description, image_url, userName, userEmail } = req.body;
  if (!title || !userName || !userEmail) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query(
      `INSERT INTO store_wants (title, description, image_url, requested_by_name, requested_by_email) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || '', image_url || '', userName, userEmail]
    );
    res.json({ success: true, want: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/wants/vote', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query(`UPDATE store_wants SET votes = votes + 1 WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/wants/status', async (req, res) => {
  const { pass, id, status } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`UPDATE store_wants SET status = $1 WHERE id = $2`, [status, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LOYALTY POINTS ==========
router.get('/loyalty/:email', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM store_loyalty WHERE user_email = $1`, [req.params.email]);
    if (result.rows.length === 0) {
      res.json({ points: 0, total_spent: 0 });
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/loyalty/add', async (req, res) => {
  const { email, name, points, spent } = req.body;
  try {
    await pool.query(`
      INSERT INTO store_loyalty (user_email, user_name, points, total_spent) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_email) 
      DO UPDATE SET points = store_loyalty.points + $3, total_spent = store_loyalty.total_spent + $4
    `, [email, name, points || 0, spent || 0]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/loyalty', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT * FROM store_loyalty ORDER BY points DESC`);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== REFERRALS ==========
router.get('/referral/:email', async (req, res) => {
  try {
    let result = await pool.query(`SELECT * FROM store_referrals WHERE referrer_email = $1`, [req.params.email]);
    if (result.rows.length === 0) {
      const code = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
      result = await pool.query(
        `INSERT INTO store_referrals (referrer_email, code) VALUES ($1, $2) RETURNING *`,
        [req.params.email, code]
      );
    }
    const referrals = await pool.query(`SELECT * FROM store_referrals WHERE referrer_email = $1 AND referred_email IS NOT NULL`, [req.params.email]);
    res.json({ code: result.rows[0].code, referrals: referrals.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/referral/use', async (req, res) => {
  const { code, referredEmail, referredName } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM store_referrals WHERE code = $1`, [code]);
    if (result.rows.length === 0) return res.json({ valid: false, error: 'Invalid code' });
    if (result.rows[0].referrer_email === referredEmail) return res.json({ valid: false, error: 'Cannot use your own code' });
    
    await pool.query(
      `INSERT INTO store_referrals (referrer_email, referrer_name, referred_email, referred_name, code, used) 
       VALUES ($1, $2, $3, $4, $5, true)`,
      [result.rows[0].referrer_email, result.rows[0].referrer_name, referredEmail, referredName, code + '_' + Date.now()]
    );
    res.json({ valid: true, discount: 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== FLASH SALES ==========
router.get('/flash-sales', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM store_flash_sales WHERE active = true AND ends_at > NOW() ORDER BY ends_at ASC`);
    res.json({ sales: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/flash-sales/add', async (req, res) => {
  const { pass, product_id, product_name, original_price, sale_price, starts_at, ends_at } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(
      `INSERT INTO store_flash_sales (product_id, product_name, original_price, sale_price, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [product_id, product_name, original_price, sale_price, starts_at, ends_at]
    );
    res.json({ success: true, sale: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/flash-sales/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM store_flash_sales WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== GIFT CARDS ==========
router.post('/gift-cards/create', async (req, res) => {
  const { amount, fromName, fromEmail, toName, toEmail, message } = req.body;
  if (!amount || !fromEmail) return res.status(400).json({ error: 'Missing fields' });
  const code = 'GIFT' + Math.random().toString(36).substring(2, 10).toUpperCase();
  try {
    const result = await pool.query(
      `INSERT INTO store_gift_cards (code, amount, balance, from_name, from_email, to_name, to_email, message) VALUES ($1, $2, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [code, amount, fromName, fromEmail, toName || '', toEmail || '', message || '']
    );
    res.json({ success: true, giftCard: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gift-cards/check/:code', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM store_gift_cards WHERE code = $1`, [req.params.code]);
    if (result.rows.length === 0) return res.json({ valid: false });
    res.json({ valid: true, giftCard: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gift-cards/redeem', async (req, res) => {
  const { code, amount } = req.body;
  try {
    const result = await pool.query(`SELECT * FROM store_gift_cards WHERE code = $1`, [code]);
    if (result.rows.length === 0) return res.json({ success: false, error: 'Invalid code' });
    if (result.rows[0].balance < amount) return res.json({ success: false, error: 'Insufficient balance' });
    
    await pool.query(`UPDATE store_gift_cards SET balance = balance - $1, redeemed = true WHERE code = $2`, [amount, code]);
    res.json({ success: true, remaining: result.rows[0].balance - amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ANNOUNCEMENTS ==========
router.get('/announcements', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM store_announcements WHERE active = true ORDER BY created_at DESC`);
    res.json({ announcements: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/announcements/add', async (req, res) => {
  const { pass, title, message, type } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(
      `INSERT INTO store_announcements (title, message, type) VALUES ($1, $2, $3) RETURNING *`,
      [title, message, type || 'info']
    );
    res.json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/announcements/delete', async (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    await pool.query(`DELETE FROM store_announcements WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CHAT SUPPORT ==========
router.get('/chat/:email', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM store_chat WHERE user_email = $1 ORDER BY created_at ASC`, [req.params.email]);
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat/send', async (req, res) => {
  const { userName, userEmail, message } = req.body;
  if (!message || !userEmail) return res.status(400).json({ error: 'Missing fields' });
  try {
    const result = await pool.query(
      `INSERT INTO store_chat (user_name, user_email, message, is_admin) VALUES ($1, $2, $3, false) RETURNING *`,
      [userName, userEmail, message]
    );
    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/chat', async (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(`SELECT DISTINCT user_email, user_name, MAX(created_at) as last_message FROM store_chat GROUP BY user_email, user_name ORDER BY last_message DESC`);
    res.json({ chats: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/chat/reply', async (req, res) => {
  const { pass, userEmail, message } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  try {
    const result = await pool.query(
      `INSERT INTO store_chat (user_name, user_email, message, is_admin) VALUES ('Admin', $1, $2, true) RETURNING *`,
      [userEmail, message]
    );
    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

