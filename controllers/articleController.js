const mongoose = require('mongoose');
const Article = require('../models/Article');
const Tag = require('../models/Tag');
const Comment = require('../models/Comment');
const AppError = require('../utils/appError');
const { sendArticlePublishedEmail } = require('../services/email');

// Get all articles
exports.getAllArticles = async (req, res, next) => {
  try {
    console.log('getAllArticles req.user:', req.user); // Debug log
    // Parse limit and skip from query, default to 0 (no limit/skip)
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const skip = (page - 1) * limit;

    console.log('Pagination params:', { page, limit, skip }); // Debug log

    // Build filter
    let filter = {};
    // If status is provided as a query param, use it
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    } else if (!req.user || req.user.role !== 'admin') {
      // Only show published to non-admins
      filter.status = 'published';
    }
    const Type = require('../models/Type');
    if (req.query.typeId) {
      filter.type = req.query.typeId;
    } else if (req.query.typeSlug) {
      const typeDoc = await Type.findOne({ slug: req.query.typeSlug });
      if (typeDoc) {
        filter.type = typeDoc._id;
      } else {
        return res.status(200).json({ status: 'success', results: 0, total: 0, data: [] });
      }
    } else if (req.query.type && req.query.type !== 'All') {
      const typeDoc = await Type.findOne({ name: req.query.type });
      if (typeDoc) {
        filter.type = typeDoc._id;
      } else {
        return res.status(200).json({ status: 'success', results: 0, total: 0, data: [] });
      }
    }

    // Tag filtering
    if (req.query.tags) {
      // tags can be a comma-separated list of tag names, slugs, or ids
      const tagValues = req.query.tags.split(',').map(t => t.trim()).filter(Boolean);
      console.log('Searching for tags:', tagValues); // Debug log
      
      const tagDocs = await Tag.find({
        $or: [
          { name: { $in: tagValues } },
          { slug: { $in: tagValues } },
          { _id: { $in: tagValues.filter(v => mongoose.Types.ObjectId.isValid(v)) } }
        ]
      });
      
      console.log('Found tags:', tagDocs); // Debug log
      
      if (tagDocs.length > 0) {
        filter.tags = { $in: tagDocs.map(tag => tag._id) };
        console.log('Filter with tag IDs:', filter.tags); // Debug log
      } else {
        // If no tags found, return empty result
        return res.status(200).json({ status: 'success', results: 0, total: 0, data: [] });
      }
    }

    // Add search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { title: searchRegex },
        { content: searchRegex }
      ];
    }

    // Get total count before pagination
    const total = await Article.countDocuments(filter);
    console.log('Total articles found:', total); // Debug log

    const articles = await Article.find(filter)
      .populate('author', 'name email avatar')
      .populate('tags', 'name slug')
      .populate('type', 'name slug')
      .select('+stats')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Articles found:', articles.length); // Debug log

    res.status(200).json({
      status: 'success',
      results: articles.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: articles
    });
  } catch (err) {
    next(err);
  }
};

// Get article by slug
exports.getArticleBySlug = async (req, res, next) => {
  try {
    const article = await Article.findBySlug(req.params.slug);
    
    if (!article) {
      return next(new AppError('No article found with that slug', 404));
    }

    // Increment view count
    await article.incrementViews();

    res.status(200).json({
      status: 'success',
      data: article
    });
  } catch (err) {
    next(err);
  }
};

// Get article comments
exports.getArticleComments = async (req, res, next) => {
  try {
    console.log('[getArticleComments] req.user:', req.user);
    let filter = {};
    // Only show approved to non-admins
    if (!req.user || req.user.role !== 'admin') {
      filter.status = 'approved';
    }
    filter.parent = null;
    filter.article = req.params.id;
    console.log('[getArticleComments] filter:', filter);

    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar')
      .populate({
        path: 'replies',
        match: { status: 'approved' },
        populate: {
          path: 'author',
          select: 'name avatar'
        }
      })
      .limit(req.query.limit ? parseInt(req.query.limit, 10) : 0)
      .skip(req.query.skip ? parseInt(req.query.skip, 10) : 0);

    res.status(200).json({
      status: 'success',
      results: comments.length,
      data: comments
    });
  } catch (err) {
    next(err);
  }
};

