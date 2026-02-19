require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const crypto = require("crypto");
const logger = require('../utils/logger');
const path = require('path');
const {Op} = require('sequelize');
const {PaymentHistory, User, Subscription, ProfileAidant, CreditsHistory} = require("../models");
const jwt = require('jsonwebtoken');
const {sendInvoiceEmail} = require('../utils/mail');
const {generateInvoice} = require('../utils/invoice');

const getAuthHeader = () => {
  const authString = `${process.env.MIPS_USERNAME}:${process.env.MIPS_PASSWORD}`;
  return 'Basic ' + Buffer.from(authString).toString('base64');
};

const generateOrderId = () => {
  const timestamp = Date.now().toString().slice(-5);
  const random = crypto.randomInt(10, 99);
  return `INV${timestamp}${random}`;
};

const PRODUCT_CREDITS = {
  'credit_5': 5,
  'credit_15': 15,
};

// ═══════════════════════════════════════════════════════════
// APPLE JWT & API HELPERS
// ═══════════════════════════════════════════════════════════
const verifyAppleJWT = async (token) => {
  try {
    logger.info('Verifying Apple JWT', {
      tokenLength: token.length,
      format: token.startsWith('ey') ? 'valid' : 'invalid'
    });

    const decoded = jwt.decode(token, {complete: true});
    if (!decoded || !decoded.header || !decoded.payload) {
      throw new Error('Invalid JWT structure');
    }

    logger.info('JWT decoded', {
      algorithm: decoded.header.alg,
      hasCertChain: !!decoded.header.x5c,
      payloadKeys: Object.keys(decoded.payload)
    });

    if (!decoded.header.x5c || !decoded.header.x5c[0]) {
      throw new Error('No certificate chain in JWT header');
    }

    const certString = decoded.header.x5c[0];
    const cert = `-----BEGIN CERTIFICATE-----\n${certString}\n-----END CERTIFICATE-----`;
    const publicKey = crypto.createPublicKey(cert);
    const verified = jwt.verify(token, publicKey, {algorithms: ['ES256']});

    logger.info('JWT verified successfully', {
      transactionId: verified.transactionId,
      productId: verified.productId,
      environment: verified.environment
    });

    return verified;
  } catch (error) {
    logger.error('JWT verification failed', {error: error.message, stack: error.stack});
    throw error;
  }
};

const decodeAppleJWT = (token) => {
  try {
    const parts = token.split('.');
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (error) {
    logger.error('Failed to decode Apple JWT', {error: error.message});
    return null;
  }
};

const generateAppleServerJWT = () => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.APPLE_ISSUER_ID,
    iat: now,
    exp: now + 3600,
    aud: 'appstoreconnect-v1',
    bid: process.env.APPLE_BUNDLE_ID,
  };
  const privateKeyPath = path.join(__dirname, '../config', process.env.APPLE_KEY_FILENAME || 'AuthKey.p8');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: process.env.APPLE_KEY_ID,
  });
};

