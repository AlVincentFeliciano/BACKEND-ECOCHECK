// /ecocheck-app/backend/config/cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME',
  api_key: 'YOUR_API_KEY',
  api_secret: 'YOUR_API_SECRET',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ecocheck-reports',
    format: async (req, file) => 'png',
    public_id: (req, file) => `report_${Date.now()}`,
  },
});

module.exports = {
  cloudinary,
  storage,
};