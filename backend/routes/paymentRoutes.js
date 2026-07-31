const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

router.post('/create-order', tenantMiddleware, requireRole('Resident', 'SocietyAdmin'), createOrder);
router.post('/verify', tenantMiddleware, requireRole('Resident', 'SocietyAdmin'), verifyPayment);

module.exports = router;
