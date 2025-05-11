const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  order: {
    type: Number,
    required: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

const Chapter = mongoose.model('Chapter', chapterSchema);

module.exports = Chapter; 