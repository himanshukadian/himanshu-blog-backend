const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'A comment must have content'],
    trim: true,
    maxlength: [1000, 'Comment cannot be more than 1000 characters']
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: [true, 'A comment must belong to an article']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A comment must have an author']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'spam'],
    default: 'pending'
  },
  moderation: {
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    reason: String
  },
  stats: {
    likes: {
      type: Number,
      default: 0
    },
    replies: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    ip: String,
    userAgent: String,
    isEdited: {
      type: Boolean,
      default: false
    },
    editHistory: [{
      content: String,
      editedAt: Date,
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
commentSchema.index({ article: 1, createdAt: -1 });
commentSchema.index({ parent: 1 });
commentSchema.index({ status: 1 });

// Virtual populate for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  foreignField: 'parent',
  localField: '_id'
});

// Pre-save middleware
commentSchema.pre('save', function(next) {
  // Update article's comment count
  if (this.isNew) {
    this.constructor.updateArticleCommentCount(this.article);
  }
  next();
});

// Pre-remove middleware
commentSchema.pre('findOneAndDelete', async function(next) {
  // Get the document that is about to be deleted
  const doc = await this.model.findOne(this.getFilter());
  if (doc) {
    // Decrease article's comment count
    await doc.constructor.updateArticleCommentCount(doc.article, -1);
  }
  next();
});

// Instance methods
commentSchema.methods.incrementLikes = async function() {
  this.stats.likes += 1;
  return this.save();
};

commentSchema.methods.addEditHistory = function(content, userId) {
  this.metadata.editHistory.push({
    content,
    editedAt: new Date(),
    editedBy: userId
  });
  this.metadata.isEdited = true;
  return this.save();
};

commentSchema.methods.moderate = async function(status, moderatorId, reason = '') {
  this.status = status;
  this.moderation = {
    moderatedBy: moderatorId,
    moderatedAt: new Date(),
    reason
  };
  return this.save();
};

// Static methods
commentSchema.statics.updateArticleCommentCount = async function(articleId, increment = 1) {
  const Article = mongoose.model('Article');
  // First, increment/decrement
  const incResult = await Article.findByIdAndUpdate(articleId, {
    $inc: { 'stats.comments': increment }
  }, { new: true }).select('stats.comments');
  console.log(`[updateArticleCommentCount] After $inc: Article ${articleId} has comments = ${incResult?.stats?.comments}`);

  // Check the new value and clamp to zero only if negative
  if (incResult && incResult.stats && incResult.stats.comments < 0) {
    await Article.findByIdAndUpdate(articleId, { 'stats.comments': 0 });
    console.log(`[updateArticleCommentCount] Clamped Article ${articleId} comments to 0`);
  }
};

commentSchema.statics.findByArticle = async function(articleId, options = {}) {
  console.log('[findByArticle] articleId:', articleId);
  const query = this.find({ 
    article: articleId,
    parent: null,
    status: 'approved'
  })
    .sort({ createdAt: -1 })
    .populate('author', 'name avatar')
    .populate({
      path: 'replies',
      match: { status: 'approved' },
      populate: {
        path: 'author',
        select: 'name avatar'
      }
    });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.skip) {
    query.skip(options.skip);
  }

  const result = await query;
  console.log('[findByArticle] found comments:', Array.isArray(result) ? result.length : result);
  return result;
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 