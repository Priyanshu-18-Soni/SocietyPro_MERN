const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const requireActiveUser = require('../middleware/requireActiveUser');
const requirePermission = require('../middleware/requirePermission');
const validate = require('../middleware/validate');
const { createNoticeSchema } = require('../validations/schemas');
const {
  getNotices,
  createNotice,
  togglePinNotice,
  deleteNotice,
} = require('../controllers/noticeController');

// All notice routes require authentication and an active user status
router.use(tenantMiddleware, requireActiveUser);

router.get('/', getNotices);
router.post('/', requirePermission('manageNotices'), validate(createNoticeSchema), createNotice);
router.patch('/:id/pin', togglePinNotice);
router.delete('/:id', requirePermission('manageNotices'), deleteNotice);

module.exports = router;
