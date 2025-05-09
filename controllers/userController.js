const User = require('../models/User');

exports.getUsers = async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
};

exports.createUser = async (req, res) => {
  const { username, password, role } = req.body;
  const user = new User({ username, password, role });
  await user.save();
  res.status(201).json({ message: 'User created' });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  const update = { username, role };
  if (password) update.password = password;
  const user = await User.findByIdAndUpdate(id, update, { new: true });
  res.json({ message: 'User updated', user });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ message: 'User deleted' });
}; 