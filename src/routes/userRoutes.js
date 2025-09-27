const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, isSuperAdmin } = require('../middleware/authMiddleware');
const { createAdmin, getAllUsers, updateUser, getUser, changePassword, updateProfilePic } = require('../controllers/userController');
const { profileStorage } = require('../config/cloudinaryConfig');
const upload = multer({ storage: profileStorage });

router.post('/register', registerUser);
router.post('/create-admin', authMiddleware, isSuperAdmin, createAdmin);
router.get('/', authMiddleware, getAllUsers);
router.get('/:id', authMiddleware, getUser);
router.put('/:id', authMiddleware, upload.single('profilePic'), updateUser);
router.put('/change-password', authMiddleware, changePassword);
router.put('/profile-pic', authMiddleware, upload.single('profilePic'), updateProfilePic);

module.exports = router;
