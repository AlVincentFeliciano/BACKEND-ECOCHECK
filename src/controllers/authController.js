const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Register a new user
exports.registerUser = async (req, res) => {
  let { firstName, middleInitial, lastName, email, contactNumber, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !contactNumber || !password) {
      return res.status(400).json({ 
        message: 'All required fields must be provided (firstName, lastName, email, contactNumber, password)' 
      });
    }

    // Validate contact number format (should start with +63 and have 13 characters total)
    if (!contactNumber.startsWith('+63') || contactNumber.length !== 13) {
      return res.status(400).json({ 
        message: 'Contact number must be in format +63XXXXXXXXXX (13 characters)' 
      });
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
      password, // raw password, schema hook will hash
      role: email.includes('@admin.com') ? 'admin' : 'user',
    });

    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token });
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
      console.log(`⚠️ Login failed, no user found: ${email}`);
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`⚠️ Login failed, password mismatch for: ${email}`);
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    console.log(`✅ Login successful: ${email}`);
    res.json({ token });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// Register a new admin (Head admin only)
exports.registerAdmin = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    // Check if requester is head admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create new admin accounts' });
    }

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }

    // Create new admin user
    user = new User({
      firstName: 'Admin',
      lastName: 'User',
      email,
      contactNumber: '+63000000000', // Default contact for admin
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

// Get all admins (Admin only)
exports.getAdmins = async (req, res) => {
  try {
    // Check if requester is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
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

// Delete admin (Head admin only)
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if requester is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete admin accounts' });
    }

    // Prevent admin from deleting themselves
    if (requestingUser._id.toString() === adminId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
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
