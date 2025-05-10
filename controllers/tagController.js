const Tag = require('../models/Tag');
const AppError = require('../utils/appError');

// Get all tags
exports.getAllTags = async (req, res, next) => {
  try {
    const tags = await Tag.find()
      .sort({ 'stats.articles': -1 });

    res.status(200).json({
      status: 'success',
      results: tags.length,
      data: tags
    });
  } catch (err) {
    next(err);
  }
};

// Get tag by slug
exports.getTagBySlug = async (req, res, next) => {
  try {
    const tag = await Tag.findOne({ slug: req.params.slug });

    if (!tag) {
      return next(new AppError('No tag found with that slug', 404));
    }

    res.status(200).json({
      status: 'success',
      data: tag
    });
  } catch (err) {
    next(err);
  }
};

// Create tag
exports.createTag = async (req, res, next) => {
  try {
    const tag = await Tag.create({
      ...req.body,
      metadata: {
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      status: 'success',
      data: tag
    });
  } catch (err) {
    next(err);
  }
};

// Update tag
exports.updateTag = async (req, res, next) => {
  try {
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!tag) {
      return next(new AppError('No tag found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: tag
    });
  } catch (err) {
    next(err);
  }
};

// Delete tag
exports.deleteTag = async (req, res, next) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);

    if (!tag) {
      return next(new AppError('No tag found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
}; 