// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const { registerUser, loginUser, registerAdmin, getAdmins, deleteAdmin, forgotPassword, resetPassword, getLoginLogs, verifyEmail, resendVerificationCode } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ destructure here

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin management routes (protected)
router.post('/register-admin', authMiddleware, registerAdmin);
router.get('/admins', authMiddleware, getAdmins);
router.delete('/admin/:adminId', authMiddleware, deleteAdmin);

// Login logs route (superadmin only)
router.get('/login-logs', authMiddleware, getLoginLogs);

module.exports = router;
