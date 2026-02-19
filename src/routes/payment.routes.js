const express = require('express');
const router = express.Router();
const {
    processPayment,
    processPaymentPaypal,
    mipsWebhook,
    decryptMipsCallback,
    paypalWebhook,
    confirmSubscription,
    getCreditSummary,
    getPurchaseHistory,
    getCreditUsageHistory,
    getLiveSubscription,
    getSubscriptionHistory,
    cancelLiveSubscription,
    getPricingOptions,
    validateAppleReceipt,
    appleWebhook,
    checkSubscriptionStatus, restoreApplePurchases
} = require('../controllers/payment.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/payment/pricing:
 *   get:
 *     summary: Get pricing options
 *     description: Retrieve all pricing options from environment configuration
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       credits:
 *                         type: number
 *                       price:
 *                         type: number
 *                       subscription:
 *                         type: string
 *       500:
 *         description: Error fetching pricing options
 */
router.get("/pricing", getPricingOptions);

/**
 * @swagger
 * /api/payment/processPayment:
 *   post:
 *     summary: Starting a payment
 *     description: Starting a new payment
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/processPayment", processPayment);

/**
 * @swagger
 * /api/payment/processPaymentPaypal:
 *   post:
 *     summary: Starting a payment paypal
 *     description: Starting a new payment paypal
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/processPaymentPaypal", processPaymentPaypal);

/**
 * @swagger
 * /api/payment/confirmSubscription:
 *   post:
 *     summary: Confirming a payment paypal
 *     description: Confirming a new payment paypal
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/confirmSubscription", confirmSubscription);

/**
 * @swagger
 * /api/payment/mipsWebhook:
 *   post:
 *     summary: Retrieving data from MiPs payment
 *     description: Retrieving data from MiPs payment
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/mipsWebhook", mipsWebhook);

/**
 * @swagger
 * /api/payment/decryptMipsCallback:
 *   post:
 *     summary: Decrypt data from MiPs payment
 *     description: Decrypt data from MiPs payment
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/decryptMipsCallback", decryptMipsCallback);

/**
 * @swagger
 * /api/payment/paypalWebhook:
 *   post:
 *     summary: Decrypt data from paypal payment
 *     description: Decrypt data from paypal payment
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/paypalWebhook", paypalWebhook);

/**
 * @swagger
 * /api/payment/getCreditSummary:
 *   post:
 *     summary: Retrieve credit summary
 *     description: Retrieve back credit summary for a user
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/getCreditSummary", authenticateToken, getCreditSummary);

/**
 * @swagger
 * /api/payment/getPurchaseHistory:
 *   post:
 *     summary: Retrieve purchase summary
 *     description: Retrieve the purchase summary for a user
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/getPurchaseHistory", authenticateToken, getPurchaseHistory);

/**
 * @swagger
 * /api/payment/getCreditUsageHistory:
 *   post:
 *     summary: Retrieve credit usage history
 *     description: Retrieve the credit usage history for a user
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/getCreditUsageHistory", authenticateToken, getCreditUsageHistory);

/**
 * @swagger
 * /api/payment/getLiveSubscription:
 *   post:
 *     summary: Retrieve current paypal subscription
 *     description: Retrieve the current paypal subscription for a user
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/getLiveSubscription", authenticateToken, getLiveSubscription);

/**
 * @swagger
 * /api/payment/getSubscriptionHistory:
 *   post:
 *     summary: Retrieve history  paypal subscription
 *     description: Retrieve the history paypal subscription for a user
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/getSubscriptionHistory", authenticateToken, getSubscriptionHistory);

/**
 * @swagger
 * /api/payment/cancelLiveSubscription:
 *   post:
 *     summary: Cancel cuurent subscription
 *     description: Cancel the subscription of a user
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/cancelLiveSubscription", authenticateToken, cancelLiveSubscription);

/**
 * @swagger
 * /api/payment/validate-apple-receipt:
 *   post:
 *     summary: Validate apple payment receipt
 *     description: Validate apple payment receipt
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/validate-apple-receipt', authenticateToken, validateAppleReceipt);

/**
 * @swagger
 * /api/payment/apple-webhook:
 *   post:
 *     summary: Decrypt data from apple payment
 *     description: Decrypt data from apple payment
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/apple-webhook', appleWebhook);

/**
 * @swagger
 * /api/payment/subscription-status:
 *   post:
 *     summary: Check subscription status for both apple and paypal
 *     description: Check subscription status for both apple and paypal
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */

router.get('/subscription-status/:userId', authenticateToken, checkSubscriptionStatus);

/**
 * @swagger
 * /api/payment/subscription-status:
 *   post:
 *     summary: Restore previously purchased apple subscription
 *     description: Restore previously purchased apple subscription
 *     tags:
 *      - Payment
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/restore-apple', authenticateToken, restoreApplePurchases);

module.exports = router;
