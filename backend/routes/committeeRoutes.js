const express = require('express');
const router = express.Router();
const { createCommittee, getCommitteeMembers, updateCommitteePermissions, deleteCommittee } = require('../controllers/committeeController');
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const { createCommitteeSchema } = require('../validations/schemas');

// All routes protected with tenantMiddleware and requireRole('SocietyOwner')
router.post('/', tenantMiddleware, requireRole('SocietyOwner'), validate(createCommitteeSchema), createCommittee);
router.get('/', tenantMiddleware, requireRole('SocietyOwner'), getCommitteeMembers);
router.patch('/:id', tenantMiddleware, requireRole('SocietyOwner'), updateCommitteePermissions);
router.delete('/:id', tenantMiddleware, requireRole('SocietyOwner'), deleteCommittee);

module.exports = router;