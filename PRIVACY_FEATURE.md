# PII Removal for Resolved Reports - Privacy Feature

## Overview

This feature automatically removes Personally Identifiable Information (PII) from reports when they are marked as "Resolved" to ensure data privacy compliance and protect user information.

## What Gets Removed

When a report is marked as **Resolved**, the following PII fields are automatically deleted from the database:

- ❌ **Name** (firstName, middleName, lastName, name)
- ❌ **Contact Number**
- ❌ **Description** (may contain sensitive information)

## What Remains

The following non-PII information is retained for analytics and record-keeping:

- ✅ **Location** (address)
- ✅ **Landmark**
- ✅ **Status** (Resolved)
- ✅ **Reported On** (timestamp)
- ✅ **Photo** (environmental issue image)
- ✅ **User Reference** (userId - for mobile app to link to user's profile)

## How It Works

### For Admins (Admin Dashboard)
- When an admin marks a report as "Resolved", PII is automatically removed from the database
- Archived reports show "Anonymized" instead of user names
- Contact and description fields show "Removed for privacy"
- Location and status information remain visible for tracking purposes

### For Users (Mobile App)
- Users can still view **their own** reports with full details
- The mobile app fetches the report data AND the user's profile data separately
- User sees their own name/contact from their profile, even though it's removed from the report
- No privacy concern since users only see their own information

## Implementation

### 1. Backend Controller
**File:** `backend/src/controllers/reportController.js`

The `updateReportStatus` function automatically removes PII when status changes to "Resolved":

```javascript
if (isNowResolved && !wasResolved) {
  // Send email notification first (uses current data)
  // ...
  
  // Then remove PII for privacy
  report.name = null;
  report.firstName = null;
  report.middleName = null;
  report.lastName = null;
  report.contact = null;
  report.description = null;
}
```

### 2. Frontend Display
**File:** `admin-dashboard/src/components/Dashboard.js`

- Report cards show "Anonymized" for resolved reports without PII
- Modal shows privacy notice: "Personal information has been removed for privacy protection"
- Contact field displays: "Removed for privacy" instead of null/N/A

### 3. Migration Script (One-Time)
**File:** `backend/src/scripts/removePIIFromResolvedReports.js`

To clean up existing resolved reports, run the migration script:

```bash
# From the backend directory
cd backend

# Run the migration
node src/scripts/removePIIFromResolvedReports.js
```

Or add to `package.json`:
```json
{
  "scripts": {
    "migrate:remove-pii": "node src/scripts/removePIIFromResolvedReports.js"
  }
}
```

Then run:
```bash
npm run migrate:remove-pii
```

## Migration Script Output

The script will show progress and summary:
```
🔌 Connecting to database...
✅ Connected to database
📊 Found 15 resolved reports
🔒 Report 12345 - Removing PII
   Before: name=John Doe, contact=+639***, description=There is garbage...
   After: name=null, contact=null, description=null
✅ Report 12345 - PII removed successfully

📊 Migration Summary:
   Total resolved reports: 15
   ✅ Updated: 12
   ⏭️  Skipped (already clean): 3

🎉 Migration completed successfully!
```

## Privacy Benefits

✅ **GDPR/Privacy Compliance**: Minimizes data retention after resolution  
✅ **Data Security**: Reduces risk of PII exposure in case of breach  
✅ **User Trust**: Shows commitment to protecting user information  
✅ **Analytics Intact**: Still allows location-based trend analysis  

## User Experience

### Admin Dashboard View (Resolved Report)
```
Title: "Anonymized"
Contact: "Removed for privacy"
Location: "513 Calulut - Del Carmen Road, San Fernando City"
Landmark: "Townhall"
Status: "Resolved"
Reported On: "11/12/2025, 6:22:05 PM"
Description: "Removed for privacy protection"
```

### Mobile App View (User's Own Report)
```
Title: "John Doe's Report" (from user profile)
Contact: "+639784649564" (from user profile)
Location: "513 Calulut - Del Carmen Road, San Fernando City"
Landmark: "Townhall"
Status: "Resolved"
Reported On: "11/12/2025, 6:22:05 PM"
Description: [Still visible in user's view via their account]
```

## Testing

### Test the Feature:
1. Create a test report with PII (name, contact, description)
2. Mark it as "Resolved" through the admin dashboard
3. Check the database - PII fields should be `null`
4. View in admin dashboard - should show "Anonymized"
5. View in mobile app as the user - should still see own info from profile

### Verify Migration:
1. Run the migration script
2. Check console output for success message
3. Query database to verify PII removed from resolved reports
4. Check admin dashboard archive - all resolved reports should show "Anonymized"

## Notes

- PII removal is **irreversible** - once removed, it cannot be recovered
- Email notification is sent **before** PII removal, so users receive full details
- User account data remains intact - only report-specific PII is removed
- The `userId` reference is kept so mobile app can still link reports to users

## Support

For questions or issues, please contact the development team.
