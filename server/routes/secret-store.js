/**
 * Secret Store Routes - Approval-based access system
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'secret-store-users.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'riddick123';

// Ensure data directory and file exist
function ensureDataFile() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSyncSync(dataDir, { recursive: true });
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

module.exports = router;
