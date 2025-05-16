const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  // Log request details
  logger.http({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.session?.user?.id || 'anonymous'
  });

  // Log response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
};

module.exports = requestLogger; 