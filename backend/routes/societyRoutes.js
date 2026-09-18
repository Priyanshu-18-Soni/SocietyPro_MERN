const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/requirePermission');
const requireRole = require('../middleware/roleMiddleware');
const {
  getSocietyById,
  updateSociety,
  deleteSociety,
  updateDefaultRates,
  getDefaultRates,
  updateLateFeeSettings,
  getLateFeeSettings,
} = require('../controllers/societyController');

// Rate item routes
router.get('/rates/default', tenantMiddleware, getDefaultRates);
router.patch('/rates/default', tenantMiddleware, requireRole('SocietyOwner'), updateDefaultRates);

// Late fee settings routes
router.get('/late-fee-settings', tenantMiddleware, getLateFeeSettings);
router.patch('/late-fee-settings', tenantMiddleware, requireRole('SocietyOwner'), updateLateFeeSettings);

// GET a single society by ID - SocietyOwner can view their own society
router.get('/:id', tenantMiddleware, requirePermission('manageSociety'), getSocietyById);

// PATCH update a society - SocietyOwner can update their own society
router.patch('/:id', tenantMiddleware, requirePermission('manageSociety'), updateSociety);

// DELETE a society - SocietyOwner can delete their own society
router.delete('/:id', tenantMiddleware, requirePermission('manageSociety'), deleteSociety);

module.exports = router;