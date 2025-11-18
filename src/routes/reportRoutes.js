const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createReport, getReports, updateReportStatus, confirmResolution, rejectResolution } = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { reportStorage } = require('../config/cloudinaryConfig');
const Report = require('../models/report');

const upload = multer({ storage: reportStorage });

router.post('/', authMiddleware, upload.single('photo'), createReport);
router.get('/', authMiddleware, getReports);
router.put('/:id/status', authMiddleware, upload.single('resolutionPhoto'), updateReportStatus);
router.put('/:id', authMiddleware, upload.single('resolutionPhoto'), updateReportStatus); // Alternative route with photo upload
router.put('/:id/confirm', authMiddleware, confirmResolution); // User confirms resolution
router.put('/:id/reject', authMiddleware, rejectResolution); // User rejects resolution

// Debug endpoint to check report locations
router.get('/debug/locations', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const reports = await Report.find().select('location userLocation createdAt').populate('user', 'location');
    const userLocationCounts = {};
    reports.forEach(r => {
      const loc = r.userLocation || 'NULL';
      userLocationCounts[loc] = (userLocationCounts[loc] || 0) + 1;
    });
    res.json({
      totalReports: reports.length,
      userLocationCounts,
      sampleReports: reports.slice(0, 10).map(r => ({ 
        location: r.location, 
        userLocation: r.userLocation,
        userSignupLocation: r.user?.location
      })),
      adminLocation: req.user.location
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migration endpoint to populate userLocation field (superadmin only)
router.post('/migrate/fix-locations', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Superadmin only.' });
    }
    
    const User = require('../models/user');
    const reports = await Report.find().populate('user');
    let updated = 0;
    let failed = 0;
    const details = [];
    
    for (const report of reports) {
      if (report.user && report.user.location) {
        // Populate userLocation field from user's registered location
        if (!report.userLocation || report.userLocation !== report.user.location) {
          report.userLocation = report.user.location;
          await report.save();
          updated++;
          details.push({
            reportId: report._id,
            userLocation: report.userLocation,
            displayLocation: report.location
          });
        }
      } else {
        failed++;
        details.push({
          reportId: report._id,
          error: 'No user or user location found'
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Migration completed - userLocation field populated',
      updated,
      failed,
      total: reports.length,
      details: details.slice(0, 10) // Show first 10 for debugging
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
