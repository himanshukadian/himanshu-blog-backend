const express = require('express');
const aiController = require('../controllers/aiController');
const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');

const router = express.Router();

const aiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    status: 'error',
    message: 'Too many AI requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(aiRateLimit);

router.use((req, res, next) => {
  if (Number(req.get('content-length') || 0) > 51200) {
    return next(new AppError('Request too large', 413));
  }
  next();
});

router.post('/chat', aiController.generateResponse);

router.post('/stream', aiController.stream);

router.post('/rag', aiController.retrieveArticles);

router.get('/health', aiController.healthCheck);

module.exports = router;