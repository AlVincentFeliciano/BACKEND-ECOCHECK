// backend/src/jobs/autoResolveReports.js
const Report = require('../models/report');
const User = require('../models/user');

/**
 * Auto-resolve reports that have been pending confirmation for 3+ days
 * This job should be run daily (e.g., via cron or scheduled task)
 */
const autoResolveReports = async () => {
  try {
    console.log('🤖 Running auto-resolve job...');
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Find reports pending confirmation for 3+ days
    const reportsToResolve = await Report.find({
      status: 'Pending Confirmation',
      pendingConfirmationSince: { $lte: threeDaysAgo }
    }).populate('user', 'email points');
    
    if (reportsToResolve.length === 0) {
      console.log('✅ No reports to auto-resolve');
      return { success: true, count: 0 };
    }
    
    console.log(`📊 Found ${reportsToResolve.length} reports to auto-resolve`);
    
    let resolvedCount = 0;
    
    for (const report of reportsToResolve) {
      try {
        // Award points to user
        if (report.user) {
          const user = await User.findById(report.user._id);
          if (user) {
            user.points += 10;
            await user.save();
            console.log(`  ✓ Awarded 10 points to user ${user.email}`);
          }
        }
        
        // Mark as resolved
        report.status = 'Resolved';
        report.pendingConfirmationSince = null;
        await report.save();
        
        resolvedCount++;
        console.log(`  ✓ Auto-resolved report ${report._id}`);
      } catch (error) {
        console.error(`  ✗ Failed to auto-resolve report ${report._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Auto-resolved ${resolvedCount} of ${reportsToResolve.length} reports`);
    
    return {
      success: true,
      count: resolvedCount,
      total: reportsToResolve.length
    };
  } catch (error) {
    console.error('❌ Auto-resolve job failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { autoResolveReports };
