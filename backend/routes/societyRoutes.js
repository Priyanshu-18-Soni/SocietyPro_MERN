const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requirePermission = require('../middleware/requirePermission');
const {
  getSocietyById,
  updateSociety,
  deleteSociety,
} = require('../controllers/societyController');

// GET a single society by ID - SocietyOwner can view their own society
router.get('/:id', tenantMiddleware, requirePermission('manageSociety'), getSocietyById);

// PATCH update a society - SocietyOwner can update their own society
router.patch('/:id', tenantMiddleware, requirePermission('manageSociety'), updateSociety);

// DELETE a society - SocietyOwner can delete their own society
router.delete('/:id', tenantMiddleware, requirePermission('manageSociety'), deleteSociety);

module.exports = router;