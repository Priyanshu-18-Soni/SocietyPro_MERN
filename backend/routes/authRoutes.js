const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');
const { registerOwner, registerResident, loginUser, checkStatus } = require('../controllers/authController');

router.post('/register-owner', registerOwner);
router.post('/register-resident', registerResident);
router.post('/login', loginUser);
router.get('/check-status', tenantMiddleware, checkStatus);

module.exports = router;