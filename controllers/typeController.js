const Type = require('../models/Type');

exports.getTypes = async (req, res) => {
  const types = await Type.find();
  res.json(types);
};

exports.createType = async (req, res) => {
  try {
    const type = new Type(req.body);
    await type.save();
    res.status(201).json(type);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateType = async (req, res) => {
  const { id } = req.params;
  try {
    const type = await Type.findByIdAndUpdate(id, req.body, { new: true });
    if (!type) return res.status(404).json({ message: 'Type not found' });
    res.json(type);
  } catch (err) {
    res.status(500).json({ message: 'Error updating type', error: err.message });
  }
};

exports.deleteType = async (req, res) => {
  const { id } = req.params;
  try {
    const type = await Type.findByIdAndDelete(id);
    if (!type) return res.status(404).json({ message: 'Type not found' });
    res.json({ message: 'Type deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting type', error: err.message });
  }
}; 