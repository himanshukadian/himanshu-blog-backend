const Post = require('../models/Post');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createPost = catchAsync(async (req, res, next) => {
  const post = await Post.create({
    ...req.body,
    author: req.user._id,
    metadata: {
      createdBy: req.user._id
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      post
    }
  });
});

exports.getAllPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find()
    .populate('author', 'name email')
    .populate('category', 'name');

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: {
      posts
    }
  });
});

exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'name email')
    .populate('category', 'name');

  if (!post) {
    return next(new AppError('No post found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      post
    }
  });
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      metadata: {
        updatedAt: Date.now()
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!post) {
    return next(new AppError('No post found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      post
    }
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndDelete(req.params.id);

  if (!post) {
    return next(new AppError('No post found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
}); 