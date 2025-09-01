const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Register a new user
exports.registerUser = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase().trim();

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    console.log("👉 Raw password from request:", password);

    user = new User({
      email,
      password, // raw password, schema will hash it
      role: email.includes('@admin.com') ? 'admin' : 'user',
    });

    await user.save();

    console.log("✅ User saved in DB:", user);

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

    const isMatch = await bcrypt.compare(password, user.password);
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
