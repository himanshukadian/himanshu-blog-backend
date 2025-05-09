const mongoose = require('mongoose');
const Article = require('../models/Article');
const Tag = require('../models/Tag');

exports.getArticles = async (req, res) => {
  try {
    const { tag, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (type) filter.type = type;

    if (tag) {
      const tagList = tag.split(',').map(t => t.trim()).filter(Boolean);
      const tagIds = [];

      for (const t of tagList) {
        if (mongoose.Types.ObjectId.isValid(t)) {
          tagIds.push(t);
        } else {
          const tagDoc = await Tag.findOne({ name: t });
          if (tagDoc) tagIds.push(tagDoc._id);
        }
      }

      if (tagIds.length === 0) {
        return res.json([]);
      }

      filter.tags = { $in: tagIds };
    }

    const articles = await Article.find(filter)
      .populate('tags')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });

    res.json(articles);
  } catch (err) {
    console.error('Error in getArticles:', err);
    res.status(500).json({ 
      message: 'Error fetching articles',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getArticleBySlug = async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug })
      .populate('tags');
      
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json(article);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching article' });
  }
};

exports.createArticle = async (req, res) => {
  try {
    const articleData = { ...req.body };

    if (articleData.tags && Array.isArray(articleData.tags)) {
      const tagIds = [];
      for (const tagName of articleData.tags) {
        if (mongoose.Types.ObjectId.isValid(tagName)) {
          tagIds.push(tagName);
        } else {
          let tag = await Tag.findOne({ name: tagName });
          if (!tag) {
            tag = await Tag.create({ name: tagName });
          }
          tagIds.push(tag._id);
        }
      }
      articleData.tags = tagIds;
    }

    Object.keys(articleData).forEach(key => {
      if (articleData[key] === undefined || articleData[key] === null) {
        delete articleData[key];
      }
    });

    const article = new Article(articleData);
    await article.save();
    
    const populatedArticle = await Article.findById(article._id)
      .populate('tags');
      
    res.status(201).json(populatedArticle);
  } catch (err) {
    res.status(400).json({ message: 'Error creating article' });
  }
};

exports.updateArticle = async (req, res) => {
  const { id } = req.params;
  const update = { ...req.body };

  try {
    if (update.tags && Array.isArray(update.tags)) {
      const tagIds = [];
      for (const tagName of update.tags) {
        if (mongoose.Types.ObjectId.isValid(tagName)) {
          tagIds.push(tagName);
        } else {
          let tag = await Tag.findOne({ name: tagName });
          if (!tag) {
            tag = await Tag.create({ name: tagName });
          }
          tagIds.push(tag._id);
        }
      }
      update.tags = tagIds;
    }

    Object.keys(update).forEach(key => {
      if (update[key] === undefined || update[key] === null) {
        delete update[key];
      }
    });

    const article = await Article.findByIdAndUpdate(
      id,
      update,
      { 
        new: true,
        runValidators: true
      }
    ).populate('tags');

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json(article);
  } catch (err) {
    res.status(400).json({ message: 'Error updating article' });
  }
};

exports.deleteArticle = async (req, res) => {
  const { id } = req.params;
  try {
    const article = await Article.findByIdAndDelete(id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting article' });
  }
}; 