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