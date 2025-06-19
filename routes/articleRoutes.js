const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect, optionalProtect } = require('../middleware/auth');
const permit = require('../middleware/permission');

// Add admin route to get all comments (must be before /:slug)
router.get('/comments', protect, permit('admin'), articleController.getAllComments);

// Public or optionally protected routes
router.get('/', optionalProtect, articleController.getAllArticles);
router.get('/slug/:slug', articleController.getArticleBySlug);
router.get('/:id/comments', optionalProtect, articleController.getArticleComments);

// Protected routes (all routes below require authentication)
router.use(protect);

// Author routes
router.post('/:id/comments', permit('user', 'author', 'admin'), articleController.createComment);
router.put('/:id/comments/:commentId', permit('user', 'author', 'admin'), articleController.updateComment);
router.delete('/:id/comments/:commentId', permit('user', 'author', 'admin'), articleController.deleteComment);

// Editor/Admin routes
router.post('/', permit('admin', 'editor'), articleController.createArticle);
router.put('/:id', permit('admin', 'editor'), articleController.updateArticle);
router.delete('/:id', permit('admin', 'editor'), articleController.deleteArticle);
router.patch('/:id/status', permit('admin', 'editor'), articleController.updateArticleStatus);
router.patch('/:id/feature', permit('admin', 'editor'), articleController.toggleArticleFeature);
router.patch('/bulk-publish', permit('admin', 'editor'), articleController.bulkPublishArticles);

// Allow all authenticated users to like/unlike articles
router.post('/:id/like', articleController.likeArticle);

router.patch('/:id/comments/:commentId/approve', permit('admin'), articleController.approveComment);
router.patch('/:id/comments/:commentId/unapprove', permit('admin'), articleController.unapproveComment);

module.exports = router; 