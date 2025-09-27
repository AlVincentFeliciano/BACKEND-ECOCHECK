const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const { isSuperAdmin } = require('../middleware/roleMiddleware'); // ✅ import role check

const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
  changePassword,
  updateProfilePic,
  createAdmin, // ✅ import createAdmin
} = require('../controllers/userController');

const { cloudinary, profileStorage } = require('../config/cloudinaryConfig');

const upload = multer({ storage: profileStorage });

// Register new user
router.post('/register', registerUser);

// ✅ Create new admin (superadmin only)
router.post('/create-admin', auth, isSuperAdmin, createAdmin);

// Get all users
router.get('/', auth, getAllUsers);

// Change password
router.put('/change-password', auth, changePassword);

// Update profile picture only
router.put('/profile-pic', auth, upload.single('profilePic'), updateProfilePic);

// Get a single user
router.get('/:id', auth, getUser);

// Update user (bio + profilePic)
router.put('/:id', auth, upload.single('profilePic'), updateUser);

module.exports = router;
