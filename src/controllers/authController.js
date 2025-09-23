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
