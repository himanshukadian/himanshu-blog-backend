const compression = require('compression');

// Compression options
const compressionOptions = {
  // Only compress responses larger than 1KB
  threshold: 1024,
  
  // Compression level (1-9, where 9 is maximum compression)
  level: 6,
  
  // Only compress if the response has one of these content types
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Default compression filter
    return compression.filter(req, res);
  },
  
  // Compression window size
  windowBits: 15,
  
  // Memory level (1-9, where 9 is maximum memory usage)
  memLevel: 8,
  
  // Compression strategy
  strategy: 0,
  
  // Chunk size
  chunkSize: 16 * 1024,
  
  // Dictionary size
  dictionary: null,
  
  // Custom content types to compress
  contentType: [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/xml',
    'application/x-www-form-urlencoded',
    'image/svg+xml',
    'application/x-font-ttf',
    'application/x-font-opentype',
    'application/vnd.ms-fontobject',
    'application/x-font-woff'
  ]
};

// Create compression middleware
const compressionMiddleware = compression(compressionOptions);

// Compression stats middleware
const compressionStats = (req, res, next) => {
  const originalSend = res.send;
  let originalSize = 0;
  let compressedSize = 0;

  res.send = function(body) {
    if (body) {
      originalSize = Buffer.byteLength(body);
    }

    const result = originalSend.call(this, body);

    if (res.getHeader('content-length')) {
      compressedSize = parseInt(res.getHeader('content-length'), 10);
    }

    // Calculate compression ratio
    const ratio = originalSize > 0
      ? ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
      : 0;

    // Log compression stats
    console.log({
      url: req.originalUrl,
      method: req.method,
      originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
      ratio: `${ratio}%`
    });

    return result;
  };

  next();
};

// Compression health check middleware
const compressionHealth = (req, res) => {
  res.json({
    status: 'success',
    data: {
      enabled: true,
      options: {
        threshold: compressionOptions.threshold,
        level: compressionOptions.level,
        contentType: compressionOptions.contentType
      }
    }
  });
};

module.exports = {
  compressionMiddleware,
  compressionStats,
  compressionHealth
}; 