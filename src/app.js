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
const server = http.createServer(app);

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
        console.log(`[CORS] Incoming request from origin: "${origin}"`);
        
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
            console.log('[CORS] ✓ No origin - allowing request');
            return callback(null, true);
        }
        
        // Normalize origin (remove trailing slash if present)
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
        origin: function(origin, callback) {
            console.log(`[Socket.IO CORS] Checking origin: "${origin}"`);
            
            // Allow requests with no origin
            if (!origin) {
                console.log('[Socket.IO CORS] ✓ No origin - allowing');
                return callback(null, true);
            }
            
            const normalizedOrigin = origin.replace(/\/$/, '');
            
            if (allowedOrigins.includes(normalizedOrigin)) {
                console.log(`[Socket.IO CORS] ✓ Origin allowed: ${normalizedOrigin}`);
                callback(null, true);
            } else {
                console.log(`[Socket.IO CORS] ✗ Origin blocked: ${normalizedOrigin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const clientOrigin = socket.handshake.headers.origin;
    const clientIP = socket.handshake.address;
    
    console.log(`✅ [Socket.IO] Client connected:`);
    console.log(`   - Socket ID: ${socket.id}`);
    console.log(`   - Origin: ${clientOrigin}`);
    console.log(`   - IP: ${clientIP}`);
    console.log(`   - Transport: ${socket.conn.transport.name}`);
    
    // Send welcome message
    socket.emit('welcome', { 
        message: 'Connected to Winger server!',
        socketId: socket.id,
        timestamp: new Date()
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
        console.log(`🔌 [Socket.IO] Client disconnected:`);
        console.log(`   - Socket ID: ${socket.id}`);
        console.log(`   - Reason: ${reason}`);
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error(`❌ [Socket.IO] Connection error:`, error.message);
    });

    socket.on('error', (error) => {
        console.error(`❌ [Socket.IO] Socket error:`, error);
    });

    // Test message handler
    socket.on('message', (data) => {
        console.log('📨 [Socket.IO] Message received:', data);
        socket.emit('message', { 
            echo: data, 
            timestamp: new Date(),
            serverResponse: 'Message received successfully'
        });
    });

    // Add your custom socket event handlers here
    // Example:
    // socket.on('custom-event', (data) => {
    //     console.log('Custom event:', data);
    //     socket.emit('custom-response', { /* your data */ });
    // });
});

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
        uptime: process.uptime(),
        socket: {
            connected: io.engine.clientsCount,
            status: 'active'
        }
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
