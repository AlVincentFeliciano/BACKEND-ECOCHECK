const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ✅ Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ✅ Register new user
exports.registerUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, email, contactNumber, password, bio, role } = req.body;

    if (!firstName || !lastName || !email || !contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'All required fields are missing' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const existingContact = await User.findOne({ contactNumber });
    if (existingContact) return res.status(400).json({ success: false, message: 'Contact number already registered' });

    const user = new User({
      firstName,
      middleInitial: middleInitial || '',
      lastName,
      email: email.toLowerCase().trim(),
      contactNumber,
      password,
      bio: bio || '',
      profilePic: req.file ? (req.file.path || req.file.secure_url) : '',
      role: role || 'user'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        middleInitial: user.middleInitial,
        lastName: user.lastName,
        email: user.email,
        contactNumber: user.contactNumber,
        bio: user.bio,
        profilePic: user.profilePic,
        role: user.role,
        points: user.points
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Create new admin (only superadmin)
exports.createAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only superadmin can create admins' });
    }

    const { firstName, middleInitial, lastName, email, contactNumber, password, bio } = req.body;
    if (!firstName || !lastName || !email || !contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'All required fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = new User({
      firstName,
      middleInitial: middleInitial || '',
      lastName,
      email: email.toLowerCase().trim(),
      contactNumber,
      password,
      bio: bio || '',
      role: 'admin'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Create admin error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Login user
exports.loginUser = async (req, res) => {
  try {
    const { contactNumber, password } = req.body;

    const user = await User.findOne({ contactNumber });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      contactNumber: user.contactNumber,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error while logging in' });
  }
};

// ✅ Get current logged-in user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('GetMe Error:', error.message);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
};

// ✅ Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const data = users.map(u => ({
      id: u._id,
      firstName: u.firstName,
      middleInitial: u.middleInitial,
      lastName: u.lastName,
      email: u.email,
      contactNumber: u.contactNumber,
      bio: u.bio,
      profilePic: u.profilePic || '',
      role: u.role,
      points: u.points || 0
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ Get all users error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
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
        role: user.role,
        points: user.points || 0
      }
    });
  } catch (err) {
    console.error('❌ Get user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Update user
exports.updateUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, contactNumber, bio } = req.body;
    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (middleInitial !== undefined) updateFields.middleInitial = middleInitial;
    if (lastName) updateFields.lastName = lastName;
    if (contactNumber) {
      if (!contactNumber.startsWith('+63') || contactNumber.length !== 13) {
        return res.status(400).json({ success: false, message: 'Contact number must be in format +63XXXXXXXXXX (13 characters)' });
      }
      const existingContact = await User.findOne({ contactNumber, _id: { $ne: req.params.id } });
      if (existingContact) return res.status(400).json({ success: false, message: 'Contact number already registered by another user' });
      updateFields.contactNumber = contactNumber;
    }
    if (bio !== undefined) updateFields.bio = bio;
    if (req.file && (req.file.path || req.file.secure_url)) {
      updateFields.profilePic = req.file.path || req.file.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        middleInitial: user.middleInitial,
        lastName: user.lastName,
        email: user.email,
        contactNumber: user.contactNumber,
        bio: user.bio,
        profilePic: user.profilePic,
        role: user.role,
        points: user.points
      }
    });
  } catch (err) {
    console.error('❌ Update user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both fields are required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('❌ Change password error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Update profile picture only
exports.updateProfilePic = async (req, res) => {
  try {
    if (!req.file || (!req.file.path && !req.file.secure_url)) {
      return res.status(400).json({ success: false, message: 'No profile picture provided' });
    }

    const profilePicUrl = req.file.path || req.file.secure_url;
    const user = await User.findByIdAndUpdate(req.user.id, { profilePic: profilePicUrl }, { new: true }).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        id: user._id,
        firstName: user.firstName,
        middleInitial: user.middleInitial,
        lastName: user.lastName,
        email: user.email,
        contactNumber: user.contactNumber,
        bio: user.bio,
        profilePic: user.profilePic,
        role: user.role,
        points: user.points
      }
    });
  } catch (err) {
    console.error('❌ Update profile pic error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { contactNumber } = req.body;
    if (!contactNumber) return res.status(400).json({ success: false, message: 'Contact number is required' });

    const user = await User.findOne({ contactNumber });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    console.log(`📱 Reset code for ${contactNumber}: ${resetCode}`); // mock SMS
    res.status(200).json({ success: true, message: 'Reset code sent successfully (mock SMS)' });
  } catch (err) {
    console.error('❌ Forgot password error:', err.message);
    res.status(500).json({ success: false, message: 'Server error while processing forgot password' });
  }
};

// ✅ Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { contactNumber, resetCode, newPassword } = req.body;

    const user = await User.findOne({
      contactNumber,
      resetCode,
      resetCodeExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });

    user.password = newPassword;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('❌ Reset password error:', err.message);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};
