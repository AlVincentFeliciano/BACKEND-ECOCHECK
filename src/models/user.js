const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleInitial: { type: String, default: '' },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contactNumber: { type: String, required: true },
  password: { type: String, required: true },

  // ✅ Only allow specific roles
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'user'], 
    default: 'user' 
  },

  bio: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  points: { type: Number, default: 0 },

  // ✅ Add reset fields for forgot password feature
  resetCode: { type: String, default: null },
  resetCodeExpires: { type: Date, default: null }

}, { timestamps: true });

// ✅ Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
