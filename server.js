// const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
// require("dotenv").config({ path: envFile });

const app = require('./src/app.js');
const logger = require('./src/utils/logger.js');

const http = require('http');
const setupSocket = require("./src/utils/socket.js");

const server = http.createServer(app);
const io = setupSocket(server); // Attach socket.io

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
