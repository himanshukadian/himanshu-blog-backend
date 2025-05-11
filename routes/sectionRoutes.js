const express = require('express');
const sectionController = require('../controllers/sectionController');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Get all sections
router.get('/', catchAsync(sectionController.getAllSections));

// Get a specific section by slug
router.get('/:sectionSlug', catchAsync(sectionController.getSectionBySlug));

// Get chapters for a section
router.get('/:sectionSlug/chapters', catchAsync(sectionController.getChaptersForSection));

module.exports = router; 