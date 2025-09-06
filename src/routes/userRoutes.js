// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
} = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// ✅ Multer setup for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profilePics/'); // save to uploads/profilePics
  },
  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() + '-' + file.fieldname + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

// Register new user
router.post('/register', registerUser);

// Get all users (admin use)
router.get('/', auth, getAllUsers);

// Get a single user by ID
router.get('/:id', auth, getUser);

// ✅ Update user by ID (with optional profilePic upload)
router.put('/:id', auth, upload.single('profilePic'), updateUser);

module.exports = router;
