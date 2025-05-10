const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const permit = require('../middleware/permission');
const upload = require('../middleware/upload');
const {
  uploadImage,
  deleteImage
} = require('../controllers/uploadController');

// Protected routes
router.use(protect);

// Upload routes
router.post('/image', upload.single('image'), uploadImage);
router.delete('/image/:id', permit('admin', 'editor'), deleteImage);

module.exports = router; 