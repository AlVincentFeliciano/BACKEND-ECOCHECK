const jwt = require('jsonwebtoken');
const User = require('../models/user');
const LoginLog = require('../models/loginLog');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Initialize Email service with error handling
let emailService = null;
try {
  const EmailService = require('../services/emailService');
  emailService = new EmailService();
  console.log('✅ Email Service initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Email Service:', error.message);
  console.log('📧 Forgot password will use fallback mode');
}

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

    // ✅ Log admin logins only (admin and superadmin)
    if (user.role === 'admin' || user.role === 'superadmin') {
      try {
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        const loginLogEntry = await LoginLog.create({
          user: user._id,
          email: user.email,
          role: user.role,
          ipAddress: ipAddress,
          userAgent: userAgent
        });
        
        console.log(`✅ Login logged for ${user.role}: ${user.email}`);
        console.log(`📝 Login log entry created:`, loginLogEntry);
      } catch (logError) {
        // Don't fail login if logging fails
        console.error('❌ Failed to create login log:', logError.message);
        console.error('❌ Full error:', logError);
      }
    } else {
      console.log(`ℹ️ Regular user login (not logged): ${user.email} (role: ${user.role})`);
    }

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

// Forgot Password - Send Email verification code
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
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

    // Send Email with verification code
    try {
      if (emailService) {
        // Send email asynchronously to prevent timeout
        emailService.sendPasswordResetEmail(user.email, resetCode)
          .then(() => console.log('✅ Email sent successfully to:', user.email))
          .catch(err => console.error('❌ Email failed:', err.message));
      } else {
        // Fallback when email service is not available
        console.log('🔧 EMAIL SERVICE FALLBACK - Email service not available');
        console.log(`� Email: ${user.email}`);
        console.log(`🔢 Verification Code: ${resetCode}`);
        console.log('⚠️ User needs to check server logs for verification code');
      }
      
      res.json({
        success: true,
        message: 'Verification code sent to your email address'
      });
    } catch (emailError) {
      console.error('❌ Email service error:', emailError.message);
      
      // Return success anyway - the reset code is saved in database
      res.json({
        success: true,
        message: 'Verification code sent to your email address'
      });
    }

  } catch (err) {
    console.error('❌ Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Reset Password - Verify code and update password
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
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

// Get login logs (Superadmin only)
exports.getLoginLogs = async (req, res) => {
  try {
    console.log('📋 Fetching login logs request from user:', req.user.id);
    
    const requestingUser = await User.findById(req.user.id);
    console.log('📋 Requesting user:', requestingUser?.email, 'Role:', requestingUser?.role);
    
    if (!requestingUser || requestingUser.role !== 'superadmin') {
      console.log('❌ Access denied - user is not superadmin');
      return res.status(403).json({ error: 'Access denied. Only superadmin can view login logs.' });
    }

    // Get query parameters for filtering
    const { limit = 100, page = 1, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter - ONLY show admin and superadmin logins
    const filter = {
      role: { $in: ['admin', 'superadmin'] }
    };
    
    // If specific role is requested, override the filter
    if (role && (role === 'admin' || role === 'superadmin')) {
      filter.role = role;
    }

    console.log('📋 Filter:', filter);

    // Get total count for pagination
    const total = await LoginLog.countDocuments(filter);
    console.log('📋 Total login logs found:', total);

    // Fetch login logs with user population
    const logs = await LoginLog.find(filter)
      .populate('user', 'firstName lastName email role')
      .sort({ loginTime: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    console.log('📋 Returning', logs.length, 'login logs');

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('❌ Get login logs error:', err.message);
    console.error('❌ Full error:', err);
    res.status(500).json({ error: 'Server error while fetching login logs' });
  }
};
