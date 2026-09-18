const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireActiveUser = require('../middleware/requireActiveUser');
const requirePermission = require('../middleware/requirePermission');
const {
  recordExpense,
  getFinancialMetrics,
} = require('../controllers/financeController');

// All finance routes require authentication and active user status
router.use(tenantMiddleware, requireActiveUser);

// SocietyOwner or Committee with manageSociety / manageBills can record expenses
router.post(
  '/expenses',
  (req, res, next) => {
    if (req.user.role === 'SocietyOwner') return next();
    if (
      req.user.role === 'Committee' &&
      Array.isArray(req.user.permissions) &&
      (req.user.permissions.includes('manageSociety') || req.user.permissions.includes('manageBills'))
    ) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied. Missing required permission to manage treasury' });
  },
  recordExpense
);

// All active members in the society can view treasury metrics
router.get('/metrics', getFinancialMetrics);

module.exports = router;
