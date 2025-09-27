// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const { registerUser, loginUser, registerAdmin, getAdmins, deleteAdmin, forgotPassword, resetPassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ destructure here

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin management routes (protected)
router.post('/register-admin', authMiddleware, registerAdmin);
router.get('/admins', authMiddleware, getAdmins);
router.delete('/admin/:adminId', authMiddleware, deleteAdmin);

module.exports = router;
