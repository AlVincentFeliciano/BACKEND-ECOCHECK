const Report = require('../models/report');
const User = require('../models/user');

// Create a new report
const createReport = async (req, res) => {
  try {
    const { 
      name, firstName, middleName, lastName, 
      contact, description, location, userLocation, landmark, latitude, longitude 
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    const photoUrl = req.file.path; // Cloudinary URL

    // Create display name from individual name fields
    let displayName = name;
    if (firstName || lastName) {
      const nameComponents = [firstName, middleName, lastName].filter(Boolean);
      displayName = nameComponents.join(' ') || name;
    }

    // Get user's registered location if not provided
    let finalUserLocation = userLocation;
    if (!finalUserLocation) {
      const user = await User.findById(req.user.id);
      finalUserLocation = user?.location || null;
    }

    const newReport = await Report.create({
      name: displayName,
      firstName,
      middleName,
      lastName,
      contact,
      description,
      location, // Geocoded address for display
      userLocation: finalUserLocation, // User's registered location for filtering
      landmark,
      latitude,
      longitude,
      photoUrl,
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
    console.log('📊 Get Reports - User:', req.user);
    let reports;
    if (req.user.role === 'superadmin') {
      // Superadmin sees ALL reports
      reports = await Report.find().populate('user', 'firstName lastName email');
      console.log('📊 Superadmin - Total reports:', reports.length);
    } else if (req.user.role === 'admin') {
      // Admin sees only reports from their assigned location
      if (!req.user.location) {
        console.log('❌ Admin location not set');
        return res.status(403).json({ error: 'Admin location not set. Contact superadmin.' });
      }
      console.log('📊 Filtering reports by userLocation:', req.user.location);
      reports = await Report.find({ userLocation: req.user.location }).populate('user', 'firstName lastName email');
      console.log('📊 Admin reports found:', reports.length);
      
      // Debug: Show all report locations
      const allReports = await Report.find();
      console.log('📊 All report userLocations in DB:', allReports.map(r => ({ id: r._id, userLocation: r.userLocation, location: r.location })));
    } else {
      // Regular users see only their own reports
      reports = await Report.find({ user: req.user.id }).populate('user', 'firstName lastName email');
      console.log('📊 User reports found:', reports.length);
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

    const validStatuses = ['Pending', 'On Going', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && report.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Award points if report is resolved
    if (status === 'Resolved' && report.status !== 'Resolved') {
      const user = await User.findById(report.user);
      if (user) {
        user.points += 10;
        await user.save();
      }
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
