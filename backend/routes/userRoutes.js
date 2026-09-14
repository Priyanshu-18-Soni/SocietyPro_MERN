const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/requirePermission');
const {
  getSocietyUsers,
  getUserById,
  updateUser,
  deleteUser,
  setResidentCustomRate,
  getResidentRate,
} = require('../controllers/userController');

// Rate routes
router.patch('/:id/rate', tenantMiddleware, requirePermission('manageResidents'), setResidentCustomRate);
router.get('/:id/rate', tenantMiddleware, getResidentRate);

router.get('/', tenantMiddleware, requirePermission('manageResidents'), getSocietyUsers);
router.get('/:id', tenantMiddleware, requirePermission('manageResidents'), getUserById);
router.patch('/:id', tenantMiddleware, requirePermission('manageResidents'), updateUser);
router.delete('/:id', tenantMiddleware, requirePermission('manageResidents'), deleteUser);

module.exports = router;