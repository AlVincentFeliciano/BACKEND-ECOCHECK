const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinaryConfig');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getUser, updateUser, getAllUsers, changePassword, updateProfilePic } = require('../controllers/userController');

const upload = multer({ storage });

// Get current logged-in user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await require('../models/user').findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        middleInitial: user.middleInitial,
        lastName: user.lastName,
        email: user.email,
        contactNumber: user.contactNumber,
        bio: user.bio,
        profilePic: user.profilePic || '',
        points: user.points || 0,
        role: user.role,
        isActive: user.isActive !== false,
      },
    });
  } catch (err) {
    console.error('❌ Fetch user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, upload.single('profilePic'), updateUser);
router.put('/change-password/me', authMiddleware, changePassword);
router.put('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);
router.get('/', authMiddleware, getAllUsers);

module.exports = router;
