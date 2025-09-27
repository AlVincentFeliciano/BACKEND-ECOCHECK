const express = require('express');
const router = express.Router();

// Import controller functions
const {
  registerUser,
  loginUser,
  registerAdmin,
  getAdmins,
  deleteAdmin,
  forgotPassword // ✅ added
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

// ✅ Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword); // ✅ added

// ✅ Protected routes
router.post('/register-admin', authMiddleware, registerAdmin);
router.get('/admins', authMiddleware, getAdmins);
router.delete('/admin/:adminId', authMiddleware, deleteAdmin);

module.exports = router;
