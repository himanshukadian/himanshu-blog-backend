const express = require('express');
const { 
  suggestMeeting, 
  scheduleMeeting, 
  getAvailableSlots, 
  healthCheck 
} = require('../controllers/schedulingController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for scheduling endpoints
const schedulingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 scheduling requests per 15 minutes
  message: {
    status: 'error',
    message: 'Too many scheduling requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const suggestionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 suggestions per 5 minutes
  message: {
    status: 'error',
    message: 'Too many suggestion requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Routes
router.post('/suggest', suggestionRateLimit, suggestMeeting);
router.post('/schedule', schedulingRateLimit, scheduleMeeting);
router.get('/slots', getAvailableSlots);
router.get('/health', healthCheck);

module.exports = router; 