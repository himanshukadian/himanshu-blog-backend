const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const AppError = require('../utils/appError');

// Protect routes
const protect = async (req, res, next) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in. Please log in to get access', 401)
      );
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists', 401)
      );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt && currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('User recently changed password. Please log in again', 401)
      );
    }

    // Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Check if user is logged in (for views)
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      res.locals.user = currentUser;
      return next();
    }
    next();
  } catch (err) {
    return next();
  }
};

// Check if user is the owner of the resource
exports.isOwner = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    if (doc.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Check if user has verified email
exports.requireVerifiedEmail = (req, res, next) => {
  if (!req.user.emailVerified) {
    return next(
      new AppError('Please verify your email address to continue', 403)
    );
  }
  next();
};

// Check if user has completed profile
exports.requireCompleteProfile = (req, res, next) => {
  if (!req.user.bio || !req.user.avatar) {
    return next(
      new AppError('Please complete your profile to continue', 403)
    );
  }
  next();
};

const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      req.user = undefined;
      return next();
    }
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      req.user = undefined;
      return next();
    }
    // Check if user changed password after the token was issued
    if (currentUser.passwordChangedAt && currentUser.changedPasswordAfter(decoded.iat)) {
      req.user = undefined;
      return next();
    }
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    req.user = undefined;
    next();
  }
};

module.exports = {
  protect,
  optionalProtect
}; 