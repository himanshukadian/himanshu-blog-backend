const Type = require('../models/Type');
const AppError = require('../utils/appError');

// Get all types
exports.getAllTypes = async (req, res, next) => {
  try {
    const types = await Type.find()
      .sort({ 'stats.articles': -1 });

    res.status(200).json({
      status: 'success',
      results: types.length,
      data: types
    });
  } catch (err) {
    next(err);
  }
};

// Get type by slug
exports.getTypeBySlug = async (req, res, next) => {
  try {
    const type = await Type.findOne({ slug: req.params.slug });

    if (!type) {
      return next(new AppError('No type found with that slug', 404));
    }

    res.status(200).json({
      status: 'success',
      data: type
    });
  } catch (err) {
    next(err);
  }
};

// Create type
exports.createType = async (req, res, next) => {
  try {
    const type = await Type.create({
      ...req.body,
      metadata: {
        createdBy: req.user.id
      }
    });

    res.status(201).json({
      status: 'success',
      data: type
    });
  } catch (err) {
    next(err);
  }
};

// Update type
exports.updateType = async (req, res, next) => {
  try {
    const type = await Type.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!type) {
      return next(new AppError('No type found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: type
    });
  } catch (err) {
    next(err);
  }
};

// Delete type
exports.deleteType = async (req, res, next) => {
  try {
    const type = await Type.findByIdAndDelete(req.params.id);

    if (!type) {
      return next(new AppError('No type found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
}; 