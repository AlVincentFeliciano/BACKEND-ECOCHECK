const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createReport, getReports, updateReportStatus } = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinaryConfig');

const upload = multer({ storage });

router.post('/', authMiddleware, upload.single('photo'), createReport);
router.get('/', authMiddleware, getReports);
router.put('/:id/status', authMiddleware, updateReportStatus);

module.exports = router;
