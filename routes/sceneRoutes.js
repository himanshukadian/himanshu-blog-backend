const express = require('express');
const sceneController = require('../controllers/sceneController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/chapter/:slug', sceneController.getChapterScenes);
router.get('/:id', sceneController.getScene);

// Protected routes (require authentication)
router.use(protect);

// Admin only routes
router.use(restrictTo('admin'));
router.post('/', sceneController.createScene);
router.patch('/:id', sceneController.updateScene);
router.delete('/:id', sceneController.deleteScene);

module.exports = router; 