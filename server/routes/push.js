const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../utils/db');

// Configure web-push with VAPID details from environment
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ============================================
// PUBLIC KEY
// ============================================

// Return the VAPID public key so the client can subscribe
router.get('/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ============================================
// SUBSCRIBE
// ============================================

// Store a push subscription. Duplicate endpoints are ignored.
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO NOTHING`,
      [endpoint, keys.p256dh, keys.auth]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// NOTIFY (admin only)
// ============================================

// Send a push notification to all stored subscriptions.
router.post('/notify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, body } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const { rows: subscriptions } = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions'
    );

    const payload = JSON.stringify({ title, body });
    let sent = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (error) {
          // 404/410 means the subscription is gone — remove it
          if (error.statusCode === 404 || error.statusCode === 410) {
            await pool.query(
              'DELETE FROM push_subscriptions WHERE endpoint = $1',
              [sub.endpoint]
            );
          } else {
            console.error('Push notify send error:', error.statusCode, error.body || error.message);
          }
        }
      })
    );

    res.json({ sent });
  } catch (error) {
    console.error('Push notify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
