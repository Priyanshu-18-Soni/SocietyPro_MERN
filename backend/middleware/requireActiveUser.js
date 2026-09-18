const User = require('../models/User');

const requireActiveUser = async (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  // SocietyOwner and Committee pass automatically
  if (req.user.role === 'SocietyOwner' || req.user.role === 'Committee') {
    return next();
  }

  if (req.user.role === 'Resident') {
    try {
      // Query DB to check real-time status (avoids stale JWT status if recently approved)
      const user = await User.findById(req.user.id).select('status unitNumber');
      if (!user || user.status !== 'active') {
        return res.status(403).json({
          code: 'ACCOUNT_INACTIVE',
          message: 'Account awaiting committee approval',
        });
      }

      req.user.status = user.status;
      req.user.unitNumber = user.unitNumber || req.user.unitNumber || '';
      req.user.flatNo = user.unitNumber || req.user.flatNo || '';
      return next();
    } catch (err) {
      console.error('Error in requireActiveUser middleware:', err);
      return res.status(500).json({ message: 'Server error validating account status' });
    }
  }

  return res.status(403).json({
    code: 'ACCOUNT_INACTIVE',
    message: 'Account awaiting committee approval',
  });
};

module.exports = requireActiveUser;
