const Scene = require('../models/Scene');
const Chapter = require('../models/Chapter');
const { catchAsync } = require('../utils/errorHandler');

// Get all scenes for a chapter by slug
exports.getChapterScenes = catchAsync(async (req, res) => {
  // Get slug from either route pattern
  const slug = req.params.slug || req.params.chapterSlug;
  
  // Find the chapter by slug
  const chapter = await Chapter.findOne({ slug });
  if (!chapter) {
    return res.status(404).json({
      status: 'fail',
      message: 'Chapter not found'
    });
  }

  // Fetch scenes by chapterId and populate chapterId
  const scenes = await Scene.find({ chapterId: chapter._id })
    .sort({ order: 1 })
    .populate('chapterId', 'slug');

  // Add slug to each scene in the response
  const scenesWithSlug = scenes.map(scene => {
    const obj = scene.toObject();
    obj.chapterSlug = scene.chapterId.slug;
    return obj;
  });

  res.status(200).json({
    status: 'success',
    data: scenesWithSlug
  });
});

// Get a single scene
exports.getScene = catchAsync(async (req, res) => {
  const { id } = req.params;
  const scene = await Scene.getScene(id);
  
  if (!scene) {
    return res.status(404).json({
      status: 'fail',
      message: 'Scene not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: scene
  });
});

// Create a new scene
exports.createScene = catchAsync(async (req, res) => {
  const scene = await Scene.createScene(req.body);
  res.status(201).json({
    status: 'success',
    data: scene
  });
});

// Update a scene
exports.updateScene = catchAsync(async (req, res) => {
  const { id } = req.params;
  const scene = await Scene.updateScene(id, req.body);

  if (!scene) {
    return res.status(404).json({
      status: 'fail',
      message: 'Scene not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: scene
  });
});

// Delete a scene
exports.deleteScene = catchAsync(async (req, res) => {
  const { id } = req.params;
  const scene = await Scene.deleteScene(id);

  if (!scene) {
    return res.status(404).json({
      status: 'fail',
      message: 'Scene not found'
    });
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
}); 