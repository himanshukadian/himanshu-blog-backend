const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const permit = require('../middleware/permission');
const {
  getAllTypes,
  getTypeBySlug,
  createType,
  updateType,
  deleteType
} = require('../controllers/typeController');

// Public routes
router.get('/', getAllTypes);
router.get('/:slug', getTypeBySlug);

// Protected routes (admin and editor only)
router.use(protect);
router.post('/', permit('admin', 'editor'), createType);
router.patch('/:id', permit('admin', 'editor'), updateType);
router.delete('/:id', permit('admin', 'editor'), deleteType);

module.exports = router; 