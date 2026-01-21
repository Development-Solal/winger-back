const express = require('express');
const router = express.Router();
const {
    register,
    login,
    refreshToken,
    logoutMobile,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword
} = require('../controllers/auth.controller');

const { validate } = require('../middlewares/validationMiddleware');
const authenticateToken = require('../middlewares/autheticationMiddleware');
const { mobileLogin } = require("../controllers/auth.mobile.controller");

// Initialize Firebase Admin SDK using environment variables
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
} else {
    admin.app(); // if already initialized, use the existing instance
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user and return the user details
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: securepassword
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               roleId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 roleId:
 *                   type: integer
 */
router.post('/register', validate, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Returns the details of the logged in user
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/login', validate, login);

/**
 * @swagger
 * /api/auth/refreshToken :
 *   get:
 *     summary: Get new refresh token
 *     description: Returns and stores a new refresh token for this user
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/refreshToken', refreshToken);

/**
 * @swagger
 * /api/auth/login-mobile:
 *   post:
 *     summary: Login user on mobile app
 *     description: Returns the details of the logged in user
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/login-mobile', validate, mobileLogin);

/**
 * @swagger
 * /api/auth/logout :
 *   get:
 *     summary: Logout a user
 *     description: Logout a user and delete the user refresh token
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/auth/logoutMobile :
 *   get:
 *     summary: Logout a user from mobile
 *     description: Logout a user from mobile app and delete the user refresh token
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/logoutMobile', authenticateToken, logoutMobile);

/**
 * @swagger
 * /api/auth/verifyEmail :
 *   post:
 *     summary: Verify email of a user
 *     description: Verifies the email token of a user
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/verifyEmail', verifyEmail);

/**
 * @swagger
 * /api/auth/forgotPassword :
 *   post:
 *     summary: Forgot password email link
 *     description: Sends an email that redirect user to a page to reset his password
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/forgotPassword', forgotPassword);

/**
 * @swagger
 * /api/auth/resetPassword :
 *   post:
 *     summary: Reset password for a user
 *     description: Allows a user to reset his password
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/resetPassword', resetPassword);

/**
 * @swagger
 * /api/auth/changePassword :
 *   post:
 *     summary: Change password for a user
 *     description: Allows a user to change his password
 *     tags:
 *      - Authentication
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/changePassword', authenticateToken, changePassword);

module.exports = router;
