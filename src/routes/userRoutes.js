const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const { registerUser, createAdmin, getAllUsers, updateUser, getUser, changePassword, updateProfilePic } = require('../controllers/userController');
const { profileStorage } = require('../config/cloudinaryConfig');
const upload = multer({ storage: profileStorage });

// User registration
router.post('/register', registerUser);

// Superadmin can create new admins
router.post('/create-admin', authMiddleware, isSuperAdmin, createAdmin);

// Get all users
router.get('/', authMiddleware, getAllUsers);

// Get a single user
router.get('/:id', authMiddleware, getUser);

// Update user (bio + profilePic)
router.put('/:id', authMiddleware, upload.single('profilePic'), updateUser);

// Change password
router.put('/change-password', authMiddleware, changePassword);

// Update profile picture only
router.put('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);

module.exports = router;
