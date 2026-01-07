const express = require('express');
const router = express.Router();

// Only initialize Stripe if key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const { authenticateToken } = require('../middleware/auth');
const pool = require('../utils/db');
const tournamentService = require('../services/tournamentService');

const ENTRY_FEE_CENTS = 100; // $1 USD

// Create Stripe checkout session
router.post('/tournament/:tournamentId/checkout', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payments not configured yet' });
  }
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    // Check if tournament exists and is open for registration
    const tournament = await pool.query(`
      SELECT t.*, 
             (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id AND is_withdrawn = FALSE) as current_count
      FROM tournaments t
      WHERE t.id = $1
    `, [tournamentId]);

    if (tournament.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const t = tournament.rows[0];

    if (t.status !== 'upcoming') {
      return res.status(400).json({ error: 'Tournament registration is closed' });
    }

    if (t.current_count >= t.max_players) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Check if already registered
    const existing = await pool.query(`
      SELECT id FROM tournament_participants
      WHERE tournament_id = $1 AND user_id = $2 AND is_withdrawn = FALSE
    `, [tournamentId, userId]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already registered for this tournament' });
    }

    // Check if there's already a pending payment
    const pendingPayment = await pool.query(`
      SELECT id FROM tournament_payments
      WHERE tournament_id = $1 AND user_id = $2 AND status = 'pending'
    `, [tournamentId, userId]);

    if (pendingPayment.rows.length > 0) {
      return res.status(400).json({ error: 'Payment already in progress' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tournament Entry: ${t.name}`,
              description: 'Entry fee - All proceeds go to charity (funding schools in South Africa)',
            },
            unit_amount: ENTRY_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/tournament/${tournamentId}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/tournament/${tournamentId}?payment=cancelled`,
      metadata: {
        tournament_id: tournamentId,
        user_id: userId,
      },
    });

    // Record pending payment
    await pool.query(`
      INSERT INTO tournament_payments (tournament_id, user_id, stripe_session_id, amount, status)
      VALUES ($1, $2, $3, $4, 'pending')
    `, [tournamentId, userId, session.id, ENTRY_FEE_CENTS]);

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check payment status
router.get('/tournament/:tournamentId/payment-status', authenticateToken, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    const payment = await pool.query(`
      SELECT status, stripe_payment_id, completed_at
      FROM tournament_payments
      WHERE tournament_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [tournamentId, userId]);

    if (payment.rows.length === 0) {
      return res.json({ status: 'none' });
    }

    res.json({ status: payment.rows[0].status, paymentId: payment.rows[0].stripe_payment_id });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment (backup if webhook fails)
router.post('/tournament/:tournamentId/verify-payment', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payments not configured yet' });
  }
  try {
    const { tournamentId } = req.params;
    const userId = req.user.id;

    // Get the most recent pending payment
    const payment = await pool.query(`
      SELECT id, stripe_session_id, status
      FROM tournament_payments
      WHERE tournament_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [tournamentId, userId]);

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: 'No payment found' });
    }

    const paymentRecord = payment.rows[0];

    if (paymentRecord.status === 'completed') {
      return res.json({ status: 'completed', message: 'Payment already verified' });
    }

    // Check with Stripe
    const session = await stripe.checkout.sessions.retrieve(paymentRecord.stripe_session_id);

    if (session.payment_status === 'paid') {
      // Update payment record
      await pool.query(`
        UPDATE tournament_payments
        SET status = 'completed',
            stripe_payment_id = $1,
            completed_at = NOW()
        WHERE id = $2
      `, [session.payment_intent, paymentRecord.id]);

      // Register player
      try {
        await tournamentService.registerPlayer(tournamentId, userId);
        res.json({ status: 'completed', message: 'Payment verified and registered' });
      } catch (regError) {
        // Payment succeeded but registration failed - log it
        console.error('Registration error after payment:', regError);
        res.status(500).json({ 
          error: 'Payment verified but registration failed. Please contact support.',
          paymentStatus: 'completed'
        });
      }
    } else {
      res.json({ status: 'pending', message: 'Payment not yet completed' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
// Note: This route is handled in server/index.js with express.raw middleware
// Webhook handler - must be added directly in server/index.js due to raw body requirement
// This function is exported for use in server/index.js
const handleStripeWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payments not configured yet' });
  }
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const tournamentId = parseInt(session.metadata.tournament_id);
      const userId = parseInt(session.metadata.user_id);

      // Update payment record
      await pool.query(`
        UPDATE tournament_payments
        SET status = 'completed',
            stripe_payment_id = $1,
            completed_at = NOW()
        WHERE stripe_session_id = $2 AND status = 'pending'
      `, [session.payment_intent, session.id]);

      // Register player for tournament
      try {
        await tournamentService.registerPlayer(tournamentId, userId);
        console.log(`✅ Payment completed and player registered: Tournament ${tournamentId}, User ${userId}`);
      } catch (regError) {
        console.error('Registration error after payment:', regError);
        // Payment succeeded but registration failed - this should be investigated
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  }

  res.json({ received: true });
};

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;

