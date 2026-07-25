const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  createSociety,
  getAllSocieties,
  getSocietyById,
  updateSociety,
  deleteSociety,
} = require('../controllers/societyController');

router.post('/', tenantMiddleware, requireRole('SuperAdmin'), createSociety);
router.get('/', tenantMiddleware, requireRole('SuperAdmin'), getAllSocieties);
router.get('/:id', tenantMiddleware, requireRole('SuperAdmin', 'SocietyAdmin'), getSocietyById);
router.patch('/:id', tenantMiddleware, requireRole('SuperAdmin'), updateSociety);
router.delete('/:id', tenantMiddleware, requireRole('SuperAdmin'), deleteSociety);

module.exports = router;
