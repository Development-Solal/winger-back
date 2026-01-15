const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

// Custom metric: HTTP request duration
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5], // Define duration buckets
});

register.registerMetric(httpRequestDuration);

const metricsMiddleware = (req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        end({
            method: req.method,
            route: req.route ? req.route.path : req.url,
            status: res.statusCode,
        });
    });
    next();
};

module.exports = { metricsMiddleware, register };
