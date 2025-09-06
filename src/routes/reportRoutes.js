// backend/src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { createReport, getReports, updateReportStatus } = require('../controllers/reportController');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinaryConfig'); // ✅ use Cloudinary storage

// Multer setup (now with Cloudinary)
const upload = multer({ storage });

// Routes (protected with auth)
router.post('/', auth, upload.single('photo'), createReport);
router.get('/', auth, getReports);
router.put('/:id/status', auth, updateReportStatus);

module.exports = router;
