const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinaryConfig');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getUser, updateUser, getAllUsers, changePassword, updateProfilePic } = require('../controllers/userController');

const upload = multer({ storage });

router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, upload.single('profilePic'), updateUser);
router.put('/change-password/me', authMiddleware, changePassword);
router.put('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);
router.get('/', authMiddleware, getAllUsers);

module.exports = router;
