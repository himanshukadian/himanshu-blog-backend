const mongoose = require('mongoose');
const TypeSchema = new mongoose.Schema({
  name: { type: String, unique: true }
});
module.exports = mongoose.model('Type', TypeSchema); 