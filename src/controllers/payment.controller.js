require('dotenv').config();
const fs = require('fs');


const axios = require('axios');
const crypto = require("crypto");
const logger = require('../utils/logger');
const path = require('path');
const { Op } = require('sequelize');
const { PaymentHistory, User, Subscription, ProfileAidant, CreditsHistory } = require("../models");

const  {sendInvoiceEmail} = require('../utils/mail')
const  {generateInvoice} = require('../utils/invoice')

const getAuthHeader = () => {
    const authString = `${process.env.MIPS_USERNAME}:${process.env.MIPS_PASSWORD}`;
    return 'Basic ' + Buffer.from(authString).toString('base64');
};

const generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-5); // last 6 digits of timestamp
    const random = crypto.randomInt(10, 99); // 2-digit random
    return `INV${timestamp}${random}`; // e.g. INV456789123
};

const getAccessToken = async () => {
  const base64 = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
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

// new pricing method to be able to change directly in .env
const getPricingConfig = () => {
  try {
    // Try to read from JSON file
    const configPath = path.join(__dirname, '../config/pricing.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const pricingConfig = JSON.parse(configData);
    
    console.log(' Pricing loaded from JSON file:', pricingConfig);
    return pricingConfig;
    
  } catch (error) {
    console.error(' Error reading pricing.json:', error.message);
    throw error;
  }
};

//new function to get price
const getPricingOptions = async (req,res) => {
  
  try {
    const pricingOptions = getPricingConfig();
    res.json({
      success: true,
      data: pricingOptions
    });
  }catch(error){
    logger.error('Error fetching pricing options:', { error: error.message });
    res.status(500).json({
      success:false,
      message:error.message,
      error:error.message
    });
  }
};


// TeST
// const processPayment = async (req, res) => {
//     try {
//         const paymentPayload = {
//             authentify: {
//                 id_merchant: process.env.MIPS_MERCHANT_ID,
//                 id_entity: process.env.MIPS_ENTITY_ID,
//                 id_operator: process.env.MIPS_OPERATOR_ID,
//                 operator_password: process.env.MIPS_OPERATOR_PASSWORD
//             },
//             order: {
//                 id_order: "INV5026",
//                 currency: "MUR",
//                 amount: 10.25
//             },
//             iframe_behavior: {
//                 height: 400,
//                 width: 350,
//                 custom_redirection_url: "www.example.com",
//                 language: "EN"
//             },
//             request_mode: "simple",
//             touchpoint: "web"
//         };

//         const response = await axios.post(process.env.MIPS_API_URL, paymentPayload, {
//             headers: {
//                 "Authorization": getAuthHeader(),
//                 "Accept": "application/json, text/html, application/xml, multipart/form-data, application/EDIFACT, text/plain",
//                 "Content-Type": "application/json",
//                 "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36"
//             }
//         });

//         res.json(response.data);
//     } catch (error) {
//         console.error("MiPS API Error:", error.response?.data || error.message);
//         res.status(error.response?.status || 500).json({
//             error: "Payment request failed",
//             details: error.response?.data || error.message
//         });
//     }
// };

const processPayment = async (req, res) => {
    const { aidant_id, amount, subscription_type, credits, iframe_behavior } = req.body;
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
            order: {
                id_order,
                currency,
                amount,
            },
            iframe_behavior: iframe_behavior,
            request_mode: "simple",
            touchpoint: "web"
        };

        const response = await axios.post(process.env.MIPS_API_URL, paymentPayload, {
            headers: {
                "Authorization": getAuthHeader(),
                "Accept": "application/json, text/html, application/xml, multipart/form-data, application/EDIFACT, text/plain",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36"
            }
        });

        const existing = await PaymentHistory.findByPk(id_order);
        if (existing) {
            return res.status(409).json({ error: "Payment already initiated." });
        }   

        const profileAidant= await ProfileAidant.findOne({where: {user_id:aidant_id}});
        if (!profileAidant) {
          return res.status(404).json({ message: "ProfileAidant not found." });
        }
  
        await PaymentHistory.create({
            id: id_order,
            aidant_id: profileAidant.id,
            subscription_type,
            credits: subscription_type === "forfait" ? credits : null,
            price: amount,
            payment_status: "pending", // Initially pending
        });
        logger.info('Mips process data', { data: response.data });

        res.json(response.data);
    } catch (error) {
        console.error("MiPS API Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: "Payment request failed",
            details: error.response?.data || error.message
        });
    }
};

//This is the fn to decrypt the crypted data from IMN
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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 Safari/537.36"
        }
    });

    return response.data
};

