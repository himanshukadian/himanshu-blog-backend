const express = require('express');
const resumeController = require('../controllers/resumeController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes for resume services
router.get('/health', resumeController.healthCheck);

// Routes for base resume management
router.post('/base-resume', resumeController.createBaseResume);

// Job analysis routes
router.post('/analyze-job', resumeController.analyzeJobDescription);

// Resume customization routes
router.post('/customize', resumeController.customizeResumeForJob);

// PDF generation routes
router.post('/generate-pdf/:resumeId', resumeController.generateCustomizedPDF);

// Resume management routes
router.get('/', resumeController.getResumes);
router.get('/:id', resumeController.getResumeById);

// Optional: Protected routes for admin management (if auth is needed later)
// router.use(protect); // Uncomment if authentication is required
// router.delete('/:id', restrictTo('admin'), resumeController.deleteResume);
// router.patch('/:id', restrictTo('admin'), resumeController.updateResume);

module.exports = router; 