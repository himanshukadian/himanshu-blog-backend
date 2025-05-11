const express = require('express');
const courseController = require('../controllers/courseController');
const sectionController = require('../controllers/sectionController');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Get all courses
router.get('/', catchAsync(courseController.getAllCourses));

// Get a specific course by slug
router.get('/:courseSlug', catchAsync(courseController.getCourseBySlug));

// Get sections for a course
router.get('/:courseSlug/sections', catchAsync(sectionController.getSectionsForCourse));

module.exports = router; 