// This is your IMN URL that MIPS will call
const mipsWebhook = async (req, res) => {
    const data = req.body;  
    try {
        const decrypted = await decryptMipsCallback(data.crypted_callback);
        logger.info('Decrypted MIPS payload', { decrypted  });
    
        const { id_order, status, transaction_id } = decrypted;
        const payment_status = status === 'SUCCESS' ? 'success' : 'failed';

        const paymentRecord = await PaymentHistory.findByPk(id_order);
        
        if (!paymentRecord) {
            logger.warn('Payment record not found', { id_order });
            return res.status(404).json({ message: 'Payment record not found' });
        }

        // 🛑 Already processed and marked as success — skip to avoid double-crediting
        if (paymentRecord.payment_status === 'success') {
            logger.info('Payment already marked as success, skipping credit update', { id_order });
            return res.status(200).json({ message: 'Payment already processed' });
        }

        await paymentRecord.update({ payment_status, transaction_id });

        logger.info('PaymentHistory updated successfully', { id_order, status });

        if (status === 'SUCCESS' && paymentRecord.subscription_type === 'forfait') {
            const user = await User.findByPk(paymentRecord.aidant_id);
            if (user) {
              user.credits = (user.credits || 0) + (paymentRecord.credits || 0);
              await user.save();
            
              logger.info('Credits added to User', { user: user.id, new_credits: user.credits });
              const invoicePath = path.join(__dirname, '../../assets/invoice', `${paymentRecord.id}.pdf`);


              await generateInvoice({
                id: paymentRecord.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                price: paymentRecord.price,
                subscription_type: "Crédits",
                payment_date: paymentRecord.updatedAt,
                payment_method: "Carte bancaire"
              }, invoicePath);
              logger.info('Invoice generated', paymentRecord);

              await sendInvoiceEmail(user, invoicePath);

            } else {
              logger.warn('User not found for credit update', { user: paymentRecord.aidant_id });
            }
        }
        res.status(200).json({ message: 'MIPS webhook processed' });

    } catch (err) {
        logger.error('Error decrypting MIPS callback', { error: err.message });
        res.status(500).json({ message: 'MIPS webhook error', error: err.message });
    }
};
  

//PAYPAL
const processPaymentPaypal = async (req, res) => {
    const { aidant_id, subscriptionId, plan_id } = req.body;
    try {
      // ✅ Check if user already has a pending or active subscription
      const existingSub = await Subscription.findOne({
        where: {
          aidant_id,
          status: { [Op.in]: ['active', 'pending'] }, // you can also include 'suspended' if needed
        }
      });

      if (existingSub) {
        return res.status(400).json({
          error: 'Vous avez déjà un abonnement actif ou en attente.',
        });
      }

      // await PaymentHistory.create({
      //   id: id_order,
      //   aidant_id: aidant_id,
      //   subscription_type,
      //   credits,
      //   price: amount,
      //   payment_status: "pending", // Initially pending
      //   transaction_id: subscriptionId,
      // });
  
      await Subscription.create({
        id: subscriptionId,
        aidant_id,
        plan_id: plan_id,
        status: "pending", // will update to "active" via webhook
        start_time: new Date()
      });

      return res.status(200).json({ message: "Saved payment history" });
    } catch (err) {
      logger.error('Payment request failed', { error: err.message });
      res.status(500).json({ message: 'Payment request failed', error: err.message });
    }
};

const confirmSubscription = async (req, res) => {
    const { subscriptionId, aidant_id } = req.body;
  
    try {
      // Optionally update subscription or payment status if needed
      await Subscription.update(
        { status: "active" },
        { where: { id: subscriptionId, aidant_id } }
      );
  
      await PaymentHistory.update(
        { payment_status: "success" },
        { where: { transaction_id: subscriptionId, payment_status: "pending"} }
      );
  
      return res.status(200).json({ message: "Subscription confirmed" });
    } catch (err) {
      logger.error('Error confirming subscription', { error: err.message });
      res.status(500).json({ message: 'Error confirming subscription', error: err.message });
    }
};

