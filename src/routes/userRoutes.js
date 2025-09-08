const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');

const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
  changePassword, // ✅ import new controller
} = require('../controllers/userController');

const { cloudinary, profileStorage } = require('../config/cloudinaryConfig');

const upload = multer({ storage: profileStorage });

// Register new user
router.post('/register', registerUser);

// Get all users
router.get('/', auth, getAllUsers);

// ✅ Change password (must be BEFORE "/:id")
router.put('/change-password', auth, changePassword);

// Get a single user
router.get('/:id', auth, getUser);

// Update user (bio + profilePic)
router.put('/:id', auth, upload.single('profilePic'), updateUser);

module.exports = router;
