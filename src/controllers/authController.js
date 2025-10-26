// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const LoginLog = require('../models/loginLog');
const EmailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// ✅ Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// ✅ Register User
const registerUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, email, contactNumber, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (!firstName || !lastName || !normalizedEmail || !contactNumber || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (contactNumber.length !== 11 || !/^\d{11}$/.test(contactNumber)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const existingContact = await User.findOne({ contactNumber });
    if (existingContact) return res.status(400).json({ message: 'Contact number already registered' });

    const user = new User({
      firstName,
      middleInitial,
      lastName,
      email: normalizedEmail,
      contactNumber,
      password,
      role: 'user',
    });

    await user.save();
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      role: user.role,
      message: 'User registered successfully',
    });
  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact support.' });
    }

    const token = generateToken(user);

    // Log login attempts for admin/superadmin only
    if (['admin', 'superadmin'].includes(user.role)) {
      try {
        await LoginLog.create({
          user: user._id,
          email: user.email,
          role: user.role,
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
          userAgent: req.headers['user-agent'] || 'Unknown',
        });
      } catch (logError) {
        console.error('❌ Failed to create login log:', logError.message);
      }
    }

    res.json({
      success: true,
      token,
      role: user.role,
      message: 'Login successful',
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Register Admin (protected)
const registerAdmin = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only superadmin can add admins.' });
    }

    const { firstName, middleInitial, lastName, email, contactNumber, password, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or superadmin.' });
    }

    const existingAdmin = await User.findOne({ email: normalizedEmail });
    if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

    const admin = new User({
      firstName,
      middleInitial,
      lastName,
      email: normalizedEmail,
      contactNumber,
      password,
      role,
    });

    await admin.save();
    res.status(201).json({ success: true, message: 'Admin registered successfully' });
  } catch (err) {
    console.error('❌ Admin registration error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get Admins
const getAdmins = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only superadmin can view admins.' });
    }

    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('-password');
    res.json(admins);
  } catch (err) {
    console.error('❌ Get admins error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Delete Admin
const deleteAdmin = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only superadmin can delete admins.' });
    }

    const { adminId } = req.params;
    const deletedAdmin = await User.findByIdAndDelete(adminId);
    if (!deletedAdmin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err) {
    console.error('❌ Delete admin error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Update Admin (Deactivate/Reactivate)
const updateAdmin = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Only superadmin can update admins.' });
    }

    const { adminId } = req.params;
    const { isActive } = req.body;

    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (!['admin', 'superadmin'].includes(admin.role)) {
      return res.status(400).json({ message: 'User is not an admin' });
    }

    admin.isActive = isActive;
    await admin.save();

    res.json({ success: true, message: 'Admin updated successfully', admin: { ...admin._doc, password: undefined } });
  } catch (err) {
    console.error('❌ Update admin error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Generate a 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000);

    // Save code & expiry to user document
    user.resetCode = resetCode;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send email
    const emailService = new EmailService();
    await emailService.sendPasswordResetEmail(user.email, resetCode);

    res.json({
      success: true,
      message: 'Password reset code sent to email'
    });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.resetCode !== Number(resetCode) || Date.now() > user.resetCodeExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
    }

    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Get Login Logs
const getLoginLogs = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only superadmin can view login logs.' });
    }

    const limit = parseInt(req.query.limit) || 100;
    const logs = await LoginLog.find()
      .populate('user', 'email role firstName lastName')
      .sort({ loginTime: -1 })
      .limit(limit);
    
    console.log('✅ Fetched login logs:', logs.length);
    
    res.json({ 
      success: true, 
      data: logs,
      count: logs.length 
    });
  } catch (err) {
    console.error('❌ Get login logs error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ✅ Logout User (Record logout time)
const logoutUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only track logout for admin/superadmin
    if (['admin', 'superadmin'].includes(userRole)) {
      // Find the most recent login log for this user without a logout time
      const loginLog = await LoginLog.findOne({
        user: userId,
        logoutTime: null
      }).sort({ loginTime: -1 });

      if (loginLog) {
        loginLog.logoutTime = new Date();
        await loginLog.save();
        console.log('✅ Logout time recorded for:', loginLog.email);
      }
    }

    res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('❌ Logout error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  registerAdmin,
  getAdmins,
  deleteAdmin,
  updateAdmin,
  forgotPassword,
  resetPassword,
  getLoginLogs,
  logoutUser,
};
