const express = require('express');
const router = express.Router();
const {sendAidantProAccountVerifiedMailToAdmin, sendAidantProContractSignedEmailToAidant} = require('../controllers/email.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/email/aidant-pro-verified:
 */
router.post('/aidant-pro-verified', authenticateToken, sendAidantProAccountVerifiedMailToAdmin);

router.post('/aidant-pro-contract-signed', authenticateToken, sendAidantProContractSignedEmailToAidant);

module.exports = router;