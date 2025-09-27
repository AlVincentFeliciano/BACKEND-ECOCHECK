// backend/src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { createReport, getReports, updateReportStatus } = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware'); // ✅ destructured correctly
const { storage } = require('../config/cloudinaryConfig'); // ✅ Cloudinary storage

// Multer setup (Cloudinary storage)
const upload = multer({ storage });

// Routes (all protected by authMiddleware)
router.post('/', authMiddleware, upload.single('photo'), createReport);
router.get('/', authMiddleware, getReports);
router.put('/:id/status', authMiddleware, updateReportStatus);

module.exports = router;
