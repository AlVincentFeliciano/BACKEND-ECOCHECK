// index.js
require('dotenv').config();

const express = require('express');
const connectDB = require('./src/config/db');
const path = require('path');
const cors = require('cors');

const app = express();

// ✅ Connect Database
connectDB();

// ✅ Middleware
app.use(cors());
app.use(express.json()); // handles JSON requests
app.use(express.urlencoded({ extended: true })); // handles form submissions

// ✅ Serve uploads folder publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Define API Routes
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));

// ✅ Serve admin dashboard (React build) for web
if (process.env.NODE_ENV === 'production') {
    // Make sure 'admin-dashboard-build' folder is at the same level as index.js
    app.use(express.static(path.join(__dirname, 'admin-dashboard-build')));

    // For any route not matching an API, serve index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'admin-dashboard-build', 'index.html'));
    });
}

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
