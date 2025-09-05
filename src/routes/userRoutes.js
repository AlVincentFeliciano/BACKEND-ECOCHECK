// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
} = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// Register new user
router.post('/register', registerUser);

// Get all users (admin use)
router.get('/', auth, getAllUsers);

// Get a single user by ID
router.get('/:id', auth, getUser);

// Update user by ID
router.put('/:id', auth, updateUser);

module.exports = router;
