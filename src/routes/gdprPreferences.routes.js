const express = require('express');
const router = express.Router();
const { getMyPreferences, updateMyPreferences, getMyHistory, exportNewsletterSubscribers } = require('../controllers/gdprPreferences.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/gdpr/preferences:
 *   get:
 *     summary: Get current GDPR preferences for logged-in user
 *     description: Returns the current GDPR consent preferences
 *     tags:
 *      - GDPR   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/preferences', authenticateToken, getMyPreferences);

/**
 * @swagger
 * /api/gdpr/preferences:
 *   put:
 *     summary: Update GDPR preferences for logged-in user
 *     description: Updates all GDPR consent preferences (mandatory and optional)
 *     tags:
 *      - GDPR   
 *     responses:
 *       200:
 *         description: Success
 */
router.put('/preferences', authenticateToken, updateMyPreferences);

/**
 * @swagger
 * /api/gdpr/history:
 *   get:
 *     summary: Get GDPR consent history for logged-in user
 *     description: Returns the full history of consent changes
 *     tags:
 *      - GDPR   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/history', authenticateToken, getMyHistory);

/**
 * @swagger
 * /api/gdpr/export/newsletter:
 *   get:
 *     summary: Export newsletter subscribers (ADMIN ONLY)
 *     description: Returns all users who have accepted newsletter consent
 *     tags:
 *      - GDPR   
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/export/newsletter', authenticateToken, exportNewsletterSubscribers);


module.exports = router;