const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/submit', projectController.submitProject);

// Protected routes (require authentication)
router.use(protect);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProject);
router.patch('/:id/status', projectController.updateProjectStatus);

module.exports = router; 