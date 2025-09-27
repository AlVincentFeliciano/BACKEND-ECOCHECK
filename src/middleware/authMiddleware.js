const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

/**
 * Auth middleware with optional role check
 * @param {string} requiredRole - optional, role required to access route ('superadmin', 'admin', 'user')
 */
const authMiddleware = (requiredRole) => {
  return (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded.user; // contains { id, role }

      // Check role if specified
      if (requiredRole && req.user.role !== requiredRole) {
        return res.status(403).json({ msg: `Access denied: ${requiredRole} role required` });
      }

      next();
    } catch (err) {
      console.error('Auth middleware error:', err.message);
      res.status(401).json({ msg: 'Token is not valid' });
    }
  };
};

module.exports = authMiddleware;
