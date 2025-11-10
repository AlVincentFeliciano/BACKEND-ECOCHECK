const User = require('../models/user');

// Register new user
const registerUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, email, contactNumber, password, bio } = req.body;

    if (!firstName || !lastName || !email || !contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'All required fields are missing' });
    }

    if (!/^09\d{9}$/.test(contactNumber)) {
      return res.status(400).json({ success: false, message: 'Contact number must be 11 digits and start with 09' });
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
      profilePic: req.file ? (req.file.secure_url || req.file.path) : ''
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
const getUser = async (req, res) => {
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
        points: user.points || 0,
        isActive: user.isActive !== false
      }
    });
  } catch (err) {
    console.error('❌ Get user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, contactNumber, bio, isActive } = req.body;
    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (middleInitial !== undefined) updateFields.middleInitial = middleInitial;
    if (lastName) updateFields.lastName = lastName;
    if (isActive !== undefined) updateFields.isActive = isActive;

    if (contactNumber) {
      if (!/^09\d{9}$/.test(contactNumber)) {
        return res.status(400).json({ success: false, message: 'Contact number must be 11 digits and start with 09' });
      }

      const existingContact = await User.findOne({ contactNumber, _id: { $ne: req.params.id } });
      if (existingContact) return res.status(400).json({ success: false, message: 'Contact number already registered by another user' });

      updateFields.contactNumber = contactNumber;
    }

    if (bio !== undefined) updateFields.bio = bio;

    if (req.file && (req.file.path || req.file.secure_url)) {
      updateFields.profilePic = req.file.secure_url || req.file.path;
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
        points: user.points,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error('❌ Update user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    console.log('📊 Get Users - User:', req.user);
    let query = {};
    
    // Filter by location for admins
    if (req.user.role === 'admin') {
      if (!req.user.location) {
        console.log('❌ Admin location not set');
        return res.status(403).json({ success: false, message: 'Admin location not set. Contact superadmin.' });
      }
      console.log('📊 Filtering users by location:', req.user.location);
      query.location = req.user.location;
    }
    // Superadmin sees all users (no filter)
    
    const users = await User.find(query).select('-password');
    console.log('📊 Users found:', users.length);
    
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
      role: u.role || 'user',
      location: u.location || '',
      isActive: u.isActive !== false
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ Get all users error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both fields are required' });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId);
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

// Update profile picture
const updateProfilePic = async (req, res) => {
  try {
    console.log('📸 Uploaded file:', req.file);

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, msg: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ success: false, msg: 'No image uploaded' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

    const imageUrl = req.file.secure_url || req.file.path;
    if (!imageUrl) return res.status(500).json({ success: false, msg: 'Failed to get uploaded image URL' });

    user.profilePic = imageUrl;
    await user.save();

    res.json({
      success: true,
      msg: 'Profile picture updated successfully',
      profilePic: user.profilePic
    });
  } catch (error) {
    console.error('❌ Update profile picture error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error updating profile picture',
      error: error.message,
      stack: error.stack
    });
  }
};

// Create admin
const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) return res.status(400).json({ success: false, message: 'User with this email already exists' });

    const admin = new User({ email: email.toLowerCase().trim(), password, role: 'admin' });
    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { id: admin._id, email: admin.email, role: admin.role }
    });
  } catch (err) {
    console.error('❌ Create admin error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Export all controllers
module.exports = {
  registerUser,
  getUser,
  updateUser,
  getAllUsers,
  changePassword,
  updateProfilePic,
  createAdmin
};
