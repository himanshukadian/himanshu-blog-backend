const redis = require('redis');
const { promisify } = require('util');
const AppError = require('../utils/appError');

// Create Redis client
const client = redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD
});

// Promisify Redis commands
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const keysAsync = promisify(client.keys).bind(client);

// Connect to Redis
client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

// Cache middleware
const cache = (duration) => {
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      const key = `cache:${req.originalUrl || req.url}`;

      // Try to get cached data
      const cachedData = await getAsync(key);

      if (cachedData) {
        const data = JSON.parse(cachedData);
        return res.json(data);
      }

      // Store original res.json
      const originalJson = res.json;

      // Override res.json
      res.json = function(data) {
        // Cache the response
        setAsync(key, JSON.stringify(data), 'EX', duration)
          .catch(err => console.error('Cache error:', err));

        // Call original res.json
        return originalJson.call(this, data);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Clear cache middleware
const clearCache = (pattern) => {
  return async (req, res, next) => {
    try {
      if (!pattern) {
        return next();
      }

      const keys = await keysAsync(`cache:${pattern}`);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => delAsync(key)));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Cache invalidation middleware
const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    try {
      if (!patterns || !Array.isArray(patterns)) {
        return next();
      }

      const keys = await Promise.all(
        patterns.map(pattern => keysAsync(`cache:${pattern}`))
      );

      const flatKeys = keys.flat();
      if (flatKeys.length > 0) {
        await Promise.all(flatKeys.map(key => delAsync(key)));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// Cache stats middleware
const cacheStats = async (req, res, next) => {
  try {
    const keys = await keysAsync('cache:*');
    const stats = {
      totalKeys: keys.length,
      patterns: {}
    };

    // Group keys by pattern
    keys.forEach(key => {
      const pattern = key.split(':')[1];
      stats.patterns[pattern] = (stats.patterns[pattern] || 0) + 1;
    });

    res.json({
      status: 'success',
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

// Cache health check middleware
const cacheHealth = async (req, res, next) => {
  try {
    const start = Date.now();
    await setAsync('health:check', 'ok', 'EX', 10);
    const setTime = Date.now() - start;

    const getStart = Date.now();
    await getAsync('health:check');
    const getTime = Date.now() - getStart;

    res.json({
      status: 'success',
      data: {
        connected: true,
        setTime: `${setTime}ms`,
        getTime: `${getTime}ms`
      }
    });
  } catch (err) {
    next(new AppError('Cache service is not healthy', 503));
  }
};

module.exports = {
  cache,
  clearCache,
  invalidateCache,
  cacheStats,
  cacheHealth
}; 