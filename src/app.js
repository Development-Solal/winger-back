const express = require('express');
const path = require('path');
const cors = require('cors');
const routes = require('./routes/index');
const setupSwagger = require('./utils/swagger');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const { metricsMiddleware, register } = require('./middlewares/metricMiddleware');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();

// Serve static files from the 'public' folder
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use(express.urlencoded({ extended: true }));

// CORS configuration - whitelist your Cloudflare frontend
const allowedOrigins = [
    'https://winger-front.devsolalco.workers.dev',
    'https://preprod.winger.fr',
    'https://winger.fr',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://dev.winger.fr'
];

const corsOptions = {
    origin: (origin, callback) => {
        console.log(`[CORS] Incoming request from origin: "${origin}"`);
        
        if (!origin) {
            console.log('[CORS] ✓ No origin - allowing request');
            return callback(null, true);
        }
        
        const normalizedOrigin = origin.replace(/\/$/, '');
        
        if (allowedOrigins.includes(normalizedOrigin)) {
            console.log(`[CORS] ✓ Origin allowed: ${normalizedOrigin}`);
            callback(null, true);
        } else {
            console.log(`[CORS] ✗ Origin blocked: ${normalizedOrigin}`);
            console.log(`[CORS] Allowed origins:`, allowedOrigins);
            callback(null, false); 
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"], 
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());
app.use(bodyParser.json());

// Use cookie-parser middleware to parse cookies
app.use(cookieParser());

// Logger middleware
app.use(loggerMiddleware);

// Swagger documentation
setupSwagger(app);

// Monitoring
app.use(metricsMiddleware);

// Register routes
app.use('/api', routes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Debug logs endpoint
app.get('/api/debug/logs', (req, res) => {
    try {
        const fs = require('fs');
        const logPath = '/home/vacy0949/preprod.backend.winger.fr/app.log';
        const logs = fs.readFileSync(logPath, 'utf8');
        const lines = logs.split('\n').reverse().slice(0, 100).reverse(); // Last 100 lines
        res.json({ logs: lines });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
