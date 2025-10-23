const express = require('express');
const router = express.Router();
const multer = require('multer');
const { reportStorage, profileStorage } = require('../config/cloudinaryConfig');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getUser,
  updateUser,
  getAllUsers,
  changePassword,
  updateProfilePic
} = require('../controllers/userController');

const uploadReport = multer({ storage: reportStorage });
const uploadProfile = multer({ storage: profileStorage });

// Get current logged-in user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await require('../models/user').findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

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
        isActive: user.isActive !== false
      }
    });
  } catch (err) {
    console.error('❌ Fetch user error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

router.put('/change-password/me', authMiddleware, changePassword);
router.put('/profile-pic', authMiddleware, uploadProfile.single('profilePic'), updateProfilePic);
router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, uploadProfile.single('profilePic'), updateUser);

router.get('/', authMiddleware, getAllUsers);

module.exports = router;
