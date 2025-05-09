const express = require('express');
const router = express.Router();
const { uploadImage } = require('../controllers/uploadController');
const { auth, permit } = require('../middleware/auth');

// Protect all upload routes with auth middleware
router.use(auth);

// Only admin users can upload images
router.post('/image', permit('admin'), uploadImage);

module.exports = router; 