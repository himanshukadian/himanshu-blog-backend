const mongoose = require('mongoose');
const slugify = require('slugify');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'An article must have a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'An article must have content'],
    trim: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [200, 'Excerpt cannot be more than 200 characters']
  },
  coverImage: {
    url: String,
    alt: String,
    caption: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'An article must have an author']
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Type',
    required: [true, 'An article must have a type']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  seo: {
    title: String,
    description: String,
    keywords: [String],
    ogImage: String
  },
  readingTime: {
    type: Number,
    default: 0
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    }
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
articleSchema.index({ slug: 1 });
articleSchema.index({ title: 'text', content: 'text' });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ featured: 1, publishedAt: -1 });

// Virtual populate for comments
articleSchema.virtual('comments', {
  ref: 'Comment',
  foreignField: 'article',
  localField: '_id'
});

// Pre-save middleware
articleSchema.pre('save', function(next) {
  // Generate slug from title
  if (this.isModified('title')) {
    this.slug = slugify(this.title, {
      lower: true,
      strict: true
    });
  }

  // Generate excerpt from content if not provided
  if (this.isModified('content') && !this.excerpt) {
    this.excerpt = this.content.substring(0, 200) + '...';
  }

  // Calculate reading time (assuming average reading speed of 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }

  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Instance methods
articleSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  return this.save();
};

articleSchema.methods.incrementLikes = async function() {
  this.stats.likes += 1;
  return this.save();
};

articleSchema.methods.incrementShares = async function() {
  this.stats.shares += 1;
  return this.save();
};

// Static methods
articleSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'published' })
    .populate('author', 'name email avatar')
    .populate('tags', 'name slug')
    .populate('type', 'name slug');
};

articleSchema.statics.findFeatured = function(limit = 5) {
  return this.find({ 
    status: 'published',
    featured: true 
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name email avatar')
    .populate('tags', 'name slug')
    .populate('type', 'name slug');
};

const Article = mongoose.model('Article', articleSchema);

module.exports = Article; 