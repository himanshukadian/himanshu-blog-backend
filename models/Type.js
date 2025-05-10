const mongoose = require('mongoose');
const slugify = require('slugify');

const typeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A type must have a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Type name cannot be more than 50 characters']
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
  icon: {
    type: String,
    default: 'article'
  },
  color: {
    type: String,
    default: '#6c757d'
  },
  template: {
    layout: {
      type: String,
      enum: ['standard', 'featured', 'minimal', 'custom'],
      default: 'standard'
    },
    showAuthor: {
      type: Boolean,
      default: true
    },
    showDate: {
      type: Boolean,
      default: true
    },
    showTags: {
      type: Boolean,
      default: true
    },
    showComments: {
      type: Boolean,
      default: true
    },
    showShareButtons: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    articles: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isSystem: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
typeSchema.index({ slug: 1 });
typeSchema.index({ name: 'text' });
typeSchema.index({ 'metadata.order': 1 });

// Virtual populate for articles
typeSchema.virtual('articles', {
  ref: 'Article',
  foreignField: 'type',
  localField: '_id'
});

// Pre-save middleware
typeSchema.pre('save', function(next) {
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
typeSchema.methods.incrementArticles = async function() {
  this.stats.articles += 1;
  return this.save();
};

typeSchema.methods.decrementArticles = async function() {
  this.stats.articles = Math.max(0, this.stats.articles - 1);
  return this.save();
};

typeSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  return this.save();
};

// Static methods
typeSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug });
};

typeSchema.statics.findOrdered = function() {
  return this.find()
    .sort({ 'metadata.order': 1, name: 1 });
};

typeSchema.statics.findPopular = function(limit = 5) {
  return this.find()
    .sort({ 'stats.articles': -1 })
    .limit(limit);
};

typeSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  }).sort({ 'stats.articles': -1 });
};

const Type = mongoose.model('Type', typeSchema);

module.exports = Type; 