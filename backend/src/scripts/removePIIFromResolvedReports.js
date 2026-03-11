const mongoose = require('mongoose');
const path = require('path');
const Report = require('../models/report');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Migration Script: Remove PII from Resolved Reports
 * 
 * This script removes Personally Identifiable Information (PII) from all reports
 * that have a status of "Resolved". This ensures data privacy compliance.
 * 
 * PII fields removed:
 * - name, firstName, middleName, lastName
 * - contact
 * - description
 * 
 * Fields retained:
 * - location, landmark, latitude, longitude
 * - status, createdAt, updatedAt
 * - photoUrl
 * - user reference (for mobile app to link reports)
 * 
 * HOW TO RUN:
 * From the backend directory, run:
 *   node src/scripts/removePIIFromResolvedReports.js
 * 
 * OR with npm:
 *   Add to package.json scripts: "migrate:remove-pii": "node src/scripts/removePIIFromResolvedReports.js"
 *   Then run: npm run migrate:remove-pii
 */

const removePIIFromResolvedReports = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find all resolved reports
    const resolvedReports = await Report.find({ status: 'Resolved' });
    console.log(`📊 Found ${resolvedReports.length} resolved reports`);

    if (resolvedReports.length === 0) {
      console.log('✅ No resolved reports to process');
      await mongoose.connection.close();
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const report of resolvedReports) {
      // Check if PII already removed
      const hasPII = report.name || report.firstName || report.lastName || 
                     report.contact || report.description;

      if (!hasPII) {
        console.log(`⏭️  Report ${report._id} - PII already removed, skipping`);
        skipped++;
        continue;
      }

      // Log before removal
      console.log(`🔒 Report ${report._id} - Removing PII`);
      console.log(`   Before: name=${report.name}, contact=${report.contact?.substring(0, 4)}***, description=${report.description?.substring(0, 20)}...`);

      // Remove PII fields
      report.name = null;
      report.firstName = null;
      report.middleName = null;
      report.lastName = null;
      report.contact = null;
      report.description = null;

      await report.save();
      
      console.log(`   After: name=${report.name}, contact=${report.contact}, description=${report.description}`);
      console.log(`✅ Report ${report._id} - PII removed successfully`);
      updated++;
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total resolved reports: ${resolvedReports.length}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped (already clean): ${skipped}`);
    console.log('\n🎉 Migration completed successfully!');

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the migration
removePIIFromResolvedReports();
