const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware'); // unified auth + role check
const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
  changePassword,
  updateProfilePic,
  createAdmin,
  forgotPassword,
  resetPassword,
} = require('../controllers/userController');

const { profileStorage } = require('../config/cloudinaryConfig');
const upload = multer({ storage: profileStorage });

// Register new user
router.post('/register', registerUser);

// Create new admin (superadmin only)
router.post('/create-admin', auth('superadmin'), createAdmin);

// Forgot password
router.post('/forgot-password', forgotPassword);

// Reset password
router.post('/reset-password', resetPassword);

// Get all users
router.get('/', auth(), getAllUsers);

// Change password
router.put('/change-password', auth(), changePassword);

// Update profile picture only
router.put('/profile-pic', auth(), upload.single('profilePic'), updateProfilePic);

// Get a single user
router.get('/:id', auth(), getUser);

// Update user info
router.put('/:id', auth(), upload.single('profilePic'), updateUser);

module.exports = router;