// Create article
exports.createArticle = async (req, res, next) => {
  try {
    // Remove publishedAt if present in the request body
    if ('publishedAt' in req.body) {
      delete req.body.publishedAt;
    }
    // Convert 'type' to ObjectId if valid
    if (req.body.type && typeof req.body.type === 'string') {
      req.body.type = mongoose.Types.ObjectId.isValid(req.body.type) ? req.body.type : undefined;
    }
    // Handle tags as string: find or create tags by name
    if (typeof req.body.tags === 'string') {
      const tagNames = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
      req.body.tags = [];
      for (const name of tagNames) {
        let tag = await Tag.findOne({ name });
        if (!tag) {
          tag = await Tag.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') });
        }
        req.body.tags.push(tag._id);
      }
    } else if (Array.isArray(req.body.tags)) {
      req.body.tags = req.body.tags
        .map(tag => mongoose.Types.ObjectId.isValid(tag) ? tag : undefined)
        .filter(Boolean);
    }
    // Set publishedAt based on status
    if (req.body.status === 'published') {
      req.body.publishedAt = Date.now();
    } else {
      req.body.publishedAt = null;
    }
    const article = await Article.create({
      ...req.body,
      author: req.user.id
    });
    // If article is published, send notifications
    if (article.status === 'published') {
      // TODO: Get subscribers and send notifications
      // await sendArticlePublishedEmail(article, subscribers);
    }
    res.status(201).json({
      status: 'success',
      data: article
    });
  } catch (err) {
    // Handle duplicate slug error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(400).json({
        status: 'fail',
        message: 'An article with this slug already exists. Please use a different slug.'
      });
    }
    next(err);
  }
};

// Update article
exports.updateArticle = async (req, res, next) => {
  try {
    // Remove publishedAt if present in the request body
    if ('publishedAt' in req.body) {
      delete req.body.publishedAt;
    }
    // Convert 'type' to ObjectId if valid
    if (req.body.type && typeof req.body.type === 'string') {
      req.body.type = mongoose.Types.ObjectId.isValid(req.body.type) ? req.body.type : undefined;
    }
    // Handle tags as string: find or create tags by name
    if (typeof req.body.tags === 'string') {
      const tagNames = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
      req.body.tags = [];
      for (const name of tagNames) {
        let tag = await Tag.findOne({ name });
        if (!tag) {
          tag = await Tag.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') });
        }
        req.body.tags.push(tag._id);
      }
    } else if (Array.isArray(req.body.tags)) {
      req.body.tags = req.body.tags
        .map(tag => mongoose.Types.ObjectId.isValid(tag) ? tag : undefined)
        .filter(Boolean);
    }
    // Set publishedAt based on status change
    const currentArticle = await Article.findById(req.params.id);
    if (!currentArticle) {
      return next(new AppError('No article found with that ID', 404));
    }
    const newStatus = req.body.status;
    if (newStatus === 'published' && currentArticle.status !== 'published') {
      req.body.publishedAt = Date.now();
    }
    if (newStatus !== 'published' && currentArticle.status === 'published') {
      req.body.publishedAt = null;
    }
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    res.status(200).json({
      status: 'success',
      data: article
    });
  } catch (err) {
    // Handle duplicate slug error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(400).json({
        status: 'fail',
        message: 'An article with this slug already exists. Please use a different slug.'
      });
    }
    next(err);
  }
};

// Delete article
exports.deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);

    if (!article) {
      return next(new AppError('No article found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// Update article status
exports.updateArticleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'published', 'archived'].includes(status)) {
      return next(new AppError('Invalid status value', 400));
    }

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    );

    if (!article) {
      return next(new AppError('No article found with that ID', 404));
    }

    // If article is published, send notifications
    if (status === 'published') {
      // TODO: Get subscribers and send notifications
      // await sendArticlePublishedEmail(article, subscribers);
    }

    res.status(200).json({
      status: 'success',
      data: article
    });
  } catch (err) {
    next(err);
  }
};

