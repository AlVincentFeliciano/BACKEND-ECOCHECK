const User = require('../models/user');

// Register new user
exports.registerUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, email, contactNumber, password, bio } = req.body;

    if (!firstName || !lastName || !email || !contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'All required fields are missing' });
    }

    if (!/^09\d{9}$/.test(contactNumber)) {
      return res.status(400).json({ success: false, message: 'Contact number must be 11 digits and start with 09' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const existingContact = await User.findOne({ contactNumber });
    if (existingContact) {
      return res.status(400).json({ success: false, message: 'Contact number already registered' });
    }

    const user = new User({
      firstName,
      middleInitial: middleInitial || '',
      lastName,
      email: email.toLowerCase().trim(),
      contactNumber,
      password,
      bio: bio || '',
      profilePic: req.file ? (req.file.path || req.file.secure_url) : ''
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
        points: user.points
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single user
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
        points: user.points || 0
      }
    });
  } catch (err) {
    console.error('❌ Get user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, contactNumber, bio } = req.body;
    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (middleInitial !== undefined) updateFields.middleInitial = middleInitial;
    if (lastName) updateFields.lastName = lastName;

    if (contactNumber) {
      if (!/^09\d{9}$/.test(contactNumber)) {
        return res.status(400).json({ success: false, message: 'Contact number must be 11 digits and start with 09' });
      }

      const existingContact = await User.findOne({ contactNumber, _id: { $ne: req.params.id } });
      if (existingContact) {
        return res.status(400).json({ success: false, message: 'Contact number already registered by another user' });
      }

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
        points: user.points
      }
    });
  } catch (err) {
    console.error('❌ Update user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users
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
      points: u.points || 0,
      role: u.role || 'user'
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ Get all users error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both fields are required' });
    }

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

// Update profile picture only
exports.updateProfilePic = async (req, res) => {
  try {
    if (!req.file || (!req.file.path && !req.file.secure_url)) {
      return res.status(400).json({ success: false, message: 'No profile picture provided' });
    }

    const profilePicUrl = req.file.path || req.file.secure_url;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: profilePicUrl },
      { new: true }
    ).select('-password');

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
        points: user.points
      }
    });
  } catch (err) {
    console.error('❌ Update profile pic error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create new admin (superadmin only)
exports.createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const admin = new User({
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('❌ Create admin error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
