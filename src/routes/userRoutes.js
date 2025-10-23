const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const { registerUser, createAdmin, getAllUsers, updateUser, getUser, changePassword, updateProfilePic } = require('../controllers/userController');
const { profileStorage } = require('../config/cloudinaryConfig');

const upload = multer({ storage: profileStorage });

// Register
router.post('/register', registerUser);

// Superadmin create admin
router.post('/create-admin', authMiddleware, isSuperAdmin, createAdmin);

// Get all users
router.get('/', authMiddleware, getAllUsers);

// Get one user
router.get('/:id', authMiddleware, getUser);

// Update user info (bio, name, picture)
router.put('/:id', authMiddleware, upload.single('profilePic'), updateUser);

// Change password
router.put('/change-password', authMiddleware, changePassword);

// Update profile picture only
router.put('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);

module.exports = router;
