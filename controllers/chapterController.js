const Section = require('../models/Section');
const Chapter = require('../models/Chapter');
const Scene = require('../models/Scene');

exports.getAllChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find({}).sort({ order: 1 });
    res.status(200).json({ status: 'success', data: chapters });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getChapterBySlug = async (req, res) => {
  try {
    const { chapterSlug } = req.params;
    const chapter = await Chapter.findOne({ slug: chapterSlug });
    
    if (!chapter) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Chapter not found' 
      });
    }

    res.status(200).json({ 
      status: 'success', 
      data: chapter 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getChaptersForSection = async (req, res) => {
  try {
    const { sectionSlug } = req.params;
    const section = await Section.findOne({ slug: sectionSlug });
    if (!section) {
      return res.status(404).json({ status: 'fail', message: 'Section not found' });
    }
    const chapters = await Chapter.find({ sectionId: section._id }).sort({ order: 1 });
    res.status(200).json({ status: 'success', data: chapters });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getScenesForChapter = async (req, res) => {
  try {
    const { chapterSlug } = req.params;
    const chapter = await Chapter.findOne({ slug: chapterSlug });
    
    if (!chapter) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Chapter not found' 
      });
    }

    const scenes = await Scene.find({ chapterId: chapter._id }).sort({ order: 1 });
    res.status(200).json({ 
      status: 'success', 
      data: scenes 
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Delete all scenes for a chapter by slug
exports.deleteScenesForChapter = async (req, res) => {
  try {
    const { chapterSlug } = req.params;
    const chapter = await Chapter.findOne({ slug: chapterSlug });
    if (!chapter) {
      return res.status(404).json({ status: 'fail', message: 'Chapter not found' });
    }
    const result = await Scene.deleteMany({ chapterId: chapter._id });
    res.status(200).json({ status: 'success', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.createChapter = async (req, res) => {
  try {
    const { title, slug, order, sectionId } = req.body;
    
    // Validate required fields
    if (!title || !slug || !order || !sectionId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide title, slug, order, and sectionId'
      });
    }

    // Check if section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        status: 'fail',
        message: 'Section not found'
      });
    }

    // Create chapter
    const chapter = await Chapter.create({
      title,
      slug,
      order,
      sectionId
    });

    res.status(201).json({
      status: 'success',
      data: chapter
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}; 