const express = require('express');
const router = express.Router();
const multer = require('multer');

const { createReport, getReports, updateReportStatus } = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware'); // ✅ auth middleware
const { storage } = require('../config/cloudinaryConfig'); // ✅ Cloudinary storage

// Multer setup (Cloudinary storage)
const upload = multer({ storage });

// Routes (all protected by auth)
router.post('/', auth, upload.single('photo'), createReport);
router.get('/', auth, getReports);
router.put('/:id/status', auth, updateReportStatus);

module.exports = router;
