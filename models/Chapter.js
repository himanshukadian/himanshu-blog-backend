const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, trim: true },
  order: { type: Number, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true }
}, {
  timestamps: true
});

const Chapter = mongoose.model('Chapter', chapterSchema);
module.exports = Chapter; 