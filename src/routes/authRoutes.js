// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const { registerUser, loginUser, registerAdmin, getAdmins, deleteAdmin } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Admin management routes (protected)
router.post('/register-admin', authMiddleware, registerAdmin);
router.get('/admins', authMiddleware, getAdmins);
router.delete('/admin/:adminId', authMiddleware, deleteAdmin);

module.exports = router;
