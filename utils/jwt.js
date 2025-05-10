const jwt = require('jsonwebtoken');
const AppError = require('./appError');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-token-with-at-least-32-characters';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Verify JWT token
exports.verifyToken = async (token) => {
  try {
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = await jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token', 401);
    }
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', 401);
    }
    throw err;
  }
};

// Extract token from request headers
exports.extractToken = (req) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  return token;
}; 