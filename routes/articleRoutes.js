const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { auth, permit } = require('../middleware/auth');

router.get('/', articleController.getArticles);
router.get('/:slug', articleController.getArticleBySlug);
router.post('/', auth, permit('admin', 'editor'), articleController.createArticle);
router.put('/:id', auth, permit('admin', 'editor'), articleController.updateArticle);
router.delete('/:id', auth, permit('admin'), articleController.deleteArticle);

module.exports = router; 