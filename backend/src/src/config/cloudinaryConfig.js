const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ✅ Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Storage for report uploads
const reportStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ecocheck-reports',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `report_${originalName}_${timestamp}`;
    },
    transformation: [{ width: 800, height: 800, crop: 'limit' }], // optional: resize large images
  },
});

// ✅ Storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'profilePics',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `profile_${originalName}_${timestamp}`;
    },
    transformation: [{ width: 400, height: 400, crop: 'limit' }], // optional: resize avatars
  },
});

// ✅ Helper function to verify Cloudinary is working
const testCloudinary = async () => {
  try {
    const result = await cloudinary.api.resources({ max_results: 1 });
    console.log('✅ Cloudinary connected. Latest resource:', result.resources[0]?.secure_url);
  } catch (err) {
    console.error('❌ Cloudinary test failed:', err.message);
  }
};

// Run test in dev mode
if (process.env.NODE_ENV !== 'production') {
  testCloudinary();
}

module.exports = {
  cloudinary,
  reportStorage,
  profileStorage,
};
