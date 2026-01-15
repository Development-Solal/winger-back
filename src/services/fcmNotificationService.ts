// import * as admin from 'firebase-admin';
//
// const sendFCMNotification = async (
//     fcmToken: string,
//     title: string,
//     body: string,
//     data: Record<string, string> = {}
// ) => {
//     try {
//         console.log('Sending FCM notification to token:', fcmToken.substring(0, 20) + '...');
//
//         const message = {
//             notification: {
//                 title,
//                 body,
//             },
//             data: {
//                 ...data,
//                 type: data.type || 'message',
//             },
//             android: {
//                 priority: 'high',
//                 notification: {
//                     sound: 'default',
//                     channelId: 'default',
//                 },
//             },
//             apns: {
//                 payload: {
//                     aps: {
//                         sound: 'default',
//                         badge: 1,
//                     },
//                 },
//             },
//         };
//
//         const response = await admin.messaging().send({
//             token: fcmToken,
//             ...message,
//         });
//
//         console.log('FCM notification sent successfully:', response);
//         return { success: true, messageId: response };
//     } catch (error) {
//         console.error('Error sending FCM notification:', error);
//         throw error;
//     }
// };
//
// export { sendFCMNotification };