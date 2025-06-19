const express = require('express');
const sectionController = require('../controllers/sectionController');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Get all sections
router.get('/', catchAsync(sectionController.getAllSections));

// Create a new section
router.post('/', catchAsync(sectionController.createSection));

// Get a specific section by slug
router.get('/:sectionSlug', catchAsync(sectionController.getSectionBySlug));

// Get chapters for a section
router.get('/:sectionSlug/chapters', catchAsync(sectionController.getChaptersForSection));

// Delete a section by ID
router.delete('/:id', catchAsync(sectionController.deleteSection));

module.exports = router; 