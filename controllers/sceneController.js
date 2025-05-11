const Scene = require('../models/Scene');
const { catchAsync } = require('../utils/errorHandler');

// Get all scenes for a chapter
exports.getChapterScenes = catchAsync(async (req, res) => {
  const { chapter } = req.params;
  const scenes = await Scene.getChapterScenes(chapter);
  res.status(200).json({
    status: 'success',
    data: scenes
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