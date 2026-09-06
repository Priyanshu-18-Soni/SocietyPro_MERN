const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // SocietyOwner always has full access to their own society's resources
    if (req.user.role === 'SocietyOwner') {
      return next();
    }

    // Committee members need the specific permission in their permissions array
    if (req.user.role === 'Committee') {
      if (Array.isArray(req.user.permissions) && req.user.permissions.includes(permissionName)) {
        return next();
      }
      return res.status(403).json({ message: `Access denied. Missing required permission: ${permissionName}` });
    }

    // Residents and any other role never pass permission checks
    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
  };
};

module.exports = requirePermission;