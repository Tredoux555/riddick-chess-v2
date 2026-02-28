/**
 * AI Chess Tutor Routes
 * Uses Anthropic API with tiered access: Haiku (Regular), Sonnet (Platinum), Opus (Premium)
 * Free trial: 1 question per account + per IP address
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { optionalAuth } = require('../middleware/auth');
const pool = require('../utils/db');

// Anthropic API key from environment
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Model mapping
const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250929',
  opus: 'claude-opus-4-5-20251101'
};

// Chess tutor system prompt
const SYSTEM_PROMPT = `You are a friendly, encouraging chess tutor for a school chess club website.
Your students range from complete beginners to intermediate players (roughly 400-1600 rated).

Guidelines:
- Keep responses concise (2-4 short paragraphs max)
- Use chess notation when helpful but always explain in plain language too
- Be encouraging and positive — these are young learners!
- Use emojis sparingly to keep things fun
- If asked about non-chess topics, gently redirect back to chess
- When explaining moves, use standard algebraic notation (e.g., e4, Nf3, O-O)
- Give practical tips they can use in their next game
- If they describe a position, help them think through it step by step`;

/**
 * Check trial status for user/IP
 */
router.get('/trial-status', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

    let trialUsed = false;

    if (userId) {
      const userCheck = await pool.query(
        'SELECT COUNT(*) FROM ai_tutor_usage WHERE user_id = $1',
        [userId]
      );
      if (parseInt(userCheck.rows[0].count) > 0) trialUsed = true;
    }

    if (!trialUsed) {
      const ipCheck = await pool.query(
        'SELECT COUNT(*) FROM ai_tutor_usage WHERE ip_address = $1',
        [ip]
      );
      if (parseInt(ipCheck.rows[0].count) > 0) trialUsed = true;
    }

    res.json({ trialUsed });
  } catch (err) {
    // Table might not exist yet
    res.json({ trialUsed: false });
  }
});

/**
 * Ask the AI tutor
 */
router.post('/ask', optionalAuth, async (req, res) => {
  try {
    const { message, tutor, history } = req.body;
    const userId = req.user?.id;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

    if (!message || !tutor) {
      return res.status(400).json({ error: 'Message and tutor selection required' });
    }

    if (!MODELS[tutor]) {
      return res.status(400).json({ error: 'Invalid tutor selection' });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI tutor is not configured yet. Ask the admin to add the Anthropic API key!' });
    }

    // Check access
    const userSubscription = req.user?.subscription || null;
    const hasAccess = checkAccess(userSubscription, tutor);

    if (!hasAccess) {
      // Check free trial
      const trialAvailable = await checkTrialAvailable(userId, ip);
      if (!trialAvailable) {
        return res.status(403).json({
          error: 'Free trial used! Subscribe to keep chatting with AI tutors.'
        });
      }
    }

    // Build messages for Anthropic API
    const messages = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }
    messages.push({ role: 'user', content: message });

    // Call Anthropic API using https module (compatible with all Node versions)
    const apiData = await callAnthropicAPI(MODELS[tutor], SYSTEM_PROMPT, messages);

    if (apiData.error) {
      console.error('Anthropic API error:', apiData.error);
      return res.status(500).json({ error: 'AI tutor had an issue. Try again in a moment!' });
    }

    const reply = apiData.content?.[0]?.text || 'Hmm, I got confused. Try asking again!';

    // Record usage for free trial tracking
    let trialUsed = false;
    if (!hasAccess) {
      await recordTrialUsage(userId, ip, tutor);
      trialUsed = true;
    }

    res.json({ reply, trialUsed });
  } catch (err) {
    console.error('AI tutor error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Try again!' });
  }
});

// Access check: does user's subscription grant access to this tutor tier?
function checkAccess(subscription, tutor) {
  if (!subscription) return false;
  if (subscription === 'premium') return true; // Premium gets all
  if (subscription === 'platinum') return tutor !== 'opus';
  if (subscription === 'regular') return tutor === 'haiku';
  return false;
}

// Check if free trial is available (by user ID or IP)
async function checkTrialAvailable(userId, ip) {
  try {
    if (userId) {
      const userCheck = await pool.query(
        'SELECT COUNT(*) FROM ai_tutor_usage WHERE user_id = $1',
        [userId]
      );
      if (parseInt(userCheck.rows[0].count) > 0) return false;
    }

    const ipCheck = await pool.query(
      'SELECT COUNT(*) FROM ai_tutor_usage WHERE ip_address = $1',
      [ip]
    );
    return parseInt(ipCheck.rows[0].count) === 0;
  } catch {
    // Table doesn't exist — allow trial
    return true;
  }
}

// Record trial usage
async function recordTrialUsage(userId, ip, tutor) {
  try {
    await pool.query(
      'INSERT INTO ai_tutor_usage (user_id, ip_address, tutor_used) VALUES ($1, $2, $3)',
      [userId, ip, tutor]
    );
  } catch (err) {
    console.error('Failed to record trial usage:', err.message);
  }
}

// HTTPS-based Anthropic API call (works on all Node.js versions)
function callAnthropicAPI(model, system, messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ model, max_tokens: 1024, system, messages });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            resolve({ error: `Status ${res.statusCode}: ${data}` });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve({ error: `Parse error: ${data}` });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({ error: 'Request timed out' });
    });

    req.write(postData);
    req.end();
  });
}

module.exports = router;
