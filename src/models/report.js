const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    name: String, // This will be deprecated in favor of firstName, middleName, lastName
    firstName: String,
    middleName: String,
    lastName: String,
    contact: String,
    description: String,
    location: String,
    landmark: String,
    latitude: Number,
    longitude: Number,
    photoUrl: String,
    status: { type: String, default: 'Pending' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // link to user
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);