const getAppleSubscriptionStatus = async (originalTransactionId) => {
  try {
    const token = generateAppleServerJWT();
    const baseUrl = process.env.APPLE_ENVIRONMENT === 'production'
        ? 'https://api.storekit.itunes.apple.com'
        : 'https://api.storekit-sandbox.itunes.apple.com';

    const url = `${baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const subscriptionData = response.data;
    if (subscriptionData.data && subscriptionData.data.length > 0) {
      const latestItem = subscriptionData.data[0];
      const lastTransaction = latestItem.lastTransactions?.[0];

      if (lastTransaction?.signedTransactionInfo) {
        const decoded = jwt.decode(lastTransaction.signedTransactionInfo);
        const result = {
          isActive: lastTransaction.status === 1,
          expiresDate: decoded?.expiresDate ? new Date(decoded.expiresDate) : null,
          originalTransactionId: decoded?.originalTransactionId,
          transactionId: decoded?.transactionId,
          productId: decoded?.productId,
          status: lastTransaction.status,
          autoRenewStatus: decoded?.autoRenewStatus,
        };

        logger.info('Apple API subscription status', {
          originalTransactionId,
          isActive: result.isActive,
          expiresDate: result.expiresDate,
          appleStatus: result.status,
        });

        return result;
      }
    }

    return {isActive: false, expiresDate: null, status: null};
  } catch (error) {
    logger.error('Apple subscription status check failed', {
      error: error.message,
      status: error.response?.status,
      originalTransactionId,
    });
    return null;
  }
};

const getPriceForProduct = (productId) => {
  const prices = {
    'credit_5': 5.00,
    'credit_15': 10.00,
    'unlimited_monthly_subscription': 12.00,
  };
  return prices[productId] || 0;
};

// ═══════════════════════════════════════════════════════════
// PAYPAL HELPERS
// ═══════════════════════════════════════════════════════════
const getAccessToken = async () => {
  const base64 = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const paypalApiUrl = process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com/v1/oauth2/token'
      : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

  const res = await fetch(paypalApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
};

const getPaypalSubscription = async (subscriptionId) => {
  const token = await getAccessToken();
  const paypalApiUrl = process.env.PAYPAL_MODE === "live"
      ? `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`
      : `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}`;

  const res = await fetch(paypalApiUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) throw new Error('Failed to fetch subscription from PayPal');
  return await res.json();
};

// ═══════════════════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════════════════
const getPricingConfig = () => {
  try {
    const configPath = path.join(__dirname, '../config/pricing.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const pricingConfig = JSON.parse(configData);
    console.log('Pricing loaded from JSON file:', pricingConfig);
    return pricingConfig;
  } catch (error) {
    console.error('Error reading pricing.json:', error.message);
    throw error;
  }
};

const getPricingOptions = async (req, res) => {
  try {
    const pricingOptions = getPricingConfig();
    res.json({success: true, data: pricingOptions});
  } catch (error) {
    logger.error('Error fetching pricing options:', {error: error.message});
    res.status(500).json({success: false, message: error.message, error: error.message});
  }
};

// ═══════════════════════════════════════════════════════════
// INVOICE HELPER
// Updated: generateInvoice now takes (payment, id) — no invoicePath.
// The function handles temp storage, O2Switch upload, and cleanup internally.
// sendInvoiceEmail is called with the temp path before cleanup occurs,
// by wrapping generateInvoice in a promise that resolves after the PDF is written.
// ═══════════════════════════════════════════════════════════
const generateAndSendInvoice = async (user, invoiceId, price, subscriptionType, paymentMethod = 'Apple In-App Purchase') => {
  try {
    await generateInvoice(
        {
          id: invoiceId,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          price: price,
          subscription_type: subscriptionType,
          payment_date: new Date(),
          payment_method: paymentMethod,
        },
        invoiceId  // Pass invoiceId (not a file path) — invoice.js builds the temp path internally
    );

    // Email is sent using the temp path that invoice.js creates before uploading.
    // Ensure sendInvoiceEmail is called before invoice.js cleans up the temp file,
    // or update sendInvoiceEmail to accept a URL from the O2Switch upload result.
    const tempFilePath = `/tmp/${invoiceId}-invoice.pdf`;
    await sendInvoiceEmail(user, tempFilePath);

    logger.info('Invoice generated and sent', {invoiceId, subscriptionType});
  } catch (error) {
    logger.error('Invoice generation/sending failed', {invoiceId, error: error.message});
  }
};

// ═══════════════════════════════════════════════════════════
// MIPS PAYMENT
// ═══════════════════════════════════════════════════════════
const processPayment = async (req, res) => {
  const {aidant_id, amount, subscription_type, credits, iframe_behavior} = req.body;
  const id_order = generateOrderId();
  const currency = "EUR";

  try {
    const paymentPayload = {
      authentify: {
        id_merchant: process.env.MIPS_MERCHANT_ID,
        id_entity: process.env.MIPS_ENTITY_ID,
        id_operator: process.env.MIPS_OPERATOR_ID,
        operator_password: process.env.MIPS_OPERATOR_PASSWORD
      },
      order: {id_order, currency, amount},
      iframe_behavior: iframe_behavior,
      request_mode: "simple",
      touchpoint: "web"
    };

    const response = await axios.post(process.env.MIPS_API_URL, paymentPayload, {
      headers: {
        "Authorization": getAuthHeader(),
        "Accept": "application/json, text/html, application/xml, multipart/form-data, application/EDIFACT, text/plain",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const existing = await PaymentHistory.findByPk(id_order);
    if (existing) {
      return res.status(409).json({error: "Payment already initiated."});
    }

    const profileAidant = await ProfileAidant.findOne({where: {user_id: aidant_id}});
    if (!profileAidant) {
      return res.status(404).json({message: "ProfileAidant not found."});
    }

    await PaymentHistory.create({
      id: id_order,
      aidant_id: profileAidant.id,
      subscription_type,
      credits: subscription_type === "forfait" ? credits : null,
      price: amount,
      payment_status: "pending",
    });

    logger.info('Mips process data', {data: response.data});
    res.json(response.data);
  } catch (error) {
    console.error("MiPS API Error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Payment request failed",
      details: error.response?.data || error.message
    });
  }
};

const decryptMipsCallback = async (cryptedData) => {
  const payload = {
    authentify: {
      id_merchant: process.env.MIPS_MERCHANT_ID,
      id_entity: process.env.MIPS_ENTITY_ID,
      id_operator: process.env.MIPS_OPERATOR_ID,
      operator_password: process.env.MIPS_OPERATOR_PASSWORD
    },
    salt: process.env.MIPS_SALT,
    cipher_key: process.env.MIPS_CYPHER_KEY,
    received_crypted_data: cryptedData
  };

  const response = await axios.post(process.env.MIPS_DECRYPT_URL, payload, {
    headers: {
      "Authorization": getAuthHeader(),
      "Accept": "application/json, text/html, application/xml, multipart/form-data, application/EDIFACT, text/plain",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  return response.data;
};

const mipsWebhook = async (req, res) => {
  const data = req.body;

  try {
    const decrypted = await decryptMipsCallback(data.crypted_callback);
    logger.info('Decrypted MIPS payload', {decrypted});

    const {id_order, status, transaction_id} = decrypted;
    const payment_status = status === 'SUCCESS' ? 'success' : 'failed';

    const paymentRecord = await PaymentHistory.findByPk(id_order);
    if (!paymentRecord) {
      logger.warn('Payment record not found', {id_order});
      return res.status(404).json({message: 'Payment record not found'});
    }

    if (paymentRecord.payment_status === 'success') {
      logger.info('Payment already marked as success, skipping', {id_order});
      return res.status(200).json({message: 'Payment already processed'});
    }

    await paymentRecord.update({payment_status, transaction_id});
    logger.info('PaymentHistory updated successfully', {id_order, status});

    if (status === 'SUCCESS' && paymentRecord.subscription_type === 'forfait') {
      const user = await User.findByPk(paymentRecord.aidant_id);
      if (user) {
        user.credits = (user.credits || 0) + (paymentRecord.credits || 0);
        await user.save();
        logger.info('Credits added to User', {user: user.id, new_credits: user.credits});

        // Updated: pass paymentRecord.id as the invoice id (not a file path)
        await generateInvoice(
            {
              id: paymentRecord.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              price: paymentRecord.price,
              subscription_type: "Crédits",
              payment_date: paymentRecord.updatedAt,
              payment_method: "Carte bancaire"
            },
            paymentRecord.id  // id, not a path
        );

        const tempFilePath = `/tmp/${paymentRecord.id}-invoice.pdf`;
        await sendInvoiceEmail(user, tempFilePath);
      } else {
        logger.warn('User not found for credit update', {user: paymentRecord.aidant_id});
      }
    }

    res.status(200).json({message: 'MIPS webhook processed'});
  } catch (err) {
    logger.error('Error decrypting MIPS callback', {error: err.message});
    res.status(500).json({message: 'MIPS webhook error', error: err.message});
  }
};

// ═══════════════════════════════════════════════════════════
// PAYPAL PAYMENT
// ═══════════════════════════════════════════════════════════
const processPaymentPaypal = async (req, res) => {
  const {aidant_id, subscriptionId, plan_id} = req.body;

  try {
    const existingSub = await Subscription.findOne({
      where: {
        aidant_id,
        status: {[Op.in]: ['active', 'pending']},
      }
    });

    if (existingSub) {
      return res.status(400).json({
        error: 'Vous avez déjà un abonnement actif ou en attente.',
      });
    }

    await Subscription.create({
      id: subscriptionId,
      aidant_id,
      plan_id: plan_id,
      status: "pending",
      start_time: new Date()
    });

    return res.status(200).json({message: "Saved payment history"});
  } catch (err) {
    logger.error('Payment request failed', {error: err.message});
    res.status(500).json({message: 'Payment request failed', error: err.message});
  }
};

const confirmSubscription = async (req, res) => {
  const {subscriptionId, aidant_id} = req.body;

  try {
    await Subscription.update(
        {status: "active"},
        {where: {id: subscriptionId, aidant_id}}
    );
    await PaymentHistory.update(
        {payment_status: "success"},
        {where: {transaction_id: subscriptionId, payment_status: "pending"}}
    );
    return res.status(200).json({message: "Subscription confirmed"});
  } catch (err) {
    logger.error('Error confirming subscription', {error: err.message});
    res.status(500).json({message: 'Error confirming subscription', error: err.message});
  }
};

const paypalWebhook = async (req, res) => {
  const event = req.body;
  const eventType = event.event_type;
  const resource = event.resource;

  try {
    logger.info("PayPal Webhook Event:", eventType);

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subscriptionId = resource.id;
        await Subscription.update(
            {
              status: "active",
              start_time: resource.start_time,
              next_billing_time: resource.billing_info?.next_billing_time || null,
              payer_email: resource.subscriber?.email_address || null,
            },
            {where: {id: subscriptionId}}
        );
        await PaymentHistory.update(
            {payment_status: "success"},
            {where: {transaction_id: subscriptionId}}
        );
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        const subscriptionId = resource.billing_agreement_id;
        const amount = parseFloat(resource.amount.total);
        const transactionId = resource.id;

        const subscription = await Subscription.findOne({where: {id: subscriptionId}});
        if (!subscription) {
          logger.warn(`Subscription not found for ID ${subscriptionId}`);
          break;
        }

        const aidantId = subscription.aidant_id;
        const existingPayment = await PaymentHistory.findOne({
          where: {transaction_id: transactionId, aidant_id: aidantId}
        });

        const invoiceId = generateOrderId();

        if (existingPayment) {
          await existingPayment.update({payment_status: "success", price: amount});
          logger.info(`Updated existing PaymentHistory for subscription ${subscriptionId}`);
        } else {
          await PaymentHistory.create({
            id: invoiceId,
            aidant_id: aidantId,
            subscription_type: "abonnement",
            credits: null,
            price: amount,
            payment_status: "success",
            transaction_id: subscriptionId,
          });
          logger.info(`Created new PaymentHistory for recurring payment of subscription ${subscriptionId}`);
        }

        const user = await User.findByPk(aidantId);
        if (user) {
          await generateAndSendInvoice(user, invoiceId, amount, 'Abonnement', 'Paypal');
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subscriptionId = resource.id;
        const newStatus = eventType.split(".")[2].toLowerCase();
        await Subscription.update(
            {status: newStatus},
            {where: {id: subscriptionId}}
        );
        break;
      }

      default:
        logger.info("Unhandled event:", eventType);
    }

    return res.status(200).send("OK");
  } catch (err) {
    logger.error('Webhook error:', {error: err.message});
    res.status(500).json({message: 'Webhook error:', error: err.message});
  }
};

// ═══════════════════════════════════════════════════════════
// APPLE IAP VALIDATION
// ═══════════════════════════════════════════════════════════
const validateAppleReceipt = async (req, res) => {
  const {purchaseToken, productId, userId} = req.body;

  if (!purchaseToken || !productId || !userId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['purchaseToken', 'productId', 'userId']
    });
  }

  try {
    const transaction = await verifyAppleJWT(purchaseToken);
    logger.info("transaction", JSON.stringify(transaction));
    logger.info('Apple JWT verified', {
      transactionId: transaction.transactionId,
      originalTransactionId: transaction.originalTransactionId,
      productId: transaction.productId,
      transactionReason: transaction.transactionReason,
      environment: transaction.environment
    });

    if (transaction.productId !== productId) {
      return res.status(400).json({
        error: 'Product ID mismatch',
        expected: productId,
        received: transaction.productId
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    const isSubscription = productId === 'unlimited_monthly_subscription';
    const credits = PRODUCT_CREDITS[productId] || 0;
    const price = transaction.price ? (transaction.price / 1000) : getPriceForProduct(productId);

    const existingPayment = await PaymentHistory.findOne({
      where: {transaction_id: transaction.transactionId}
    });

    if (existingPayment && existingPayment.payment_status === 'success') {
      logger.info('This exact transaction already processed', {transactionId: transaction.transactionId});
      return res.status(200).json({
        success: true,
        message: 'Transaction already processed',
        alreadyProcessed: true,
        processedAt: existingPayment.updatedAt,
      });
    }

    if (isSubscription) {
      const existingSubscription = await Subscription.findOne({
        where: {id: transaction.originalTransactionId, aidant_id: userId}
      });

      if (existingSubscription && existingSubscription.status === 'active') {
        const isStillValid = existingSubscription.next_billing_time &&
            new Date(existingSubscription.next_billing_time) > new Date();

        if (isStillValid) {
          logger.info('Active subscription already exists, skipping duplicate', {
            originalTransactionId: transaction.originalTransactionId,
            transactionId: transaction.transactionId,
            nextBillingTime: existingSubscription.next_billing_time
          });
          return res.status(200).json({
            success: true,
            message: 'Subscription already active',
            alreadyProcessed: true,
          });
        }
      }
    }

    if (isSubscription) {
      const subscriptionOwner = await Subscription.findOne({
        where: {
          id: transaction.originalTransactionId,
          aidant_id: {[Op.ne]: userId},
        }
      });

      if (subscriptionOwner) {
        const isStillValid = subscriptionOwner.status === 'active' &&
            subscriptionOwner.next_billing_time &&
            new Date(subscriptionOwner.next_billing_time) > new Date();

        if (isStillValid) {
          logger.warn('Subscription belongs to another account', {
            originalTransactionId: transaction.originalTransactionId,
            requestingUserId: userId,
            ownerUserId: subscriptionOwner.aidant_id,
          });
          return res.status(403).json({
            success: false,
            error: 'SUBSCRIPTION_LINKED_TO_OTHER_ACCOUNT',
            message: 'This Apple subscription is already linked to another account.',
          });
        }

        logger.info('Previous subscription owner expired, allowing new user to claim', {
          originalTransactionId: transaction.originalTransactionId,
          previousOwner: subscriptionOwner.aidant_id,
          newOwner: userId,
        });
      }
    }

    const invoiceId = generateOrderId();

    const alreadyRecorded = await PaymentHistory.findOne({
      where: {transaction_id: transaction.transactionId}
    });

    let paymentCreated = false;

    if (alreadyRecorded) {
      logger.info('Transaction already recorded (likely by webhook), skipping PaymentHistory create', {
        transactionId: transaction.transactionId,
        existingId: alreadyRecorded.id,
      });
    } else {
      await PaymentHistory.create({
        id: invoiceId,
        aidant_id: userId,
        subscription_type: isSubscription ? 'abonnement' : 'forfait',
        credits: isSubscription ? null : credits,
        price: price,
        payment_status: 'success',
        transaction_id: transaction.transactionId,
        payment_method: 'apple',
      });
      paymentCreated = true;
      logger.info('Created payment history', {invoiceId, transactionId: transaction.transactionId});
    }

    if (isSubscription) {
      const startTime = new Date(transaction.purchaseDate);
      const nextBillingTime = transaction.expiresDate
          ? new Date(transaction.expiresDate)
          : new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);

      const existingSub = await Subscription.findOne({
        where: {id: transaction.originalTransactionId}
      });

      if (existingSub) {
        await existingSub.update({
          aidant_id: userId,
          status: 'active',
          start_time: startTime,
          next_billing_time: nextBillingTime,
          payment_method: 'apple',
          payer_email: user.email || null,
        });
        logger.info('Updated existing subscription', {
          subscriptionId: transaction.originalTransactionId,
          previousStatus: existingSub.status,
          aidant_id: userId,
        });
      } else {
        await Subscription.create({
          id: transaction.originalTransactionId,
          aidant_id: userId,
          plan_id: 'unlimited_monthly_subscription',
          status: 'active',
          start_time: startTime,
          next_billing_time: nextBillingTime,
          payment_method: 'apple',
          payer_email: user.email || null,
        });
        logger.info('Created new subscription', {subscriptionId: transaction.originalTransactionId});
      }

      if (paymentCreated) {
        const invoiceLabel = transaction.transactionReason === 'RENEWAL'
            ? 'Renouvellement Abonnement'
            : 'Abonnement';
        await generateAndSendInvoice(user, invoiceId, price, invoiceLabel);
      }
    } else {
      if (paymentCreated) {
        user.credits = (user.credits || 0) + credits;
        await user.save();
        logger.info('Credits added via Apple IAP', {userId, credits, newBalance: user.credits});
        await generateAndSendInvoice(user, invoiceId, price, 'Crédits');
      } else {
        logger.info('Credits already granted by webhook, skipping', {
          userId,
          transactionId: transaction.transactionId
        });
      }
    }

    logger.info('Apple IAP processed successfully', {
      invoiceId,
      userId,
      productId,
      transactionReason: transaction.transactionReason,
      paymentCreated,
    });

    return res.status(200).json({
      success: true,
      credits: isSubscription ? null : credits,
      newBalance: user.credits,
      transactionId: transaction.transactionId,
      alreadyProcessed: !paymentCreated,
    });
  } catch (error) {
    logger.error('Apple IAP validation error', {
      error: error.message,
      stack: error.stack,
      userId,
      productId
    });
    return res.status(500).json({
      error: 'Payment validation failed',
      details: error.message,
    });
  }
};

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION HISTORY
// ═══════════════════════════════════════════════════════════
const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.body.userId;
    const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}});
    if (!profileAidant) {
      return res.status(404).json({message: "ProfileAidant not found"});
    }

    const history = await PaymentHistory.findAll({
      where: {
        aidant_id: profileAidant.id,
        subscription_type: 'abonnement',
      },
      order: [['updatedAt', 'DESC']],
    });

    const subscriptionHistory = history.map((entry) => ({
      id: entry.id,
      transactionId: entry.transaction_id,
      date: entry.updatedAt.toLocaleDateString("fr-FR"),
      amount: entry.price,
      status: entry.payment_status,
      invoiceId: entry.id
    }));

    res.json(subscriptionHistory);
  } catch (err) {
    logger.error('Error fetching subscription history:', {error: err.message});
    res.status(500).json({message: 'Internal server error', error: err.message});
  }
};

// ═══════════════════════════════════════════════════════════
// APPLE WEBHOOK
// ═══════════════════════════════════════════════════════════
const appleWebhook = async (req, res) => {
  const {signedPayload} = req.body;

  try {
    const decodedPayload = decodeAppleJWT(signedPayload);
    const {notificationType, subtype, data} = decodedPayload;

    const transactionInfo = data?.signedTransactionInfo
        ? decodeAppleJWT(data.signedTransactionInfo)
        : null;

    logger.info('Apple webhook received', {
      notificationType,
      subtype,
      originalTransactionId: transactionInfo?.originalTransactionId,
    });

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW': {
        if (!transactionInfo) break;

        const nextBillingTime = transactionInfo.expiresDate
            ? new Date(transactionInfo.expiresDate)
            : null;

        const subscription = await Subscription.findOne({
          where: {id: transactionInfo.originalTransactionId}
        });

        if (subscription) {
          await subscription.update({status: 'active', next_billing_time: nextBillingTime});
          logger.info('Apple subscription renewed', {
            subscriptionId: transactionInfo.originalTransactionId,
            aidant_id: subscription.aidant_id,
            nextBillingTime,
          });

          if (notificationType === 'DID_RENEW') {
            const alreadyLogged = await PaymentHistory.findOne({
              where: {transaction_id: transactionInfo.transactionId}
            });

            if (!alreadyLogged) {
              const invoiceId = generateOrderId();
              const price = transactionInfo.price
                  ? (transactionInfo.price / 1000)
                  : getPriceForProduct(transactionInfo.productId);

              try {
                await PaymentHistory.create({
                  id: invoiceId,
                  aidant_id: subscription.aidant_id,
                  subscription_type: 'abonnement',
                  credits: null,
                  price: price,
                  payment_status: 'success',
                  transaction_id: transactionInfo.transactionId,
                  payment_method: 'apple',
                });

                const user = await User.findByPk(subscription.aidant_id);
                if (user) {
                  await generateAndSendInvoice(user, invoiceId, price, 'Renouvellement Abonnement');
                }

                logger.info('Renewal payment recorded', {
                  invoiceId,
                  transactionId: transactionInfo.transactionId,
                });
              } catch (createErr) {
                if (createErr.name === 'SequelizeUniqueConstraintError') {
                  logger.info('Renewal payment already recorded by client, skipping', {
                    transactionId: transactionInfo.transactionId,
                  });
                } else {
                  throw createErr;
                }
              }
            }
          }
        } else {
          logger.warn('Apple webhook: subscription not found in DB', {
            originalTransactionId: transactionInfo.originalTransactionId,
          });
        }
        break;
      }

      case 'EXPIRED': {
        if (!transactionInfo) break;
        await Subscription.update(
            {
              status: 'expired',
              next_billing_time: transactionInfo.expiresDate
                  ? new Date(transactionInfo.expiresDate)
                  : new Date(),
            },
            {where: {id: transactionInfo.originalTransactionId}}
        );
        logger.info('Apple subscription expired', {subscriptionId: transactionInfo.originalTransactionId});
        break;
      }

      case 'DID_FAIL_TO_RENEW': {
        if (!transactionInfo) break;
        await Subscription.update(
            {
              status: 'past_due',
              next_billing_time: transactionInfo.expiresDate
                  ? new Date(transactionInfo.expiresDate)
                  : new Date(),
            },
            {where: {id: transactionInfo.originalTransactionId}}
        );
        logger.info('Apple subscription billing failed', {
          subscriptionId: transactionInfo.originalTransactionId,
          subtype,
        });
        break;
      }

      case 'DID_CHANGE_RENEWAL_STATUS': {
        if (!transactionInfo) break;
        if (data.autoRenewStatus === false) {
          await Subscription.update(
              {status: 'cancelled'},
              {where: {id: transactionInfo.originalTransactionId}}
          );
          logger.info('Apple subscription auto-renew disabled', {
            subscriptionId: transactionInfo.originalTransactionId,
          });
        } else {
          await Subscription.update(
              {status: 'active'},
              {where: {id: transactionInfo.originalTransactionId}}
          );
          logger.info('Apple subscription auto-renew re-enabled', {
            subscriptionId: transactionInfo.originalTransactionId,
          });
        }
        break;
      }

      case 'REVOKED': {
        if (!transactionInfo) break;
        await Subscription.update(
            {status: 'revoked', next_billing_time: new Date()},
            {where: {id: transactionInfo.originalTransactionId}}
        );

        const payment = await PaymentHistory.findOne({
          where: {transaction_id: transactionInfo.transactionId}
        });

        if (payment) {
          await payment.update({payment_status: 'revoked'});
          if (payment.credits) {
            const user = await User.findByPk(payment.aidant_id);
            if (user) {
              user.credits = Math.max(0, (user.credits || 0) - payment.credits);
              await user.save();
              logger.info('Credits revoked from user', {
                userId: user.id,
                creditsRevoked: payment.credits,
                newBalance: user.credits,
              });
            }
          }
        }

        logger.info('Apple purchase revoked', {
          transactionId: transactionInfo.transactionId,
          originalTransactionId: transactionInfo.originalTransactionId,
        });
        break;
      }

      case 'REFUND': {
        if (!transactionInfo) break;
        const refundPayment = await PaymentHistory.findOne({
          where: {transaction_id: transactionInfo.transactionId},
        });

        if (refundPayment) {
          await refundPayment.update({payment_status: 'refunded'});
          if (refundPayment.credits) {
            const user = await User.findByPk(refundPayment.aidant_id);
            if (user) {
              user.credits = Math.max(0, (user.credits || 0) - refundPayment.credits);
              await user.save();
            }
          }
          if (refundPayment.subscription_type === 'abonnement') {
            await Subscription.update(
                {status: 'expired', next_billing_time: new Date()},
                {where: {id: transactionInfo.originalTransactionId}}
            );
          }
          logger.info('Apple purchase refunded', {transactionId: transactionInfo.transactionId});
        }
        break;
      }

      default:
        logger.info('Unhandled Apple notification', {notificationType, subtype});
    }

    return res.status(200).send('OK');
  } catch (error) {
    logger.error('Apple webhook error', {error: error.message, stack: error.stack});
    return res.status(500).json({error: error.message});
  }
};

// ═══════════════════════════════════════════════════════════
// CHECK SUBSCRIPTION STATUS
// ═══════════════════════════════════════════════════════════
const checkSubscriptionStatus = async (req, res) => {
  const {userId} = req.params;

  try {
    const subscription = await Subscription.findOne({
      where: {
        aidant_id: userId,
        status: {[Op.in]: ['active', 'cancelled', 'past_due', 'revoked']},
      },
      order: [['next_billing_time', 'DESC']],
    });

    if (!subscription) {
      return res.status(200).json({hasActiveSubscription: false});
    }

    const now = new Date();
    const paymentMethod = subscription.payment_method || 'paypal';

    if (paymentMethod === 'apple') {
      const appleStatus = await getAppleSubscriptionStatus(subscription.id);

      if (appleStatus) {
        if (appleStatus.isActive && appleStatus.expiresDate) {
          const dbExpiry = subscription.next_billing_time ? subscription.next_billing_time.getTime() : 0;
          const appleExpiry = appleStatus.expiresDate.getTime();
          if (dbExpiry !== appleExpiry) {
            await subscription.update({status: 'active', next_billing_time: appleStatus.expiresDate});
          }
          return res.status(200).json({
            hasActiveSubscription: true,
            expiresDate: appleStatus.expiresDate,
            nextBilling: appleStatus.expiresDate,
            paymentMethod: 'apple',
            status: 'active',
          });
        }

        if (appleStatus.status === 3) {
          await subscription.update({status: 'past_due'});
          return res.status(200).json({
            hasActiveSubscription: false,
            status: 'past_due',
            expiresDate: appleStatus.expiresDate,
            paymentMethod: 'apple',
          });
        }

        if (appleStatus.status === 5) {
          await subscription.update({status: 'revoked'});
          return res.status(200).json({
            hasActiveSubscription: false,
            status: 'revoked',
            paymentMethod: 'apple',
          });
        }

        await subscription.update({status: 'expired'});
        return res.status(200).json({
          hasActiveSubscription: false,
          expiredAt: subscription.next_billing_time,
          paymentMethod: 'apple',
          status: 'expired',
        });
      }

      logger.warn('Apple API unreachable, falling back to DB', {subscriptionId: subscription.id});
      if (subscription.next_billing_time && new Date(subscription.next_billing_time) < now) {
        await subscription.update({status: 'expired'});
        return res.status(200).json({hasActiveSubscription: false, paymentMethod: 'apple'});
      }

      return res.status(200).json({
        hasActiveSubscription: subscription.status === 'active',
        expiresDate: subscription.next_billing_time,
        paymentMethod: 'apple',
        status: subscription.status,
      });
    }

    if (paymentMethod === 'paypal' || !subscription.payment_method) {
      try {
        const paypalSub = await getPaypalSubscription(subscription.id);
        const paypalStatus = paypalSub.status.toLowerCase();
        const isActive = ['active', 'approved'].includes(paypalStatus);
        const isCancelledButValid = paypalStatus === 'cancelled' &&
            paypalSub.billing_info?.next_billing_time &&
            new Date(paypalSub.billing_info.next_billing_time) > now;

        if (paypalStatus !== subscription.status) {
          await subscription.update({
            status: paypalStatus === 'active' ? 'active' : paypalStatus,
            next_billing_time: paypalSub.billing_info?.next_billing_time || null,
          });
        }

        if (isActive || isCancelledButValid) {
          return res.status(200).json({
            hasActiveSubscription: true,
            expiresDate: paypalSub.billing_info?.next_billing_time || subscription.next_billing_time,
            nextBilling: paypalSub.billing_info?.next_billing_time || null,
            paymentMethod: 'paypal',
            paymentEmail: paypalSub.subscriber?.email_address || null,
            status: paypalStatus,
          });
        }

        await subscription.update({status: paypalStatus});
        return res.status(200).json({hasActiveSubscription: false, paymentMethod: 'paypal'});
      } catch (paypalError) {
        logger.warn('PayPal API check failed, using local DB', {
          error: paypalError.message,
          subscriptionId: subscription.id,
        });

        if (subscription.status === 'active') {
          return res.status(200).json({
            hasActiveSubscription: true,
            expiresDate: subscription.next_billing_time,
            paymentMethod: 'paypal',
            status: subscription.status,
          });
        }

        return res.status(200).json({hasActiveSubscription: false, paymentMethod: 'paypal'});
      }
    }

    if (subscription.next_billing_time && new Date(subscription.next_billing_time) < now) {
      await subscription.update({status: 'expired'});
      return res.status(200).json({hasActiveSubscription: false});
    }

    return res.status(200).json({
      hasActiveSubscription: subscription.status === 'active',
      expiresDate: subscription.next_billing_time,
      paymentMethod: paymentMethod,
      status: subscription.status,
    });
  } catch (error) {
    logger.error('Check subscription error', {error: error.message, userId});
    return res.status(500).json({error: error.message});
  }
};

// ═══════════════════════════════════════════════════════════
// GET LIVE SUBSCRIPTION
// ═══════════════════════════════════════════════════════════
const getLiveSubscription = async (req, res) => {
  const aidantId = req.body.aidantId;

  try {
    const localSub = await Subscription.findOne({
      where: {
        [Op.or]: [
          {aidant_id: aidantId, status: "active"},
          {aidant_id: aidantId, status: "past_due"},
          {aidant_id: aidantId, status: "expired"},
          {aidant_id: aidantId, status: "revoked"},
          {aidant_id: aidantId, status: "cancelled", next_billing_time: {[Op.gt]: new Date()}}
        ]
      },
      order: [['createdAt', 'DESC']],
      include: [{
        model: ProfileAidant,
        as: "aidant",
        attributes: ["email", "first_name", "last_name"],
      }]
    });

    if (!localSub) {
      return res.status(404).json({message: 'No subscription found.'});
    }

    const paymentMethod = localSub.payment_method || 'paypal';

    if (paymentMethod === 'apple') {
      const appleStatus = await getAppleSubscriptionStatus(localSub.id);

      if (appleStatus && appleStatus.isActive && appleStatus.expiresDate) {
        const dbExpiry = localSub.next_billing_time ? localSub.next_billing_time.getTime() : 0;
        const appleExpiry = appleStatus.expiresDate.getTime();
        if (dbExpiry !== appleExpiry) {
          await localSub.update({status: 'active', next_billing_time: appleStatus.expiresDate});
          logger.info('Synced Apple subscription from getLiveSubscription', {
            subscriptionId: localSub.id,
            oldExpiry: localSub.next_billing_time,
            newExpiry: appleStatus.expiresDate,
          });
        }
        return res.json({
          id: localSub.id,
          type: "Abonnement",
          status: 'active',
          price: getPriceForProduct('unlimited_monthly_subscription') + " €",
          startDate: localSub.start_time,
          nextBilling: appleStatus.expiresDate,
          expiresDate: appleStatus.expiresDate,
          paymentMethod: "Apple",
          paymentEmail: localSub.payer_email || localSub.aidant?.email || null,
        });
      }

      if (appleStatus && appleStatus.status === 3) {
        await localSub.update({status: 'past_due'});
        return res.json({
          id: localSub.id,
          type: "Abonnement",
          status: 'past_due',
          price: getPriceForProduct('unlimited_monthly_subscription') + " €",
          startDate: localSub.start_time,
          nextBilling: null,
          expiresDate: appleStatus.expiresDate,
          paymentMethod: "Apple",
          paymentEmail: localSub.payer_email || localSub.aidant?.email || null,
        });
      }

      if (appleStatus && appleStatus.status === 5) {
        await localSub.update({status: 'revoked'});
        return res.status(404).json({message: 'Subscription revoked.'});
      }

      if (appleStatus && !appleStatus.isActive) {
        await localSub.update({status: 'expired'});
        return res.status(404).json({message: 'Subscription expired.'});
      }

      if (localSub.status === 'past_due') {
        return res.json({
          id: localSub.id,
          type: "Abonnement",
          status: 'past_due',
          price: getPriceForProduct('unlimited_monthly_subscription') + " €",
          startDate: localSub.start_time,
          nextBilling: null,
          expiresDate: localSub.next_billing_time,
          paymentMethod: "Apple",
          paymentEmail: localSub.payer_email || localSub.aidant?.email || null,
        });
      }

      const isStillValid = localSub.next_billing_time && new Date(localSub.next_billing_time) > new Date();
      if (!isStillValid) {
        await localSub.update({status: 'expired'});
        return res.status(404).json({message: 'Subscription expired.'});
      }

      return res.json({
        id: localSub.id,
        type: "Abonnement",
        status: localSub.status,
        price: getPriceForProduct('unlimited_monthly_subscription') + " €",
        startDate: localSub.start_time,
        nextBilling: localSub.next_billing_time,
        expiresDate: localSub.next_billing_time,
        paymentMethod: "Apple",
        paymentEmail: localSub.payer_email || localSub.aidant?.email || null,
      });
    }

    const paypalSub = await getPaypalSubscription(localSub.id);
    return res.json({
      id: paypalSub.id,
      type: "Abonnement",
      status: paypalSub.status.toLowerCase(),
      price: paypalSub.billing_info.last_payment?.amount.value + " €" || "14,99 €",
      startDate: paypalSub.start_time,
      nextBilling: paypalSub.billing_info?.next_billing_time || localSub.next_billing_time,
      paymentMethod: "Paypal",
      paymentEmail: paypalSub.subscriber?.email_address || localSub.aidant?.email,
    });
  } catch (err) {
    logger.error('Error fetching subscription:', {error: err.message});
    res.status(500).json({message: 'Error retrieving subscription', error: err.message});
  }
};

// ═══════════════════════════════════════════════════════════
// RESTORE APPLE PURCHASES
// ═══════════════════════════════════════════════════════════
const restoreApplePurchases = async (req, res) => {
  const {purchaseTokens, userId} = req.body;

  if (!purchaseTokens || !Array.isArray(purchaseTokens) || !userId) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['purchaseTokens (array)', 'userId']
    });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    let restoredSubscription = null;

    for (const token of purchaseTokens) {
      let transaction;
      try {
        transaction = await verifyAppleJWT(token);
      } catch (err) {
        logger.warn('Skipping invalid restore token', {error: err.message});
        continue;
      }

      if (transaction.productId !== 'unlimited_monthly_subscription') {
        logger.info('Skipping non-subscription restore', {productId: transaction.productId});
        continue;
      }

      const appleStatus = await getAppleSubscriptionStatus(transaction.originalTransactionId);
      let nextBillingTime = transaction.expiresDate ? new Date(transaction.expiresDate) : null;

      if (appleStatus && appleStatus.expiresDate) {
        nextBillingTime = appleStatus.expiresDate;
      }

      const isActive = appleStatus
          ? appleStatus.isActive
          : (nextBillingTime && nextBillingTime > new Date());

      if (!isActive) {
        logger.info('Skipping expired subscription restore', {
          originalTransactionId: transaction.originalTransactionId,
          nextBillingTime,
        });
        continue;
      }

      const existingOwner = await Subscription.findOne({
        where: {
          id: transaction.originalTransactionId,
          aidant_id: {[Op.ne]: userId},
          status: {[Op.in]: ['active', 'cancelled']},
        }
      });

      if (existingOwner) {
        const ownerStillValid = existingOwner.next_billing_time &&
            new Date(existingOwner.next_billing_time) > new Date();

        if (ownerStillValid) {
          logger.warn('Restore blocked: subscription owned by another user', {
            originalTransactionId: transaction.originalTransactionId,
            requestingUser: userId,
            ownerUser: existingOwner.aidant_id,
          });
          return res.status(403).json({
            success: false,
            error: 'SUBSCRIPTION_LINKED_TO_OTHER_ACCOUNT',
            message: 'This subscription is linked to another account.',
          });
        }
      }

      const existingSub = await Subscription.findOne({
        where: {id: transaction.originalTransactionId}
      });

      if (existingSub) {
        await existingSub.update({
          aidant_id: userId,
          status: 'active',
          next_billing_time: nextBillingTime,
          payment_method: 'apple',
          payer_email: user.email || null,
        });
      } else {
        await Subscription.create({
          id: transaction.originalTransactionId,
          aidant_id: userId,
          plan_id: 'unlimited_monthly_subscription',
          status: 'active',
          start_time: new Date(transaction.purchaseDate),
          next_billing_time: nextBillingTime,
          payment_method: 'apple',
          payer_email: user.email || null,
        });
      }

      restoredSubscription = {
        originalTransactionId: transaction.originalTransactionId,
        expiresDate: nextBillingTime,
        productId: transaction.productId,
      };

      logger.info('Subscription restored', {
        userId,
        originalTransactionId: transaction.originalTransactionId,
        nextBillingTime,
      });

      break;
    }

    if (restoredSubscription) {
      return res.status(200).json({success: true, restored: true, subscription: restoredSubscription});
    }

    return res.status(200).json({
      success: true,
      restored: false,
      message: 'No active subscriptions found to restore.',
    });
  } catch (error) {
    logger.error('Apple restore error', {error: error.message, stack: error.stack, userId});
    return res.status(500).json({error: 'Restore failed', details: error.message});
  }
};

// ═══════════════════════════════════════════════════════════
// STATS & HISTORY
// ═══════════════════════════════════════════════════════════
const getCreditSummary = async (req, res) => {
  try {
    const userId = req.body.userId;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({message: "User not found"});

    const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}});
    if (!profileAidant) return res.status(404).json({message: "ProfileAidant not found"});

    const aidantId = profileAidant.id;

    const totalPurchasedResult = await PaymentHistory.sum('credits', {
      where: {aidant_id: aidantId, payment_status: 'success', subscription_type: 'forfait'}
    });

    const totalUsedResult = await CreditsHistory.sum('credits', {
      where: {sender_id: aidantId, active: true}
    });

    const lastPurchase = await PaymentHistory.findOne({
      where: {aidant_id: aidantId, payment_status: 'success', subscription_type: 'forfait'},
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      balance: user.credits || 0,
      totalPurchased: totalPurchasedResult || 0,
      totalUsed: totalUsedResult || 0,
      lastPurchase: lastPurchase ? lastPurchase.updatedAt.toLocaleDateString("fr-FR") : null
    });
  } catch (err) {
    logger.error('Error fetching credit summary:', {error: err.message});
    res.status(500).json({message: 'Internal server error', error: err.message});
  }
};

const getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.body.userId;
    const profileAidant = await ProfileAidant.findOne({where: {user_id: userId}});
    if (!profileAidant) return res.status(404).json({message: "ProfileAidant not found"});

    const history = await PaymentHistory.findAll({
      where: {aidant_id: profileAidant.id, subscription_type: 'forfait'},
      order: [['updatedAt', 'DESC']],
    });

    res.json(history.map((entry) => ({
      id: entry.id,
      date: entry.updatedAt.toLocaleDateString("fr-FR"),
      credits: entry.credits || 0,
      amount: entry.price,
      status: entry.payment_status,
    })));
  } catch (err) {
    logger.error('Error fetching purchase history:', {error: err.message});
    res.status(500).json({message: 'Internal server error', error: err.message});
  }
};

const getCreditUsageHistory = async (req, res) => {
  try {
    const userId = req.body.userId;
    const history = await CreditsHistory.findAll({
      where: {sender_id: userId},
      include: [
        {model: ProfileAidant, as: "sender", attributes: ["id", "first_name", "last_name"]},
        {model: ProfileAidant, as: "destination", attributes: ["id", "first_name", "last_name"]}
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(history.map((entry) => ({
      id: entry.id,
      sender_id: `${entry.sender.id}`,
      sender: `${entry.sender.first_name}`,
      destination: `${entry.destination.first_name}`,
      destination_id: `${entry.destination.id}`,
      credits: entry.credits,
      date: entry.createdAt.toLocaleDateString("fr-FR"),
      active: entry.active,
    })));
  } catch (err) {
    logger.error('Error fetching credit usage history:', {error: err.message});
    res.status(500).json({message: 'Internal server error', error: err.message});
  }
};

const cancelLiveSubscription = async (req, res) => {
  const {subscriptionId, aidant_id} = req.body;
  await Subscription.update({status: "cancelled"}, {where: {id: subscriptionId, aidant_id}});

  try {
    const token = await getAccessToken();
    const paypalApiUrl = process.env.PAYPAL_MODE === 'live'
        ? `https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`
        : `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`;

    const cancelRes = await fetch(paypalApiUrl, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({reason: "User requested cancellation"})
    });

    if (!cancelRes.ok) {
      const error = await cancelRes.json();
      return res.status(400).json({message: "PayPal cancellation failed", error});
    }

    res.status(200).json({message: 'Subscription cancelled successfully'});
  } catch (err) {
    logger.error("Error cancelling subscription:", {error: err.message});
    res.status(500).json({message: "Internal server error", error: err.message});
  }
};

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════
module.exports = {
  processPayment,
  mipsWebhook,
  decryptMipsCallback,
  paypalWebhook,
  processPaymentPaypal,
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
  checkSubscriptionStatus,
  restoreApplePurchases,
};
