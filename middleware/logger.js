const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create write streams for different log types
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// Custom token for request body
morgan.token('body', (req) => JSON.stringify(req.body));

// Custom token for response body
morgan.token('response-body', (req, res) => {
  if (res.body) {
    return JSON.stringify(res.body);
  }
  return '';
});

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(2);
});

// Custom format for access logs
const accessFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Custom format for error logs
const errorFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms\nRequest Body: :body\nResponse Body: :response-body';

// Development logging middleware
const devLogger = morgan('dev');

// Production access logging middleware
const accessLogger = morgan(accessFormat, {
  stream: accessLogStream,
  skip: (req, res) => res.statusCode >= 400
});

// Production error logging middleware
const errorLogger = morgan(errorFormat, {
  stream: errorLogStream,
  skip: (req, res) => res.statusCode < 400
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = process.hrtime();

  // Log request details
  console.log('\n=== Incoming Request ===');
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);

  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    res.body = body;
    return originalSend.call(this, body);
  };

  // Log response details
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;

    console.log('\n=== Outgoing Response ===');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Time: ${time.toFixed(2)}ms`);
    console.log('Headers:', res.getHeaders());
    console.log('Body:', res.body);
    console.log('========================\n');
  });

  next();
};

// Error logging middleware
const errorLogging = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      status: err.status
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('\n=== Error ===');
    console.error(JSON.stringify(errorLog, null, 2));
    console.error('=============\n');
  }

  // Log to file in production
  if (process.env.NODE_ENV === 'production') {
    fs.appendFileSync(
      path.join(logsDir, 'error.log'),
      JSON.stringify(errorLog, null, 2) + '\n'
    );
  }

  next(err);
};

module.exports = {
  devLogger,
  accessLogger,
  errorLogger,
  requestLogger,
  errorLogging
}; 