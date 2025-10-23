const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ✅ Load from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Storage for report uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecocheck-reports',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `report_${Date.now()}`,
  },
});

// ✅ Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'profilePics',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    public_id: (req, file) => `profile_${Date.now()}`,
  },
});

module.exports = { cloudinary, storage, profileStorage };
