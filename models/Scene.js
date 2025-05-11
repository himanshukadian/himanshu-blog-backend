const mongoose = require('mongoose');

const sceneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  // Optionally keep chapter name for migration, but can be removed after migration
  chapter: {
    type: String,
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
sceneSchema.index({ chapterId: 1, order: 1 });

// Static method to get all scenes for a chapter by chapterId
sceneSchema.statics.getChapterScenes = async function(chapterId) {
  return this.find({ chapterId }).sort({ order: 1 });
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