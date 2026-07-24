const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getSocietyUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

router.get('/', tenantMiddleware, requireRole('SocietyAdmin'), getSocietyUsers);
router.get('/:id', tenantMiddleware, requireRole('SocietyAdmin'), getUserById);
router.patch('/:id', tenantMiddleware, requireRole('SocietyAdmin'), updateUser);
router.delete('/:id', tenantMiddleware, requireRole('SocietyAdmin'), deleteUser);

module.exports = router;
