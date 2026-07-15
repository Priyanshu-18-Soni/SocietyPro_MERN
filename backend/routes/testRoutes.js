const express = require('express');
const router = express.Router();
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.get('/protected', tenantMiddleware, (req, res) => {
  res.json({
    message: 'You accessed a protected route!',
    user: req.user,
  });
});

module.exports = router;
