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