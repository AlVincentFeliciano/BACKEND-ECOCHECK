const jwt = require('jsonwebtoken');
const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// ✅ Verify JWT token and check if user is still active
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user from DB and verify status
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ msg: 'User not found, authorization denied' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ msg: 'Account has been deactivated. Access denied.' });
    }

    // ✅ Flattened structure (so req.user.id works everywhere)
    req.user = { id: user._id, role: user.role };
    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// ✅ Superadmin-only route guard
const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ msg: 'Access denied. Superadmin only.' });
  }
  next();
};

module.exports = { authMiddleware, isSuperAdmin };
