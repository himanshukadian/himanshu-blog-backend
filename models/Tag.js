const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: { type: String, unique: true }
});

module.exports = mongoose.model('Tag', TagSchema); 