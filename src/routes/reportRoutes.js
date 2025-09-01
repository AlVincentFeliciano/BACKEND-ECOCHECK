const express = require('express');
const router = express.Router();
const { createReport, getReports, updateReportStatus } = require('../controllers/reportController');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Routes (protected with auth)
router.post('/', auth, upload.single('photo'), createReport);
router.get('/', auth, getReports);
router.put('/:id/status', auth, updateReportStatus);

module.exports = router;
