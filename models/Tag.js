const mongoose = require('mongoose');
const slugify = require('slugify');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A tag must have a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Tag name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  category: {
    type: String,
    enum: ['technology', 'lifestyle', 'business', 'science', 'arts', 'other'],
    default: 'other'
  },
  icon: {
    type: String,
    default: 'tag'
  },
  color: {
    type: String,
    default: '#6c757d'
  },
  stats: {
    articles: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  trending: {
    score: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tagSchema.index({ slug: 1 });
tagSchema.index({ name: 'text' });
tagSchema.index({ category: 1 });
tagSchema.index({ 'trending.score': -1 });

// Virtual populate for articles
tagSchema.virtual('articles', {
  ref: 'Article',
  foreignField: 'tags',
  localField: '_id'
});

// Pre-save middleware
tagSchema.pre('save', function(next) {
  // Generate slug from name
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true
    });
  }
  next();
});

// Instance methods
tagSchema.methods.incrementArticles = async function() {
  this.stats.articles += 1;
  return this.save();
};

tagSchema.methods.decrementArticles = async function() {
  this.stats.articles = Math.max(0, this.stats.articles - 1);
  return this.save();
};

tagSchema.methods.incrementFollowers = async function() {
  this.stats.followers += 1;
  return this.save();
};

tagSchema.methods.decrementFollowers = async function() {
  this.stats.followers = Math.max(0, this.stats.followers - 1);
  return this.save();
};

tagSchema.methods.updateTrendingScore = async function() {
  // Calculate trending score based on recent activity
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  
  const Article = mongoose.model('Article');
  const recentArticles = await Article.countDocuments({
    tags: this._id,
    publishedAt: { $gte: oneDayAgo }
  });

  // Weight factors
  const articleWeight = 10;
  const followerWeight = 5;
  const viewWeight = 1;

  this.trending.score = (
    recentArticles * articleWeight +
    this.stats.followers * followerWeight +
    this.stats.views * viewWeight
  );
  this.trending.lastUpdated = now;

  return this.save();
};

// Static methods
tagSchema.statics.findTrending = function(limit = 10) {
  return this.find()
    .sort({ 'trending.score': -1 })
    .limit(limit);
};

tagSchema.statics.findByCategory = function(category, options = {}) {
  const query = this.find({ category })
    .sort({ 'stats.articles': -1 });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.skip) {
    query.skip(options.skip);
  }

  return query;
};

tagSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  }).sort({ 'stats.articles': -1 });
};

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag; 