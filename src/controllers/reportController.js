const Report = require('../models/Report');

// Create a new report
// src/controllers/reportController.js
const createReport = async (req, res) => {
  try {
    const { name, contact, description, location, latitude, longitude } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    // Force HTTPS for uploaded photos
    const photoUrl = `https://${req.get('host')}/uploads/${req.file.filename}`;

    const newReport = await Report.create({
      name,
      contact,
      description,
      location,
      latitude,
      longitude,
      photoUrl,       // <-- saved with HTTPS
      status: 'Pending',
      user: req.user.id,
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};


// Get all reports for the logged-in user
const getReports = async (req, res) => {
  try {
    let reports;

    // Admin sees all reports
    if (req.user.role === 'admin') {
      reports = await Report.find().populate('user', 'name email');
    } else {
      // Regular users see only their own reports
      reports = await Report.find({ user: req.user.id }).populate('user', 'name email');
    }

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update report status
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Pending', 'On Going', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Only admins or the report owner can update
    if (req.user.role !== 'admin' && report.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    report.status = status;
    await report.save();

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
};
