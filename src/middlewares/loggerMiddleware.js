const logger = require('../utils/logger'); 


const loggerMiddleware = (req, res, next) => {
    // logger.info(`Incoming request: [${req.method}] ${req.url} - IP: ${req.ip} - User-Agent: ${req.headers['user-agent']}`);

    const start = Date.now();

    // Log the request completion details
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`[${req.method}] ${req.url} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    });

    next();
};

// Log shutdown events when the application receives a SIGINT
process.on('SIGINT', () => {
    logger.warn('Application shutting down gracefully...');
    process.exit(0);
});

module.exports = loggerMiddleware;
