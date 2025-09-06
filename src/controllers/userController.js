// backend/src/controllers/userController.js
const User = require('../models/user');
const bcrypt = require('bcryptjs');

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if email already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      bio: bio || '',
      profilePic: req.file ? `/uploads/profilePics/${req.file.filename}` : ''
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic || null
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single user by ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic || null,
        points: user.points || 0,
      },
    });
  } catch (err) {
    console.error('❌ Get user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Update user by ID (supports bio + profilePic upload)
exports.updateUser = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;

    // ✅ Cloudinary: req.file.path is the uploaded URL
    if (req.file && req.file.path) {
      updateFields.profilePic = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic || null,
      },
    });
  } catch (err) {
    console.error('❌ Update user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // already returns points
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('❌ Get all users error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
