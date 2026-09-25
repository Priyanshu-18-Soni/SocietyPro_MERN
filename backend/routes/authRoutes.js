const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const validate = require('../middleware/validate');
const { registerOwnerSchema, registerResidentSchema, loginSchema } = require('../validations/schemas');
const { registerOwner, registerResident, loginUser, checkStatus } = require('../controllers/authController');

// Strict rate limiter for auth endpoints: 5 requests per 15 minutes per IP
// Prevents brute-force login attacks, credential stuffing, and registration abuse
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window per IP
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,      // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
});

router.post('/register-owner', authRateLimiter, validate(registerOwnerSchema), registerOwner);
router.post('/register-resident', authRateLimiter, validate(registerResidentSchema), registerResident);
router.post('/login', authRateLimiter, validate(loginSchema), loginUser);
router.get('/check-status', tenantMiddleware, checkStatus);

module.exports = router;