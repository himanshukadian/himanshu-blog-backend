const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// CORS middleware
const corsMiddleware = cors(corsOptions);

// XSS protection middleware
const xssProtection = xss();

// MongoDB query sanitization middleware
const mongoSanitization = mongoSanitize({
  replaceWith: '_'
});

// HTTP Parameter Pollution protection middleware
const hppProtection = hpp();

// Request size limiter middleware
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.headers['content-length'] > maxSize) {
    return res.status(413).json({
      status: 'error',
      message: 'Request entity too large'
    });
  }
  next();
};

// URL length limiter middleware
const urlLengthLimiter = (req, res, next) => {
  const maxLength = 2048; // 2KB
  if (req.url.length > maxLength) {
    return res.status(414).json({
      status: 'error',
      message: 'URI too long'
    });
  }
  next();
};

// Method not allowed middleware
const methodNotAllowed = (req, res, next) => {
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed'
    });
  }
  next();
};

// Security middleware
const securityMiddleware = [
  securityHeaders,
  corsMiddleware,
  xssProtection,
  mongoSanitization,
  hppProtection,
  requestSizeLimiter,
  urlLengthLimiter,
  methodNotAllowed
];

module.exports = securityMiddleware; 