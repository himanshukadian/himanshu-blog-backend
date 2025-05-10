const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Limit each IP to 100000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Auth rate limiter (more strict)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Limit each IP to 100000 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// API rate limiter (less strict)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Limit each IP to 100000 requests per windowMs
  message: 'Too many API requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Comment rate limiter
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Limit each IP to 100000 comments per hour
  message: 'Too many comments from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Search rate limiter
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100000, // Limit each IP to 100000 searches per 5 minutes
  message: 'Too many searches from this IP, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Limit each IP to 100000 uploads per hour
  message: 'Too many uploads from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
  commentLimiter,
  searchLimiter,
  uploadLimiter
}; 