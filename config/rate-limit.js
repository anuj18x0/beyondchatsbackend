const rateLimit = require('express-rate-limit');

// Burst protection - very short window
const burstLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 40, // Max 40 requests per 10 seconds
  message: {
    success: false,
    message: 'Too many requests too quickly. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, // Max 30 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for expensive operations (AI/scraping)
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Max 3 expensive operations per minute
  message: {
    success: false,
    message: 'Too many requests for this operation, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiter for content updates (most expensive)
const updateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 content updates per hour
  message: {
    success: false,
    message: 'Content update limit reached. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  burstLimiter,
  apiLimiter,
  strictLimiter,
  updateLimiter,
};
