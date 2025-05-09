const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  content: String,
  type: String, // e.g. 'poetry', 'technical', etc.
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  author: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', ArticleSchema); 