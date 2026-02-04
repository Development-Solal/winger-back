// backend/src/services/pushNotificationService.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using environment variables
if (!admin.apps.length) {
    console.log('🔥 Initializing Firebase Admin SDK...');

    // Debug: Check which environment variables are set
    console.log('Environment check:', {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        projectId: process.env.FIREBASE_PROJECT_ID
    });

    // Option 1: If you store the entire JSON as a single environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            console.log('📋 Using FIREBASE_SERVICE_ACCOUNT environment variable');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

            // Extract project ID explicitly
            const projectId = serviceAccount.project_id || 'winger-13';

            console.log('Service account details:', {
                hasPrivateKey: !!serviceAccount.private_key,
                hasClientEmail: !!serviceAccount.client_email,
                projectId: projectId
            });

            // Initialize with explicit project ID in BOTH places
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    privateKey: serviceAccount.private_key,
                    clientEmail: serviceAccount.client_email,
                }),
                projectId: projectId
            });
            console.log('✅ Firebase initialized successfully with project:', projectId);
        } catch (error) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
            throw error;
        }
    }
    // Option 2: If you store individual fields as separate environment variables
    else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        try {
            console.log('🔑 Using individual Firebase environment variables');

            const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

            console.log('Credentials check:', {
                privateKeyLength: privateKey.length,
                projectId: projectId,
                clientEmail: clientEmail
            });

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    privateKey: privateKey,
                    clientEmail: clientEmail,
                }),
                projectId: projectId
            });
            console.log('✅ Firebase initialized with individual credentials');
        } catch (error) {
            console.error('❌ Failed to initialize with individual credentials:', error.message);
            throw error;
        }
    }
    // Fallback for local development
    else {
        try {
            console.log('📁 Attempting to use local firebase-service-account.json file');
            const serviceAccount = require('../../firebase-service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'winger-13'
            });
            console.log('⚠️  Using local firebase-service-account.json file');
        } catch (error) {
            console.error('❌ Firebase initialization failed. No credentials found.');
            console.error('Please set one of the following:');
            console.error('1. FIREBASE_SERVICE_ACCOUNT (entire JSON as string)');
            console.error('2. FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID');
            throw new Error('Firebase credentials not configured: ' + error.message);
        }
    }
}

// Send notification via Expo's push service
const sendExpoNotification = async (expoPushToken, title, body, data = {}) => {
    try {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title: title,
            body: body.length > 100 ? body.substring(0, 100) + '...' : body,
            data: {
                type: data.type || 'message',
                chatId: data.chatId?.toString() || '',
                senderId: data.senderId?.toString() || '',
                conversationId: data.conversationId?.toString() || ''
            },
            priority: 'high',
            badge: 1,
        };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ Error sending Expo push notification:', error);
        throw error;
    }
};

// Send notification via Firebase Admin SDK (for native FCM tokens)
const sendFirebaseNotification = async (fcmToken, title, body, data = {}) => {
    try {
        if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length < 100) {
            throw new Error(`Invalid FCM token format: ${fcmToken?.substring(0, 20)}`);
        }

        console.log(`📤 Sending Firebase notification to: ${fcmToken.substring(0, 30)}...`);

        const message = {
            token: fcmToken,
            notification: {
                title: title,
                body: body.length > 100 ? body.substring(0, 100) + '...' : body,
            },
            data: {
                type: data.type || 'message',
                chatId: data.chatId?.toString() || '',
                senderId: data.senderId?.toString() || '',
                conversationId: data.conversationId?.toString() || ''
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                    priority: 'max'
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        'content-available': 1,
                        'mutable-content': 1
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Firebase push notification sent:', response);

        return response;

    } catch (error) {
        console.error('❌ Error sending Firebase push notification:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            console.error('🔴 Token is invalid or expired. Should be removed from database.');
        } else if (error.code === 'messaging/invalid-argument') {
            console.error('🔴 Invalid message payload:', JSON.stringify(error.message, null, 2));
        } else if (error.code === 'messaging/server-unavailable') {
            console.error('🔴 Firebase service temporarily unavailable');
        }

        throw error;
    }
};

// Main function - automatically detects token type
const sendPushNotification = async (token, title, body, data = {}) => {
    if (!token) {
        console.log('No push token provided');
        return null;
    }

    console.log(`📲 Sending push notification to token: ${token.substring(0, 20)}...`);

    if (token.startsWith('ExponentPushToken')) {
        console.log('📱 Using Expo push service');
        return await sendExpoNotification(token, title, body, data);
    } else {
        console.log('🔥 Using Firebase Admin SDK');
        return await sendFirebaseNotification(token, title, body, data);
    }
};

const sendBulkPushNotifications = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) {
        console.log('No push tokens provided for bulk send');
        return null;
    }

    const expoTokens = tokens.filter(token => token.startsWith('ExponentPushToken'));
    const fcmTokens = tokens.filter(token => !token.startsWith('ExponentPushToken'));

    const results = [];

    if (expoTokens.length > 0) {
        console.log(`📱 Sending ${expoTokens.length} Expo notifications`);
        for (const token of expoTokens) {
            try {
                const result = await sendExpoNotification(token, title, body, data);
                results.push(result);
            } catch (error) {
                console.error(`Failed to send to Expo token: ${token}`, error);
            }
        }
    }

    if (fcmTokens.length > 0) {
        console.log(`🔥 Sending ${fcmTokens.length} Firebase notifications`);
        try {
            const message = {
                tokens: fcmTokens,
                notification: {title, body},
                data: {
                    type: data.type || 'message',
                    chatId: data.chatId?.toString() || '',
                    senderId: data.senderId?.toString() || ''
                }
            };
            const result = await admin.messaging().sendMulticast(message);
            results.push(result);
        } catch (error) {
            console.error('Failed to send Firebase bulk notifications:', error);
        }
    }

    return results;
};

module.exports = {
    sendPushNotification,
    sendBulkPushNotifications
};