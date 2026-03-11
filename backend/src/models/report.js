const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    name: String, // This will be deprecated in favor of firstName, middleName, lastName
    firstName: String,
    middleName: String,
    lastName: String,
    contact: String,
    description: String,
    location: String, // Geocoded address (e.g., "513 Calulut - Del Carmen Road, San Fernando City")
    userLocation: String, // User's registered location (Del Carmen or Bulaon) - used for filtering
    landmark: String,
    latitude: Number,
    longitude: Number,
    photoUrl: String,
    status: { type: String, default: 'Pending' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // link to user
    // Two-way confirmation fields
    resolutionPhotoUrl: String, // Photo uploaded by admin when marking as resolved
    rejectionReason: String, // Reason provided by user if they reject the resolution
    pendingConfirmationSince: Date, // Timestamp when status changed to "Pending Confirmation"
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);