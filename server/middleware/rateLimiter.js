/**
 * Simple in-memory rate limiter (no extra dependencies needed)
 * For production at scale, swap to express-rate-limit + redis store
 */

const rateLimitStore = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore) {
    if (now - data.windowStart > data.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message when limited
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress;
    const key = `${req.baseUrl}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
      // New window
      record = { count: 1, windowStart: now, windowMs };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// Pre-configured limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                    // 15 login attempts per 15 min
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // 5 registrations per hour per IP
  message: 'Too many accounts created. Please try again later.'
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 reset requests per 15 min
  message: 'Too many password reset requests. Please try again later.'
});

const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 60,                   // 60 requests per minute (general API)
  message: 'Too many requests. Please slow down.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter
};
