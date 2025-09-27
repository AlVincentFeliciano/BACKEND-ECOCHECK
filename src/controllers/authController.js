const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Register a new user
exports.registerUser = async (req, res) => {
  let { firstName, middleInitial, lastName, email, contactNumber, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    if (!firstName || !lastName || !email || !contactNumber || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // ✅ Contact number validation (Philippines: 11 digits only, no +63 here)
    if (contactNumber.length !== 11 || !/^\d{11}$/.test(contactNumber)) {
      return res.status(400).json({ message: 'Contact number must be exactly 11 digits' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Check if contact number already exists
    const existingContact = await User.findOne({ contactNumber });
    if (existingContact) {
      return res.status(400).json({ message: 'Contact number already registered' });
    }

    user = new User({
      firstName,
      middleInitial,
      lastName,
      email,
      contactNumber,
      password, // schema will hash
      role: 'user', // ✅ Always register as regular user here
    });

    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      token,
      role: user.role
    });
  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Login an existing user
exports.loginUser = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Check if user account is active
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact support.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      role: user.role // ✅ frontend can check role
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Register a new admin (Superadmin only)
exports.registerAdmin = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can create new admins' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    user = new User({
      firstName: 'Admin',
      lastName: 'User',
      email,
      contactNumber: '00000000000', // ✅ placeholder 11-digit
      password,
      role: 'admin'
    });

    await user.save();

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        _id: user._id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Admin registration error:', err.message);
    res.status(500).json({ error: 'Server error while creating admin' });
  }
};

// Get all admins (Superadmin only)
exports.getAdmins = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const admins = await User.find({ role: 'admin' })
      .select('email createdAt')
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (err) {
    console.error('❌ Get admins error:', err.message);
    res.status(500).json({ error: 'Server error while fetching admins' });
  }
};

// Delete admin (Superadmin only)
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can delete admin accounts' });
    }

    const adminToDelete = await User.findById(adminId);
    if (!adminToDelete) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (adminToDelete.role !== 'admin') {
      return res.status(400).json({ error: 'User is not an admin' });
    }

    await User.findByIdAndDelete(adminId);

    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    console.error('❌ Delete admin error:', err.message);
    res.status(500).json({ error: 'Server error while deleting admin' });
  }
};

// Forgot Password - Send SMS verification code
exports.forgotPassword = async (req, res) => {
  try {
    const { contactNumber } = req.body;

    if (!contactNumber) {
      return res.status(400).json({ message: 'Contact number is required' });
    }

    // Find user by contact number
    const user = await User.findOne({ contactNumber: contactNumber.trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this contact number' });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact support.' });
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Update user with reset code
    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    // TODO: Integrate with SMS service (Twilio, etc.)
    // For now, we'll log the code for testing purposes
    console.log(`🔐 SMS Verification Code for ${contactNumber}: ${resetCode}`);
    
    // In production, you would send SMS here:
    // await sendSMS(contactNumber, `Your EcoCheck verification code is: ${resetCode}. This code expires in 10 minutes.`);

    res.json({
      success: true,
      message: 'Verification code sent to your mobile number',
      // Remove this in production - only for testing
      resetCode: process.env.NODE_ENV === 'development' ? resetCode : undefined
    });

  } catch (err) {
    console.error('❌ Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Reset Password - Verify code and update password
exports.resetPassword = async (req, res) => {
  try {
    const { contactNumber, resetCode, newPassword } = req.body;

    if (!contactNumber || !resetCode || !newPassword) {
      return res.status(400).json({ message: 'Contact number, verification code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user by contact number
    const user = await User.findOne({ contactNumber: contactNumber.trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this contact number' });
    }

    // Check if reset code exists and hasn't expired
    if (!user.resetCode || !user.resetCodeExpires) {
      return res.status(400).json({ message: 'No active password reset request found' });
    }

    if (user.resetCode !== resetCode.trim()) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > user.resetCodeExpires) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Update password and clear reset fields
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (err) {
    console.error('❌ Reset password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
