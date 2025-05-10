const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const permit = require('../middleware/permission');
const {
  getAllTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag
} = require('../controllers/tagController');

// Public routes
router.get('/', getAllTags);
router.get('/:slug', getTagBySlug);

// Protected routes (admin and editor only)
router.use(protect);
router.post('/', permit('admin', 'editor'), createTag);
router.patch('/:id', permit('admin', 'editor'), updateTag);
router.delete('/:id', permit('admin', 'editor'), deleteTag);

module.exports = router; 