const mongoose = require('mongoose');

const sceneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  chapter: {
    type: String,
    required: true,
    trim: true
  },
  dialogue: {
    type: String,
    required: true
  },
  drawFunction: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  clearBeforeDraw: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
sceneSchema.index({ chapter: 1, order: 1 });

// Static method to get all scenes for a chapter
sceneSchema.statics.getChapterScenes = async function(chapter) {
  return this.find({ chapter }).sort({ order: 1 });
};

// Static method to get a single scene
sceneSchema.statics.getScene = async function(id) {
  return this.findById(id);
};

// Static method to create a new scene
sceneSchema.statics.createScene = async function(sceneData) {
  const scene = new this(sceneData);
  return scene.save();
};

// Static method to update a scene
sceneSchema.statics.updateScene = async function(id, sceneData) {
  return this.findByIdAndUpdate(id, sceneData, { new: true });
};

// Static method to delete a scene
sceneSchema.statics.deleteScene = async function(id) {
  return this.findByIdAndDelete(id);
};

const Scene = mongoose.model('Scene', sceneSchema);

module.exports = Scene; 