// Toggle article feature
exports.toggleArticleFeature = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return next(new AppError('No article found with that ID', 404));
    }

    article.featured = !article.featured;
    await article.save();

    res.status(200).json({
      status: 'success',
      data: article
    });
  } catch (err) {
    next(err);
  }
};

// Create comment
exports.createComment = async (req, res, next) => {
  try {
    const comment = await Comment.create({
      content: req.body.content,
      article: req.params.id,
      author: req.user.id
    });

    // Populate author details
    await comment.populate('author', 'name avatar');

    res.status(201).json({
      status: 'success',
      data: comment
    });
  } catch (err) {
    next(err);
  }
};

// Update comment
exports.updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return next(new AppError('No comment found with that ID', 404));
    }

    // Check if user is the author or an admin
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You can only edit your own comments', 403));
    }

    comment.content = req.body.content;
    comment.metadata.isEdited = true;
    await comment.save();

    res.status(200).json({
      status: 'success',
      data: comment
    });
  } catch (err) {
    next(err);
  }
};

// Delete comment
exports.deleteComment = async (req, res, next) => {
  if (!req.params.commentId || req.params.commentId === 'undefined') {
    return res.status(400).json({ status: 'fail', message: 'Comment ID is required' });
  }
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return next(new AppError('No comment found with that ID', 404));
    }

    // Check if user is the author or an admin
    if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You can only delete your own comments', 403));
    }

    // Store article ID before deleting comment
    const articleId = comment.article;

    // Delete the comment
    await Comment.findByIdAndDelete(req.params.commentId);

    // Update article's comment count
    await Comment.updateArticleCommentCount(articleId, -1);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    console.error('Error deleting comment:', err);
    next(err);
  }
};

// Bulk publish articles
exports.bulkPublishArticles = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'No article IDs provided.' });
    }
    const result = await Article.updateMany(
      { _id: { $in: ids }, status: { $ne: 'published' } },
      { $set: { status: 'published', publishedAt: Date.now() } }
    );
    res.status(200).json({ status: 'success', modifiedCount: result.nModified || result.modifiedCount });
  } catch (err) {
    next(err);
  }
};

// Like/unlike (toggle) an article
exports.likeArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ status: 'fail', message: 'Article not found' });
    }
    const userId = req.user._id;
    const alreadyLiked = article.likedBy.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
      // Unlike: remove user from likedBy and decrement likes
      article.likedBy = article.likedBy.filter(id => id.toString() !== userId.toString());
      article.stats.likes = Math.max(0, article.stats.likes - 1);
      await article.save();
      return res.status(200).json({ status: 'success', data: article, liked: false });
    } else {
      // Like: add user to likedBy and increment likes
      article.likedBy.push(userId);
      article.stats.likes += 1;
      await article.save();
      return res.status(200).json({ status: 'success', data: article, liked: true });
    }
  } catch (err) {
    next(err);
  }
};

// Approve a comment
exports.approveComment = async (req, res, next) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      { status: 'approved' },
      { new: true }
    );
    if (!comment) {
      return res.status(404).json({ status: 'fail', message: 'Comment not found' });
    }
    res.status(200).json({ status: 'success', data: comment });
  } catch (err) {
    next(err);
  }
};

// Unapprove a comment
exports.unapproveComment = async (req, res, next) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      { status: 'pending' },
      { new: true }
    );
    if (!comment) {
      return res.status(404).json({ status: 'fail', message: 'Comment not found' });
    }
    res.status(200).json({ status: 'success', data: comment });
  } catch (err) {
    next(err);
  }
};

// Get all comments
exports.getAllComments = async (req, res, next) => {
  try {
    const comments = await Comment.find()
      .populate('author', 'name email')
      .populate('article', 'title slug');
    res.status(200).json({ status: 'success', results: comments.length, data: comments });
  } catch (err) {
    next(err);
  }
};