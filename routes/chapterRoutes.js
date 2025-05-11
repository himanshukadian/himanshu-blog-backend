const express = require('express');
const chapterController = require('../controllers/chapterController');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Get all chapters
router.get('/', catchAsync(chapterController.getAllChapters));

// Get a specific chapter by slug
router.get('/:chapterSlug', catchAsync(chapterController.getChapterBySlug));

// Get scenes for a chapter
router.get('/:chapterSlug/scenes', catchAsync(chapterController.getScenesForChapter));

module.exports = router; 