const User = require('../models/user');

// Register new user
exports.registerUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, email, contactNumber, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const user = await User.create({ firstName, middleInitial, lastName, email, contactNumber, password });

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create admin
exports.createAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can create admins' });
    }

    const { firstName, lastName, email, contactNumber, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ firstName, lastName, email, contactNumber, password, role: 'admin' });

    res.status(201).json({ message: 'Admin created successfully', user });
  } catch (err) {
    console.error('Create admin error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Other CRUD: getUser, updateUser, getAllUsers, changePassword, updateProfilePic
// (Your current versions, as previously shared)