const paypalWebhook = async(req, res) => {
    const event = req.body;
    const eventType = event.event_type;
    const resource = event.resource;

    try {
        logger.info("PayPal Webhook Event:", eventType);
    
        switch (eventType) {
          case "BILLING.SUBSCRIPTION.ACTIVATED": {
            const subscriptionId = resource.id;
    
            // Update subscription status
            await Subscription.update(
                {
                  status: "active",
                  start_date: resource.start_time,
                  next_billing_time: resource.billing_info?.next_billing_time || null,
                  payer_email: resource.subscriber?.email_address || null,
                },
                {
                  where: { id: subscriptionId }
                }
            );
    
            // Update payment history to success
            await PaymentHistory.update(
              { payment_status: "success" },
              { where: { transaction_id: subscriptionId } }
            );
    
            break;
          }
    
          case "PAYMENT.SALE.COMPLETED": {
            const subscriptionId = resource.billing_agreement_id;
            const amount = parseFloat(resource.amount.total);
            const transactionId = resource.id; // Unique for every recurring payment
          
            // Step 1: Find the aidant_id from Subscription table
            const subscription = await Subscription.findOne({
              where: { id: subscriptionId }
            });
          
            if (!subscription) {
                logger.warn(`Subscription not found for ID ${subscriptionId}`);
                break;
            }
          
            const aidantId = subscription.aidant_id;
          
            // Step 2: Try to find an existing pending PaymentHistory for this subscriptionId
            const existingPayment = await PaymentHistory.findOne({
              where: {
                transaction_id: transactionId,
                aidant_id: aidantId,
              }
            });

            if (existingPayment) {
              // Update the existing entry
              await existingPayment.update({
                payment_status: "success",
                price: amount // Optional: update price if needed
              });
              logger.info(`Updated existing PaymentHistory for subscription ${subscriptionId}`);
            } else {
              // Otherwise, create a new entry (for recurring payment)
              await PaymentHistory.create({
                id: generateOrderId(),
                aidant_id: aidantId,
                subscription_type: "abonnement",
                credits: null,
                price: amount,
                payment_status: "success",
                transaction_id: subscriptionId, // ← use transaction ID here for unique entry
              });
              logger.info(`Created new PaymentHistory for recurring payment of subscription ${subscriptionId}`);
            }
          
            const user = await User.findByPk(aidantId);
            if (user) {
              const invoicePath = path.join(__dirname, '../../assets/invoice', `${subscriptionId}.pdf`);

              await generateInvoice({
                id: subscriptionId,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                price: amount,
                subscription_type: "Abonnement",
                payment_date: new Date(),
                payment_method: "Paypal"
              }, invoicePath);
              logger.info('Invoice generated', subscriptionId);
              
              await sendInvoiceEmail(user, invoicePath);

            } else {
              logger.warn('User not found for credit update', { user: aidantId });
            }

            logger.info(`Logged recurring payment for subscription ${subscription}`);
            break;
          }
    
          case "BILLING.SUBSCRIPTION.CANCELLED":
          case "BILLING.SUBSCRIPTION.SUSPENDED":
          case "BILLING.SUBSCRIPTION.EXPIRED": {
            const subscriptionId = resource.id;
            const newStatus = eventType.split(".")[2].toLowerCase(); // "cancelled", etc.
    
            await Subscription.update(
              { status: newStatus },
              { where: { id: subscriptionId } }
            );
    
            break;
          }
    
          default:
            logger.info("Unhandled event:", eventType);
        }
    
        return res.status(200).send("OK");
      } catch (err) {
        logger.error('Webhook error:', { error: err.message });
        res.status(500).json({ message: 'Webhook error:', error: err.message });
      }
}
  

