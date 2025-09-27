const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware'); // ✅ combined middlewares

const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
  changePassword,
  updateProfilePic,
  createAdmin, // ✅ add createAdmin controller
} = require('../controllers/userController');

const { profileStorage } = require('../config/cloudinaryConfig');
const upload = multer({ storage: profileStorage });

// Register new user
router.post('/register', registerUser);

// ✅ Superadmin can create new admins
router.post('/create-admin', authMiddleware, isSuperAdmin, createAdmin);

// Get all users
router.get('/', authMiddleware, getAllUsers);

// Change password
router.put('/change-password', authMiddleware, changePassword);

// Update profile picture only
router.put('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);

// Get a single user
router.get('/:id', authMiddleware, getUser);

// Update user (bio + profilePic)
router.put('/:id', authMiddleware, upload.single('profilePic'), updateUser);

module.exports = router;
