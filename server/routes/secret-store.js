/**
 * Secret Store Routes - Approval-based access system
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'secret-store-users.json');
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'secret-store-products.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'secret-store-settings.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'riddick123';

// Currency conversion rates (approximate, from CNY)
const CURRENCY_RATES = {
  CNY: 1,        // Chinese Yuan (base)
  USD: 0.14,     // US Dollar
  EUR: 0.13,     // Euro
  GBP: 0.11,     // British Pound
  ZAR: 2.5,      // South African Rand
  JPY: 21,       // Japanese Yen
  KRW: 180,      // Korean Won
  INR: 11.5,     // Indian Rupee
  AUD: 0.21,     // Australian Dollar
  CAD: 0.19      // Canadian Dollar
};

const CURRENCY_SYMBOLS = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  ZAR: 'R',
  JPY: '¥',
  KRW: '₩',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$'
};

// Ensure data directory and file exist
function ensureDataFile() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function loadUsers() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveUsers(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Products functions
function ensureProductsFile() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify({ products: [] }, null, 2));
  }
}

function loadProducts() {
  ensureProductsFile();
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
}

function saveProducts(data) {
  ensureProductsFile();
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
}

// Settings functions
function ensureSettingsFile() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ defaultCurrency: 'CNY' }, null, 2));
  }
}

function loadSettings() {
  ensureSettingsFile();
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}

function saveSettings(data) {
  ensureSettingsFile();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// Get currency info
router.get('/currencies', (req, res) => {
  res.json({
    rates: CURRENCY_RATES,
    symbols: CURRENCY_SYMBOLS,
    available: Object.keys(CURRENCY_RATES)
  });
});

// Get store settings (public)
router.get('/settings', (req, res) => {
  const settings = loadSettings();
  res.json({
    defaultCurrency: settings.defaultCurrency || 'CNY',
    symbol: CURRENCY_SYMBOLS[settings.defaultCurrency || 'CNY']
  });
});

// Admin: Update settings
router.post('/admin/settings', (req, res) => {
  const { pass, defaultCurrency } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  
  const settings = loadSettings();
  if (defaultCurrency && CURRENCY_RATES[defaultCurrency]) {
    settings.defaultCurrency = defaultCurrency;
  }
  saveSettings(settings);
  res.json({ success: true, settings });
});


// Request access
router.post('/request-access', (req, res) => {
  const { name, email, reason } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  
  const data = loadUsers();
  const exists = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(400).json({ error: 'Already requested', status: exists.status });
  
  data.users.push({
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    reason: reason || '',
    status: 'pending',
    requestedAt: new Date().toISOString()
  });
  saveUsers(data);
  res.json({ success: true, message: 'Request sent! Wait for approval.' });
});

// Login
router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  const data = loadUsers();
  const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Not found. Request access first.' });
  
  res.json({ 
    status: user.status, 
    name: user.name,
    message: user.status === 'pending' ? 'Still waiting for approval' :
             user.status === 'rejected' ? 'Access denied' : 'Welcome!'
  });
});


// Admin: Get all users
router.get('/admin/users', (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  res.json(loadUsers());
});

// Admin: Approve
router.post('/admin/approve', (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  
  const data = loadUsers();
  const user = data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.status = 'approved';
  user.approvedAt = new Date().toISOString();
  saveUsers(data);
  res.json({ success: true, user });
});

// Admin: Reject
router.post('/admin/reject', (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  
  const data = loadUsers();
  const user = data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.status = 'rejected';
  saveUsers(data);
  res.json({ success: true });
});

// Admin: Delete
router.post('/admin/delete', (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  
  const data = loadUsers();
  data.users = data.users.filter(u => u.id !== id);
  saveUsers(data);
  res.json({ success: true });
});

// ========== PRODUCTS ==========

// Get all products (public for approved users)
router.get('/products', (req, res) => {
  const { currency } = req.query;
  const data = loadProducts();
  const settings = loadSettings();
  const targetCurrency = currency || settings.defaultCurrency || 'CNY';
  const rate = CURRENCY_RATES[targetCurrency] || 1;
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || '¥';
  
  const products = (data.products || []).map(p => ({
    ...p,
    originalPrice: p.price,
    price: parseFloat((p.price * rate).toFixed(2)),
    currency: targetCurrency,
    symbol: symbol
  }));
  
  res.json({ products, currency: targetCurrency, symbol });
});

// Admin: Add product
router.post('/admin/products/add', (req, res) => {
  const { pass, name, description, price, image, category } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
  
  const data = loadProducts();
  const product = {
    id: Date.now().toString(),
    name,
    description: description || '',
    price: parseFloat(price),
    image: image || '',
    category: category || 'General',
    createdAt: new Date().toISOString()
  };
  data.products.push(product);
  saveProducts(data);
  res.json({ success: true, product });
});

// Admin: Update product
router.post('/admin/products/update', (req, res) => {
  const { pass, id, name, description, price, image, category } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  
  const data = loadProducts();
  const product = data.products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  if (name) product.name = name;
  if (description !== undefined) product.description = description;
  if (price) product.price = parseFloat(price);
  if (image !== undefined) product.image = image;
  if (category) product.category = category;
  product.updatedAt = new Date().toISOString();
  
  saveProducts(data);
  res.json({ success: true, product });
});

// Admin: Delete product
router.post('/admin/products/delete', (req, res) => {
  const { pass, id } = req.body;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  
  const data = loadProducts();
  data.products = data.products.filter(p => p.id !== id);
  saveProducts(data);
  res.json({ success: true });
});

// Admin: Get all products
router.get('/admin/products', (req, res) => {
  const { pass } = req.query;
  if (pass !== ADMIN_PASS) return res.status(401).json({ error: 'Wrong password' });
  res.json(loadProducts());
});

module.exports = router;
