const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const routes = require('./routes/index');
const setupSwagger = require('./utils/swagger');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const { metricsMiddleware, register } = require('./middlewares/metricMiddleware');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const setupSocket = require('./socket'); // Import your socket setup

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with your existing setup
const io = setupSocket(server);

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

// Express CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
            return callback(null, true);
        }
        
        // Normalize origin (remove trailing slash if present)
        const normalizedOrigin = origin.replace(/\/$/, '');
        
        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.log(`[Express CORS] ✗ Origin blocked: ${normalizedOrigin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Make io accessible in routes if needed
app.set('io', io);

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

// Root route
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Winger API is running',
        version: '1.0.0',
        timestamp: new Date(),
        endpoints: {
            api: '/api',
            health: '/health',
            metrics: '/metrics',
            docs: '/api-docs',
            socket: '/socket.io'
        }
    });
});

// Register routes
app.use('/api', routes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'UP',
        timestamp: new Date(),
        uptime: process.uptime()
    });
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

// Export both app and server
module.exports = { app, server, io };
