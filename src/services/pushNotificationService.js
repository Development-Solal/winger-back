// backend/src/services/pushNotificationService.js
const admin = require('firebase-admin');
const {NotificationLog} = require("../models");

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
    if (admin.apps.length > 0) {
        console.log('✅ Firebase already initialized');
        return;
    }

    console.log('🔥 Initializing Firebase Admin SDK...');
    
    const projectId = process.env.FIREBASE_PROJECT_ID || 'winger-13';
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    console.log('Environment variables check:', {
        hasProjectId: !!projectId,
        projectId: projectId,
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey?.length || 0,
        hasClientEmail: !!clientEmail,
        clientEmail: clientEmail
    });

    if (!privateKey || !clientEmail) {
        console.error('❌ Missing required Firebase credentials');
        console.error('Required: FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL');
        throw new Error('Firebase credentials not configured');
    }

    try {
        // Format the private key correctly
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                privateKey: formattedPrivateKey,
                clientEmail: clientEmail,
            }),
            projectId: projectId
        });
        
        console.log('✅ Firebase Admin SDK initialized successfully');
        console.log('✅ Using project:', projectId);
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        throw error;
    }
};

// Initialize immediately when module is loaded
initializeFirebase();

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

        return await response.json();
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

        try {
            await NotificationLog.create({
                recipient_id: data.senderId,
                sender_id: data.senderId,
                status: 'failed',
                token: fcmToken,
                message_title: title,
                message_text: body,
                notification_type: 'firebase',
                error_message: `${error?.code}: ${error?.message}`
            });
        } catch (logError) {
            console.error('Failed to log notification error:', logError);
        }

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
