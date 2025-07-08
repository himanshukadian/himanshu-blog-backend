const express = require('express');
const aiController = require('../controllers/aiController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for AI requests
const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: {
    status: 'error',
    message: 'Too many AI requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to AI routes
router.use(aiRateLimit);

// AI chat endpoint
router.post('/chat', aiController.generateResponse);

// AI service health check
router.get('/health', aiController.healthCheck);

module.exports = router; 