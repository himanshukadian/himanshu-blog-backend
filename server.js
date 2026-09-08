// Trigger redeploy: trivial comment
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const morgan = require('morgan');
const AppError = require('./utils/appError');
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Sanitize data
app.use(xss()); // Prevent XSS attacks

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression
app.use(compression());

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'https://codeanimo.buildwithhimanshu.com',
  'https://zynki.online',
  'https://blog.buildwithhimanshu.com',
  'http://localhost:3000', // Portfolio development
  'https://portfolio.buildwithhimanshu.com' // Portfolio production
];
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for PDFs
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/articles', require('./routes/articleRoutes'));
app.use('/api/tags', require('./routes/tagRoutes'));
app.use('/api/types', require('./routes/typeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use(globalLimiter);
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/scheduling', require('./routes/schedulingRoutes'));
app.use('/api/resume', require('./routes/resumeRoutes'));

// Course hierarchy routes
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/sections', require('./routes/sectionRoutes'));
app.use('/api/chapters', require('./routes/chapterRoutes'));
app.use('/api/scenes', require('./routes/sceneRoutes'));

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(require('./middleware/error'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/blog', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Start server
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const ragStats = require('./utils/articleRag').getStats();
    console.log('[halo] aiService health ok', ragStats);
  } catch (e) {
    console.warn('[halo] aiService health check unavailable');
  }
}); 