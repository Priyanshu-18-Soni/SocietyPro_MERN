const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { createOrder, verifyPayment, generateBill, getBills } = require('../controllers/paymentController');

router.post('/create-order', tenantMiddleware, requireRole('Resident', 'SocietyAdmin'), createOrder);
router.post('/verify', tenantMiddleware, requireRole('Resident', 'SocietyAdmin'), verifyPayment);
router.post('/generate-bill', tenantMiddleware, requireRole('SocietyAdmin'), generateBill);
router.get('/', tenantMiddleware, requireRole('Resident', 'SocietyAdmin'), getBills);

module.exports = router;
