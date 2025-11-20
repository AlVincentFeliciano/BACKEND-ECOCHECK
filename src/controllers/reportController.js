const Report = require('../models/report');
const User = require('../models/user');
const EmailService = require('../services/emailService');

const emailService = new EmailService();

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
      reports = await Report.find().populate('user', 'firstName lastName middleInitial email contactNumber');
      console.log('📊 Superadmin - Total reports:', reports.length);
    } else if (req.user.role === 'admin') {
      // Admin sees only reports from their assigned location
      if (!req.user.location) {
        console.log('❌ Admin location not set');
        return res.status(403).json({ error: 'Admin location not set. Contact superadmin.' });
      }
      console.log('📊 Filtering reports by userLocation:', req.user.location);
      reports = await Report.find({ userLocation: req.user.location }).populate('user', 'firstName lastName middleInitial email contactNumber');
      console.log('📊 Admin reports found:', reports.length);
      
      // Debug: Show all report locations
      const allReports = await Report.find();
      console.log('📊 All report userLocations in DB:', allReports.map(r => ({ id: r._id, userLocation: r.userLocation, location: r.location })));
    } else {
      // Regular users see only their own reports
      reports = await Report.find({ user: req.user.id }).populate('user', 'firstName lastName middleInitial email contactNumber');
      console.log('📊 User reports found:', reports.length);
    }
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update report status (with optional resolution photo)
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'On Going', 'Pending Confirmation', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const report = await Report.findById(id).populate('user', 'email firstName lastName');
    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && report.user._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const wasPendingConfirmation = report.status === 'Pending Confirmation';
    const isNowPendingConfirmation = status === 'Pending Confirmation';

    // Handle admin marking as "Pending Confirmation" (was "Resolved")
    if (isNowPendingConfirmation && !wasPendingConfirmation) {
      const user = await User.findById(report.user._id);
      if (user) {
        // Upload resolution photo if provided
        let resolutionPhotoUrl = null;
        if (req.file) {
          resolutionPhotoUrl = req.file.path; // Cloudinary URL
          report.resolutionPhotoUrl = resolutionPhotoUrl;
          console.log(`📷 Resolution photo uploaded to Cloudinary: ${resolutionPhotoUrl}`);
        } else {
          console.log('⚠️ No resolution photo uploaded (req.file is missing)');
        }

        // Set pending confirmation timestamp
        report.pendingConfirmationSince = new Date();
        
        // Send email notification to the user with resolution photo
        try {
          const userName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.email.split('@')[0];
          
          const reportDetails = {
            description: report.description,
            location: report.location,
            createdAt: report.createdAt,
            resolutionPhotoUrl: resolutionPhotoUrl
          };
          
          console.log(`📧 Sending email with photo URL: ${resolutionPhotoUrl}`);
          await emailService.sendPendingConfirmationEmail(user.email, userName, reportDetails);
          console.log(`✅ Sent pending confirmation email to ${user.email}`);
        } catch (emailError) {
          console.error('❌ Failed to send email notification:', emailError.message);
          // Don't fail the request if email fails
        }
      }

      // Remove PII for data privacy when pending confirmation
      console.log(`🔒 Removing PII from pending confirmation report ${report._id}`);
      report.name = null;
      report.firstName = null;
      report.middleName = null;
      report.lastName = null;
      report.contact = null;
      report.description = null;
    }

    report.status = status;
    await report.save();

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// User confirms resolution
const confirmResolution = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await Report.findById(id).populate('user', 'email firstName lastName');
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Only the user who created the report can confirm
    if (report.user._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (report.status !== 'Pending Confirmation') {
      return res.status(400).json({ error: 'Report is not pending confirmation' });
    }

    // Award points to user
    const user = await User.findById(req.user.id);
    if (user) {
      user.points += 10;
      await user.save();
      console.log(`✅ Awarded 10 points to user ${user.email}`);
    }

    // Mark as resolved
    report.status = 'Resolved';
    report.pendingConfirmationSince = null;
    await report.save();

    // Send confirmation email to admin (optional)
    // You can implement this later if needed

    res.json({ message: 'Resolution confirmed successfully', report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// User rejects resolution
const rejectResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const report = await Report.findById(id).populate('user', 'email firstName lastName');
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Only the user who created the report can reject
    if (report.user._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (report.status !== 'Pending Confirmation') {
      return res.status(400).json({ error: 'Report is not pending confirmation' });
    }

    // Store rejection reason and change status back to On Going
    report.rejectionReason = reason;
    report.status = 'On Going';
    report.pendingConfirmationSince = null;
    await report.save();

    // Send rejection notification to admin (optional)
    // You can implement this later if needed
    console.log(`❌ User rejected resolution for report ${report._id}: ${reason}`);

    res.json({ message: 'Resolution rejected successfully', report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
  confirmResolution,
  rejectResolution,
};
