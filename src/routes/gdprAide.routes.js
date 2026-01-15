const express = require('express');
const router = express.Router();
const gdprAideController = require('../controllers/gdprAide.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/gdpr-aide/request-consent:
 *   post:
 *     summary: Aidant requests consent from Aidé
 *     description: Send consent request email to Aidé
 *     tags:
 *      - GDPR Aide
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/request-consent', authenticateToken, gdprAideController.requestAideConsent);
router.post('/convert-pending', authenticateToken, gdprAideController.convertPendingToActive);
/**
 * @swagger
 * /api/gdpr-aide/consent/{token}:
 *   get:
 *     summary: Get consent request details by token
 *     description: Public endpoint for Aidé to view consent request (used on consent page)
 *     tags:
 *      - GDPR Aide
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/consent/:token', gdprAideController.getConsentRequest);

/**
 * @swagger
 * /api/gdpr-aide/consent/{token}/accept:
 *   post:
 *     summary: Aidé accepts consent
 *     description: Public endpoint for Aidé to accept consent and save GDPR preferences
 *     tags:
 *      - GDPR Aide
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/consent/:token/accept', gdprAideController.acceptConsent);

/**
 * @swagger
 * /api/gdpr-aide/consent/{token}/reject:
 *   post:
 *     summary: Aidé rejects consent
 *     description: Public endpoint for Aidé to reject consent and delete all data
 *     tags:
 *      - GDPR Aide
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/consent/:token/reject', gdprAideController.rejectConsent);

/**
 * @swagger
 * /api/gdpr-aide/my-requests:
 *   get:
 *     summary: Get all consent requests for logged-in Aidant
 *     description: Returns list of all consent requests made by this Aidant
 *     tags:
 *      - GDPR Aide
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/my-requests', authenticateToken, gdprAideController.getMyConsentRequests);

/**
 * Resend consent request (delete old, create new)
 * POST /api/gdpr-aide/resend-consent
 */
router.post('/resend-consent', authenticateToken, gdprAideController.resendConsentRequest);

module.exports = router;