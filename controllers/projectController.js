const Project = require('../models/Project');
const AppError = require('../utils/appError');

// Submit a new project
exports.submitProject = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    
    // TODO: Add email notification logic here
    
    res.status(201).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(new AppError('Error submitting project', 400));
  }
};

// Get all projects (with pagination)
exports.getAllProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Project.countDocuments();

    res.status(200).json({
      status: 'success',
      results: projects.length,
      total,
      data: {
        projects
      }
    });
  } catch (error) {
    next(new AppError('Error fetching projects', 400));
  }
};

// Get project by ID
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return next(new AppError('No project found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(new AppError('Error fetching project', 400));
  }
};

// Update project status
exports.updateProjectStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'analyzing', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!project) {
      return next(new AppError('No project found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(new AppError('Error updating project status', 400));
  }
}; 