//STATS
const getCreditSummary = async (req, res) => {
  try {
    const userId = req.body.userId;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileAidant = await ProfileAidant.findOne({ where: { user_id: userId } });
    if (!profileAidant) {
      return res.status(404).json({ message: "ProfileAidant not found" });
    }

    const aidantId = profileAidant.id;

    const totalPurchasedResult = await PaymentHistory.sum('credits', {
      where: {
        aidant_id: aidantId,
        payment_status: 'success',
        subscription_type: 'forfait'
      }
    });

    const totalUsedResult = await CreditsHistory.sum('credits', {
      where: {
        sender_id: aidantId,
        active: true
      }
    });

    const lastPurchase = await PaymentHistory.findOne({
      where: {
        aidant_id: aidantId,
        payment_status: 'success',
        subscription_type: 'forfait'
      },
      order: [['updatedAt', 'DESC']]
    });

    const creditData = {
      balance: user.credits || 0,
      totalPurchased: totalPurchasedResult || 0,
      totalUsed: totalUsedResult || 0,
      lastPurchase: lastPurchase ? lastPurchase.updatedAt.toLocaleDateString("fr-FR") : null
    };

    res.json(creditData);
  } catch (err) {
    logger.error('Error fetching credit summary:', { error: err.message });
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

const getPurchaseHistory = async (req, res) => {
  try {
    const userId = req.body.userId;
    const profileAidant = await ProfileAidant.findOne({ where: { user_id: userId } });

    if (!profileAidant) {
      return res.status(404).json({ message: "ProfileAidant not found" });
    }

    const history = await PaymentHistory.findAll({
      where: {
        aidant_id: profileAidant.id,
        subscription_type: 'forfait',
      },
      order: [['updatedAt', 'DESC']],
    });

    const purchaseHistory = history.map((entry) => ({
      id: entry.id, 
      date: entry.updatedAt.toLocaleDateString("fr-FR"),
      credits: entry.credits || 0,
      amount: entry.price,
      status: entry.payment_status,
    }));

    res.json(purchaseHistory);
  } catch (err) {

    logger.error('Error fetching purchase history:', { error: err.message });
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

const getCreditUsageHistory = async (req, res) => {
  try {
    const userId = req.body.userId;
    const history = await CreditsHistory.findAll({
      where: { sender_id: userId },
      include: [
        {
          model: ProfileAidant,
          as: "sender",
          attributes: ["id", "first_name", "last_name"],
        },
        {
          model: ProfileAidant,
          as: "destination",
          attributes: ["id", "first_name", "last_name"],
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    const formatted = history.map((entry) => ({
      id: entry.id,
      sender_id: `${entry.sender.id}`,
      sender: `${entry.sender.first_name}`,
      destination: `${entry.destination.first_name}`,
      destination_id: `${entry.destination.id}`,
      credits: entry.credits,
      date: entry.createdAt.toLocaleDateString("fr-FR"),
      active: entry.active,
    }));

    res.json(formatted);
  } catch (err) {

    logger.error('Error fetching credit usage history:', { error: err.message });
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

const getPaypalSubscription = async (subscriptionId) => {
  const token = await getAccessToken();

  const res = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch subscription from PayPal');
  }

  return await res.json();
};

const getLiveSubscription = async (req, res) => {
  const aidantId  = req.body.aidantId;

  try {
    const localSub = await Subscription.findOne({
      where: {
        [Op.or]: [
          { aidant_id: aidantId, status: "active" },
          { aidant_id: aidantId,
            status: "cancelled",
            next_billing_time: { [Op.gt]: new Date() }
          }
        ]
      },
      order: [['createdAt', 'DESC']],
      include: [{
        model: ProfileAidant,
        as: "aidant",
        attributes: ["email", "first_name", "last_name"],
      },]
    });
    
    
    if (!localSub) {
      return res.status(404).json({ message: 'No subscription found in local DB.' });
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
      paymentEmail: paypalSub.subscriber?.email_address || localSub.User?.email
    });
  } catch (err) {
    logger.error('Error fetching PayPal Subscription :', { error: err.message });
    res.status(500).json({ message: 'Error in retrieving paypal subscription', error: err.message });
  }
};

const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.body.userId;
    
    // Find the profile associated with the user
    const profileAidant = await ProfileAidant.findOne({ where: { user_id: userId } });

    if (!profileAidant) {
      return res.status(404).json({ message: "ProfileAidant not found" });
    }

    // Find subscription payments
    const history = await PaymentHistory.findAll({
      where: {
        aidant_id: profileAidant.id,
        subscription_type: 'abonnement', // Only subscriptions, not credit purchases
      },
      order: [['updatedAt', 'DESC']],
    });

    // Map and return relevant data
    const subscriptionHistory = history.map((entry) => ({
      id: entry.transaction_id,
      date: entry.updatedAt.toLocaleDateString("fr-FR"),
      amount: entry.price,
      status: entry.payment_status,
    }));

    res.json(subscriptionHistory);
  } catch (err) {
    logger.error('Error fetching subscription history:', { error: err.message });
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

const cancelLiveSubscription = async (req, res) => {
  const { subscriptionId, aidant_id } = req.body;

  try {
    const token = await getAccessToken();

    // Step 2: Cancel the subscription on PayPal
    const cancelRes = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: "User requested cancellation"
      })
    });

    if (!cancelRes.ok) {
      const error = await cancelRes.json();
      return res.status(400).json({ message: "PayPal cancellation failed", error });
    }

    // Step 3: Update your database
    await Subscription.update(
      { status: 'cancelled' },
      { where: { id: subscriptionId, aidant_id } }
    );

    res.status(200).json({ message: 'Subscription cancelled successfully' });

  } catch (err) {
    logger.error("Error cancelling subscription:", { error: err.message });
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


module.exports = { processPayment, mipsWebhook, decryptMipsCallback, paypalWebhook, processPaymentPaypal, confirmSubscription, getCreditSummary, getPurchaseHistory, getCreditUsageHistory,getLiveSubscription,getSubscriptionHistory,cancelLiveSubscription,getPricingOptions };