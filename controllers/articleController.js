const mongoose = require('mongoose');
const Article = require('../models/Article');
const Tag = require('../models/Tag');
const Type = require('../models/Type');
const User = require('../models/User');
const Comment = require('../models/Comment');
const AppError = require('../utils/appError');
const { sendArticlePublishedEmail } = require('../services/email');

const slugify = name =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Resolve a type reference (name/slug/object with name or _id) to an ObjectId
async function resolveTypeRef(ref) {
  if (!ref) return undefined;
  let value = ref;
  if (typeof ref === 'object') value = ref._id || ref.name || ref.slug;
  if (mongoose.Types.ObjectId.isValid(value)) return value;
  const typeDoc = await Type.findOne({ $or: [{ name: value }, { slug: value }] });
  return typeDoc ? typeDoc._id : undefined;
}

// Resolve a tags list (names, ids, or objects) to ObjectIds, creating missing tags
async function resolveTagList(tags) {
  if (typeof tags === 'string') {
    tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  if (!Array.isArray(tags)) return [];
  const ids = [];
  for (const raw of tags) {
    let value = raw;
    if (raw && typeof raw === 'object') value = raw._id || raw.name || raw.slug;
    if (mongoose.Types.ObjectId.isValid(value)) {
      ids.push(value);
      continue;
    }
    let tag = await Tag.findOne({ name: value });
    if (!tag) {
      tag = await Tag.create({ name: value, slug: slugify(value) });
    }
    ids.push(tag._id);
  }
  return ids;
}

// Resolve an author reference (id/object/name) to an ObjectId or undefined
async function resolveAuthorRef(ref) {
  if (!ref) return undefined;
  let value = ref;
  if (typeof ref === 'object') value = ref._id || ref.name;
  if (mongoose.Types.ObjectId.isValid(value)) return value;
  const user = await User.findOne({ name: value });
  return user ? user._id : undefined;
}

// Get all articles
exports.getAllArticles = async (req, res, next) => {
  try {
    // Parse limit and skip from query, default to 0 (no limit/skip)
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    if (!req.user || req.user.role !== 'admin') {
      // Only show published to non-admins (ignore ?status entirely)
      filter.status = 'published';
    } else if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    const Type = require('../models/Type');
    if (req.query.typeId) {
      filter.type = req.query.typeId;
    } else if (req.query.typeSlug) {
      const typeDoc = await Type.findOne({ slug: req.query.typeSlug });
      if (typeDoc) {
        filter.type = typeDoc._id;
      } else {
        return res.status(200).json([]);
      }
    } else if (req.query.type && req.query.type !== 'All') {
      const typeDoc = await Type.findOne({ name: req.query.type });
      if (typeDoc) {
        filter.type = typeDoc._id;
      } else {
        return res.status(200).json([]);
      }
    }

    // Tag filtering (supports both ?tag and ?tags)
    const tagQuery = req.query.tags || req.query.tag;
    if (tagQuery) {
      // tags can be a comma-separated list of tag names, slugs, or ids
      const tagValues = tagQuery.split(',').map(t => t.trim()).filter(Boolean);
      
      const tagDocs = await Tag.find({
        $or: [
          { name: { $in: tagValues } },
          { slug: { $in: tagValues } },
          { _id: { $in: tagValues.filter(v => mongoose.Types.ObjectId.isValid(v)) } }
        ]
      });
      
      if (tagDocs.length > 0) {
        filter.tags = { $in: tagDocs.map(tag => tag._id) };
      } else {
        // If no tags found, return empty result
        return res.status(200).json([]);
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

    const articles = await Article.find(filter)
      .populate('author', 'name email avatar')
      .populate('tags', 'name slug')
      .populate('type', 'name slug')
      .select('+stats')
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json(articles);
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

    res.status(200).json(article);
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
    // Resolve type to ObjectId (accepts name, slug, or populated object)
    req.body.type = await resolveTypeRef(req.body.type);
    // Resolve tags (accepts name list, ids, or populated objects)
    req.body.tags = await resolveTagList(req.body.tags);
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
    // Resolve type only if provided (avoid wiping on partial updates)
    if ('type' in req.body) {
      req.body.type = await resolveTypeRef(req.body.type);
    } else {
      delete req.body.type;
    }
    // Resolve tags only if provided (avoid wiping on partial updates)
    if ('tags' in req.body) {
      req.body.tags = await resolveTagList(req.body.tags);
    } else {
      delete req.body.tags;
    }
    // Resolve author (accepts id, name, or populated object); drop if invalid so
    // the existing author is preserved
    if ('author' in req.body) {
      const authorId = await resolveAuthorRef(req.body.author);
      if (authorId) req.body.author = authorId;
      else delete req.body.author;
    }
    // Only touch publishedAt when status is explicitly provided
    const currentArticle = await Article.findById(req.params.id);
    if (!currentArticle) {
      return next(new AppError('No article found with that ID', 404));
    }
    if ('status' in req.body) {
      const newStatus = req.body.status;
      if (newStatus === 'published' && currentArticle.status !== 'published') {
        req.body.publishedAt = Date.now();
      }
      if (newStatus !== 'published' && currentArticle.status === 'published') {
        req.body.publishedAt = null;
      }
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