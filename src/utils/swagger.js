const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const basicAuth = require('basic-auth');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WINGer API',
            version: '1.0.0',
            description: 'API documentation for winger',
        },
    },
    apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(options);

const username = process.env.SWAGGER_USER || 'admin';
const password = process.env.SWAGGER_PASS || 'password';

const authMiddleware = (req, res, next) => {
    const user = basicAuth(req);
    if (!user || user.name !== username || user.pass !== password) {
        res.set('WWW-Authenticate', 'Basic realm="Swagger Docs"');
        return res.status(401).send('Unauthorized');
    }
    next();
};

const setupSwagger = (app) => {
    app.use('/api-docs', authMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;
