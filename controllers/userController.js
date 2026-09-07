const User = require('../models/User');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');

// Get all users (admin only)
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().setOptions({ includeInactive: true }).select('-password +active').lean();

    const data = users.map(u => ({
      ...u,
      username: u.name || u.email,
      isAdmin: u.role === 'admin'
    }));

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// Create user (signup or admin-added user)
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, isAdmin, name, email } = req.body;

    const user = await User.create({
      name: name || username,
      email:
        email ||
        (username && username.includes('@') ? username : `${username}@user.local`),
      password,
      role: isAdmin ? 'admin' : 'user'
    });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from output
    user.password = undefined;

    res.status(201).json({
      status: 'success',
      token,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// Update user (admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.username) {
      updateData.name = updateData.username;
      delete updateData.username;
    }
    if (typeof updateData.isAdmin === 'boolean') {
      updateData.role = updateData.isAdmin ? 'admin' : 'user';
      delete updateData.isAdmin;
    }
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).setOptions({ includeInactive: true }).select('-password');

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { ...user.toObject(), username: user.name, isAdmin: user.role === 'admin' }
    });
  } catch (err) {
    next(err);
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id).setOptions({ includeInactive: true });

    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// Get current user
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// Update current user
exports.updateMe = async (req, res, next) => {
  try {
    if (req.body.password) {
      return next(new AppError('This route is not for password updates. Please use /updatePassword.', 400));
    }

    // Filter out unwanted fields that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email', 'bio', 'avatar');

    const user = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// Delete current user
exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to filter object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
}; 