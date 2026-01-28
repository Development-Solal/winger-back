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
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"], // Important for cookies to work
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());
app.use(bodyParser.json());

// Use cookie-parser middleware to parse cookies
app.use(cookieParser());

//Logger middleware
app.use(loggerMiddleware);

// Swagger documentation
setupSwagger(app);

//Monitoring
app.use(metricsMiddleware);

// Register routes
app.use('/api', routes);

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

app.get('/api/debug/logs', (req, res) => {
    try {
        const fs = require('fs'); // Add this import at the top of the file
        const logPath = '/home/vacy0949/preprod.backend.winger.fr/app.log';
        const logs = fs.readFileSync(logPath, 'utf8');
        const lines = logs.split('\n').reverse().slice(0, 100).reverse(); // Last 100 lines
        res.json({ logs: lines });
    } catch (error) {
        res.json({ error: error.message });
    }
});

module.exports = app;
