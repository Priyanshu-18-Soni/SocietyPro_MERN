const express = require('express');
const router = express.Router();
const { registerOwner, registerResident, loginUser } = require('../controllers/authController');

router.post('/register-owner', registerOwner);
router.post('/register-resident', registerResident);
router.post('/login', loginUser);

module.exports = router;