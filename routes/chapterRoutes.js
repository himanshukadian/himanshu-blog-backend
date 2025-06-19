const express = require('express');
const chapterController = require('../controllers/chapterController');
const { catchAsync } = require('../utils/errorHandler');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all chapters
router.get('/', catchAsync(chapterController.getAllChapters));

// Create a new chapter
router.post('/', catchAsync(chapterController.createChapter));

// Get a specific chapter by slug
router.get('/:chapterSlug', catchAsync(chapterController.getChapterBySlug));

// Get scenes for a chapter
router.get('/:chapterSlug/scenes', catchAsync(chapterController.getScenesForChapter));

// Delete all scenes for a chapter (admin only)
router.delete('/:chapterSlug/scenes', protect, restrictTo('admin'), catchAsync(chapterController.deleteScenesForChapter));

module.exports = router; 