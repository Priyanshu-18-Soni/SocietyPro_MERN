const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/requirePermission');
const requireRole = require('../middleware/roleMiddleware');
const { createOrder, verifyPayment, generateBill, getBills, handleRazorpayWebhook } = require('../controllers/paymentController');

// Razorpay asynchronous webhook endpoint (no JWT required)
router.post('/webhook', handleRazorpayWebhook);

// Residents can create payment orders for their own bills
router.post('/create-order', tenantMiddleware, requireRole('Resident'), createOrder);

// Residents can verify their own payments
router.post('/verify', tenantMiddleware, requireRole('Resident'), verifyPayment);

// SocietyOwner or Committee with manageBills permission can generate bills
router.post('/generate-bill', tenantMiddleware, (req, res, next) => {
  // First check if user is SocietyOwner (always allowed)
  if (req.user.role === 'SocietyOwner') {
    return next();
  }
  // Then check if user is Committee with manageBills permission
  if (req.user.role === 'Committee' &&
      Array.isArray(req.user.permissions) &&
      req.user.permissions.includes('manageBills')) {
    return next();
  }
  // Otherwise deny access
  return res.status(403).json({ message: 'Access denied. Missing required permission: manageBills' });
}, generateBill);

// Get bills/payment history with role-based filtering handled in controller
router.get('/', tenantMiddleware, getBills);

module.exports = router;