const Course = require('../models/Course');
const Section = require('../models/Section');
const Chapter = require('../models/Chapter');

exports.getAllSections = async (req, res) => {
  try {
    const sections = await Section.find({}).sort({ order: 1 });
    res.status(200).json({ status: 'success', data: sections });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getSectionBySlug = async (req, res) => {
  try {
    const { sectionSlug } = req.params;
    const section = await Section.findOne({ slug: sectionSlug });
    
    if (!section) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Section not found' 
      });
    }

    res.status(200).json({ 
      status: 'success', 
      data: section 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getSectionsForCourse = async (req, res) => {
  try {
    const { courseSlug } = req.params;
    const course = await Course.findOne({ slug: courseSlug });
    if (!course) {
      return res.status(404).json({ status: 'fail', message: 'Course not found' });
    }
    const sections = await Section.find({ courseId: course._id }).sort({ order: 1 });
    res.status(200).json({ status: 'success', data: sections });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getChaptersForSection = async (req, res) => {
  try {
    const { sectionSlug } = req.params;
    const section = await Section.findOne({ slug: sectionSlug });
    
    if (!section) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Section not found' 
      });
    }

    const chapters = await Chapter.find({ sectionId: section._id }).sort({ order: 1 });
    res.status(200).json({ 
      status: 'success', 
      data: chapters 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { title, slug, order, courseId } = req.body;
    
    // Validate required fields
    if (!title || !slug || !order || !courseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide title, slug, order, and courseId'
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        status: 'fail',
        message: 'Course not found'
      });
    }

    // Create section
    const section = await Section.create({
      title,
      slug,
      order,
      courseId
    });

    res.status(201).json({
      status: 'success',
      data: section
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete a section and all related chapters and scenes
exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ status: 'fail', message: 'Section not found' });
    }

    // Find all chapters in this section
    const chapters = await Chapter.find({ sectionId: id });
    const chapterIds = chapters.map(ch => ch._id);

    // Delete all scenes in these chapters
    const Scene = require('../models/Scene');
    await Scene.deleteMany({ chapterId: { $in: chapterIds } });

    // Delete all chapters in this section
    await Chapter.deleteMany({ sectionId: id });

    // Delete the section itself
    await Section.findByIdAndDelete(id);

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}; 