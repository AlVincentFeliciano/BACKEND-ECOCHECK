const jwt = require('jsonwebtoken');
const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log('📌 Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'Token missing' });

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('📌 Decoded token:', decoded);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ msg: 'Account deactivated' });
    }

    // Attach user safely with location for filtering
    req.user = { id: user._id.toString(), role: user.role, location: user.location || null };
    console.log('📌 req.user set:', req.user);

    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = { authMiddleware };
