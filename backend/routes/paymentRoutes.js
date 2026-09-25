const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireActiveUser = require('../middleware/requireActiveUser');
const requirePermission = require('../middleware/requirePermission');
const requireRole = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const { createOrderSchema, verifyPaymentSchema, generateBillSchema, generateBulkBillsSchema } = require('../validations/schemas');
const { createOrder, verifyPayment, generateBill, generateBulkBills, getBills, handleRazorpayWebhook } = require('../controllers/paymentController');

// Razorpay asynchronous webhook endpoint (no JWT required, no Zod validation — uses HMAC verification)
router.post('/webhook', handleRazorpayWebhook);

// Residents can create payment orders for their own bills
router.post('/create-order', tenantMiddleware, requireActiveUser, requireRole('Resident'), validate(createOrderSchema), createOrder);

// Residents can verify their own payments
router.post('/verify', tenantMiddleware, requireActiveUser, requireRole('Resident'), validate(verifyPaymentSchema), verifyPayment);

// SocietyOwner or Committee with manageBills permission can generate bills
router.post('/generate-bill', tenantMiddleware, requireActiveUser, (req, res, next) => {
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
}, validate(generateBillSchema), generateBill);

// SocietyOwner or Committee with manageBills permission can bulk-generate bills for all active residents
router.post('/generate-bulk-bills', tenantMiddleware, requireActiveUser, (req, res, next) => {
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
}, validate(generateBulkBillsSchema), generateBulkBills);

// Get bills/payment history with role-based filtering handled in controller
router.get('/', tenantMiddleware, requireActiveUser, getBills);

module.exports = router;