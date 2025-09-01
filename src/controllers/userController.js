// backend/src/controllers/userController.js

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // TODO: save user in DB (using mongoose)
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    // TODO: fetch from DB
    res.json([{ id: 1, name: 'John Doe' }]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
