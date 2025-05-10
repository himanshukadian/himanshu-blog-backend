const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A category must have a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'A category name must have less or equal than 50 characters']
  },
  description: {
    type: String,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate
categorySchema.virtual('posts', {
  ref: 'Post',
  foreignField: 'category',
  localField: '_id'
});

// Create slug from name
categorySchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 