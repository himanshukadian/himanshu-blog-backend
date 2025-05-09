const Tag = require('../models/Tag');

exports.getTags = async (req, res) => {
  const tags = await Tag.find();
  res.json(tags);
};

exports.createTag = async (req, res) => {
  try {
    const tag = new Tag(req.body);
    await tag.save();
    res.status(201).json(tag);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTag = async (req, res) => {
  const { id } = req.params;
  try {
    const tag = await Tag.findByIdAndUpdate(id, req.body, { new: true });
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ message: 'Error updating tag', error: err.message });
  }
};

exports.deleteTag = async (req, res) => {
  const { id } = req.params;
  try {
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) return res.status(404).json({ message: 'Tag not found' });
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting tag', error: err.message });
  }
}; 