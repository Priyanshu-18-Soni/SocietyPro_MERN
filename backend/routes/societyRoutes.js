const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  createSociety,
  getAllSocieties,
  getSocietyById,
} = require('../controllers/societyController');

router.post('/', tenantMiddleware, requireRole('SuperAdmin'), createSociety);
router.get('/', tenantMiddleware, requireRole('SuperAdmin'), getAllSocieties);
router.get('/:id', tenantMiddleware, requireRole('SuperAdmin', 'SocietyAdmin'), getSocietyById);

module.exports = router;
