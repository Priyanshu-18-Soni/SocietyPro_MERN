const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/requirePermission');
const {
  getSocietyUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

router.get('/', tenantMiddleware, requirePermission('manageResidents'), getSocietyUsers);
router.get('/:id', tenantMiddleware, requirePermission('manageResidents'), getUserById);
router.patch('/:id', tenantMiddleware, requirePermission('manageResidents'), updateUser);
router.delete('/:id', tenantMiddleware, requirePermission('manageResidents'), deleteUser);

module.exports = router;