require('dotenv').config();

const express = require('express');
const connectDB = require('./src/config/db');
const path = require('path');
const cors = require('cors');
const { autoResolveReports } = require('./src/jobs/autoResolveReports');

const app = express();

// Connect Database
connectDB();

// Auto-resolve job - Run every 6 hours
setInterval(async () => {
  console.log('Running scheduled auto-resolve job...');
  await autoResolveReports();
}, 6 * 60 * 60 * 1000);

// Run immediately on startup
setTimeout(async () => {
  console.log('Running initial auto-resolve job...');
  await autoResolveReports();
}, 10000);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static public pages
app.use(express.static(path.join(__dirname, 'public')));

// Account deletion page
app.get('/delete-account', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'delete-account.html'));
});

// API Routes
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/reports', require('./src/routes/reportRoutes'));
app.use('/api/migration', require('./src/routes/migrationRoutes'));

const adminBuildPath = path.join(__dirname, 'admin-dashboard-build');

// Serve admin dashboard
app.use('/admin', express.static(adminBuildPath));
app.use('/admin/static', express.static(path.join(adminBuildPath, 'static')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminBuildPath, 'index.html'));
});

// Root
app.get('/', (req, res) => {
  res.status(200).json({ service: 'EcoCheck Backend', status: 'ok' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
