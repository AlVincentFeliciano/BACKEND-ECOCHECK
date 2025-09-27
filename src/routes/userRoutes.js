const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware'); // ✅ unified auth + role check

const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
  changePassword,
  updateProfilePic,
  createAdmin,
} = require('../controllers/userController');

const { profileStorage } = require('../config/cloudinaryConfig');

// Configure multer for profile image uploads
const upload = multer({ storage: profileStorage });

// Register new user
router.post('/register', registerUser);

// Create new admin (only for superadmins)
router.post('/create-admin', auth('superadmin'), createAdmin);

// Get all users (any logged-in user)
router.get('/', auth(), getAllUsers);

// Change password
router.put('/change-password', auth(), changePassword);

// Update profile picture only
router.put('/profile-pic', auth(), upload.single('profilePic'), updateProfilePic);

// Get a single user
router.get('/:id', auth(), getUser);

// Update user info (bio, profilePic)
router.put('/:id', auth(), upload.single('profilePic'), updateUser);

module.exports = router;
