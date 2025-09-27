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
