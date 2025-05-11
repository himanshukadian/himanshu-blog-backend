const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const { catchAsync } = require('../utils/errorHandler');

// Get all chapters
router.get('/', catchAsync(async (req, res) => {
  const chapters = await Chapter.find().sort({ order: 1 });
  res.status(200).json({
    status: 'success',
    data: chapters
  });
}));

// Get chapter by slug
router.get('/:slug', catchAsync(async (req, res) => {
  const chapter = await Chapter.findOne({ slug: req.params.slug });
  if (!chapter) {
    return res.status(404).json({
      status: 'fail',
      message: 'Chapter not found'
    });
  }
  res.status(200).json({
    status: 'success',
    data: chapter
  });
}));

module.exports = router; 