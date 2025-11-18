const express = require('express');
const router = express.Router();
const Report = require('../models/report');
const { authenticateToken, isSuperAdmin } = require('../middleware/authMiddleware');

// Admin-only migration endpoint to remove PII from resolved reports
router.post('/remove-pii-from-resolved', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    console.log('🔒 Starting PII removal migration...');
    
    // Find all resolved reports
    const resolvedReports = await Report.find({ status: 'Resolved' });
    console.log(`📊 Found ${resolvedReports.length} resolved reports`);

    if (resolvedReports.length === 0) {
      return res.json({
        success: true,
        message: 'No resolved reports to process',
        total: 0,
        updated: 0,
        skipped: 0
      });
    }

    let updated = 0;
    let skipped = 0;

    for (const report of resolvedReports) {
      // Check if PII already removed
      const hasPII = report.name || report.firstName || report.lastName || 
                     report.contact || report.description;

      if (!hasPII) {
        skipped++;
        continue;
      }

      // Remove PII fields
      report.name = null;
      report.firstName = null;
      report.middleName = null;
      report.lastName = null;
      report.contact = null;
      report.description = null;

      await report.save();
      updated++;
    }

    console.log(`✅ Migration completed: ${updated} updated, ${skipped} skipped`);

    res.json({
      success: true,
      message: 'PII removal migration completed successfully',
      total: resolvedReports.length,
      updated: updated,
      skipped: skipped
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed: ' + error.message
    });
  }
});

module.exports = router;
