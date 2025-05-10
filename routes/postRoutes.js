const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  createPost,
  getAllPosts,
  getPost,
  updatePost,
  deletePost
} = require('../controllers/postController');

router.use(protect);

router
  .route('/')
  .get(getAllPosts)
  .post(restrictTo('admin', 'editor'), createPost);

router
  .route('/:id')
  .get(getPost)
  .patch(restrictTo('admin', 'editor'), updatePost)
  .delete(restrictTo('admin'), deletePost);

module.exports = router; 