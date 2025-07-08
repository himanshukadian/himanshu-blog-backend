const express = require('express');
const { submitContactForm, healthCheck } = require('../controllers/contactController');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for contact form
const contactRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 contact form submissions per 5 minutes
  message: {
    status: 'error',
    message: 'Too many contact form submissions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Contact form submission
router.post('/submit', contactRateLimit, submitContactForm);

// Contact service health check
router.get('/health', healthCheck);

module.exports = router; 