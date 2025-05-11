const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    try {
        // 1) Get token from header
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        // 2) Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // Grant access to protected route
        req.user = user;
        next();
    } catch (error) {
        next(new AppError('Authentication failed!', 401));
    }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
}; 