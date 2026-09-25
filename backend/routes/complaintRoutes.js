const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireActiveUser = require('../middleware/requireActiveUser');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const { uploadComplaintImage } = require('../middleware/uploadMiddleware');
const { createComplaintSchema } = require('../validations/schemas');
const {
  createComplaint,
  getComplaints,
  upvoteComplaint,
  updateComplaintStatus,
  updateComplaintVerdict,
} = require('../controllers/complaintController');

// All complaint routes require authentication and an active user status
router.use(tenantMiddleware, requireActiveUser);

router.post('/', uploadComplaintImage, validate(createComplaintSchema), createComplaint);
router.get('/', getComplaints);
router.patch('/:id/upvote', upvoteComplaint);
router.patch('/:id/status', requirePermission('resolveComplaints'), updateComplaintStatus);
router.patch('/:id/verdict', updateComplaintVerdict);

module.exports = router;
