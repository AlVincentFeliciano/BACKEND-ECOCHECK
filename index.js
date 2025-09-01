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
app.use('/uploads', express.static('uploads'));


// ✅ Define Routes
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));

// ✅ Serve static assets if in production 
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'));
    app.get('/*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
