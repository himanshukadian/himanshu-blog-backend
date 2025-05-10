const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const AppError = require('../utils/appError');

// Validate required environment variables
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload an image', 400));
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'blog',
      use_filename: true,
      unique_filename: true
    });

    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      status: 'success',
      data: {
        url: result.secure_url,
        public_id: result.public_id
      }
    });
  } catch (err) {
    // Clean up the temporary file if it exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

// Delete image
exports.deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(id);

    if (result.result !== 'ok') {
      return next(new AppError('Error deleting image', 400));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
}; 