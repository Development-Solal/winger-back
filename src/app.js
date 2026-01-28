const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const routes = require('./routes/index');
const setupSwagger = require('./utils/swagger');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const { metricsMiddleware, register } = require('./middlewares/metricMiddleware');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app); // Create HTTP server

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
app.options('*', cors(corsOptions));

// Socket.IO configuration with CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'], // Support both transports
    allowEIO3: true // Support older clients if needed
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    
    socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id} - Reason: ${reason}`);
    });

    socket.on('error', (error) => {
        console.error(`[Socket.IO] Error: ${error}`);
    });

    // Add your socket event handlers here
    socket.on('message', (data) => {
        console.log('[Socket.IO] Message received:', data);
        socket.emit('message', { echo: data });
    });
});

// Make io accessible in routes
app.set('io', io);

// Middleware to parse JSON
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
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
        endpoints: {
            api: '/api',
            health: '/health',
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
    res.status(200).json({ status: 'UP' });
});

// Debug logs endpoint
app.get('/api/debug/logs', (req, res) => {
    try {
        const fs = require('fs');
        const logPath = '/home/vacy0949/preprod.backend.winger.fr/app.log';
        const logs = fs.readFileSync(logPath, 'utf8');
        const lines = logs.split('\n').reverse().slice(0, 100).reverse();
        res.json({ logs: lines });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export both app and server
module.exports = { app, server, io };
