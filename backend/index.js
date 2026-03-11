// index.js
require('dotenv').config();

const express = require('express');
const connectDB = require('./src/config/db');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { autoResolveReports } = require('./src/jobs/autoResolveReports');

const app = express();

// ✅ Connect Database
connectDB();

// ✅ Auto-resolve job - Run every 6 hours
setInterval(async () => {
  console.log('⏰ Running scheduled auto-resolve job...');
  await autoResolveReports();
}, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

// Run immediately on startup
setTimeout(async () => {
  console.log('🚀 Running initial auto-resolve job...');
  await autoResolveReports();
}, 10000); // Wait 10 seconds after startup

// ✅ Middleware
app.use(cors({
  origin: '*'
}));

app.use(express.json()); // handles JSON requests
app.use(express.urlencoded({ extended: true })); // handles form submissions

// ✅ Serve uploads folder publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Serve static public pages
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Account deletion page
app.get('/delete-account', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delete-account.html'));
});

// ✅ Define API Routes
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));
app.use('/api/migration', require('./src/routes/migrationRoutes'));

// Keep API routes above this section
// app.use('/api', ...);

// Admin dashboard should be at /admin (not /)
const adminBuildCandidates = [
  path.join(__dirname, 'public', 'admin-dashboard'),
  path.join(__dirname, 'admin-dashboard-build'), // fallback for current structure
];
const adminBuildPath = adminBuildCandidates.find((p) => fs.existsSync(p));

if (adminBuildPath) {
  app.use('/admin', express.static(adminBuildPath));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminBuildPath, 'index.html'));
  });
}

// Backend root
app.get('/', (req, res) => {
  res.status(200).json({ service: 'backend', status: 'ok' });
});

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
