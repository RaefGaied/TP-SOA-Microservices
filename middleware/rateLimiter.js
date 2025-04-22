const rateLimit = require('express-rate-limit');

function createRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true, 
    legacyHeaders: false, 
    message: {
      error: 'Too many requests, please try again later',
      status: 429
    },
    skip: (req) => {
      return req.path === '/health';
    }
  });
}

module.exports = createRateLimiter;