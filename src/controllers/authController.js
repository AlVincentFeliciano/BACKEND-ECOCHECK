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
    const { firstName, middleInitial, lastName, email, contactNumber, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({
      firstName,
      middleInitial,
      lastName,
      email,
      contactNumber,
      password,
    });

    res.status(201).json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      contactNumber: user.contactNumber,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({ message: 'Server error while registering user' });
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

// ✅ Register admin (Protected)
exports.registerAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, contactNumber, password } = req.body;

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: 'Email already exists' });

    const admin = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password,
      role: 'admin',
    });

    res.status(201).json({ message: 'Admin registered successfully', admin });
  } catch (error) {
    console.error('Register Admin Error:', error.message);
    res.status(500).json({ message: 'Server error while registering admin' });
  }
};

// ✅ Get all admins
exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    console.error('Get Admins Error:', error.message);
    res.status(500).json({ message: 'Server error while fetching admins' });
  }
};

// ✅ Delete an admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const admin = await User.findById(adminId);

    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    await admin.deleteOne();
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete Admin Error:', error.message);
    res.status(500).json({ message: 'Server error while deleting admin' });
  }
};

// ✅ Forgot Password (via contact number)
exports.forgotPassword = async (req, res) => {
  try {
    const { contactNumber } = req.body;

    if (!contactNumber) {
      return res.status(400).json({ message: 'Contact number is required' });
    }

    // 🔍 Find user by contact number
    const user = await User.findOne({ contactNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🟢 Generate random 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save reset code in DB
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000; // expires in 10 mins
    await user.save();

    // Log reset code (simulating SMS)
    console.log(`📱 Reset code for ${contactNumber}: ${resetCode}`);

    res.status(200).json({
      message: 'Reset code sent successfully. Please check your SMS (mock log).',
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error while processing forgot password' });
  }
};
