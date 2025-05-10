const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  createCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

router.use(protect);

router
  .route('/')
  .get(getAllCategories)
  .post(restrictTo('admin'), createCategory);

router
  .route('/:id')
  .get(getCategory)
  .patch(restrictTo('admin'), updateCategory)
  .delete(restrictTo('admin'), deleteCategory);

module.exports = router; 