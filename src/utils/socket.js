const {Server} = require("socket.io");
const {MessageStatus, Message, User} = require("../models");
const {sendPushNotification} = require("../services/pushNotificationService");
const {Op} = require("sequelize");

const setupSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) {
                    return callback(null, true);
                }

                const allowedOrigins = [
                    'https://winger-front.devsolalco.workers.dev',
                    'https://winger.fr',
                    process.env.FRONTEND_URL,
                    process.env.FRONTEND_EXPO_URL,
                ].filter(Boolean);

                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                console.warn(`⚠️ CORS blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            },
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization"],
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Track online users - using array for multiple devices
    const onlineUsers = new Map();

    // Optional: Add authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            // Add your token verification here if needed
            // For now, just pass through
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        socket.on("joinConversation", (conversationId) => {
            socket.join(conversationId);
            console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
        });

        socket.on("joinUserRoom", async (userId) => {
            socket.join(`user_${userId}`);
            socket.userId = userId;

            // Track user as online (support multiple devices)
            if (!onlineUsers.has(userId.toString())) {
                onlineUsers.set(userId.toString(), new Set());
            }
            onlineUsers.get(userId.toString()).add(socket.id);

            console.log(`User ${userId} is now online with ${onlineUsers.get(userId.toString()).size} connection(s)`);

            try {
                const unreadMessages = await MessageStatus.findAll({
                    where: {user_id: userId, status: "sent"},
                    include: [{model: Message}],
                });

                if (unreadMessages.length > 0) {
                    io.to(`user_${userId}`).emit("unreadMessages", unreadMessages);
                }
            } catch (error) {
                console.error(`Error fetching unread messages for user ${userId}:`, error);
            }
        });

        socket.on("sendMessage", async (message) => {
            try {
                io.to(message.conversation_id).emit("newMessage", message);
                io.to(`user_${message.destination_id}`).emit("newMessageReceived", message);

                const recipientId = message.destination_id.toString();
                const isRecipientOnline = onlineUsers.has(recipientId) && onlineUsers.get(recipientId).size > 0;

                console.log(`Recipient ${recipientId} online status:`, isRecipientOnline);

                // Only send push notification if recipient is offline
                if (!isRecipientOnline) {
                    try {
                        const [recipient, sender] = await Promise.all([
                            User.findByPk(recipientId),
                            User.findByPk(message.sender_id)
                        ]);

                        if (recipient?.expo_push_token && sender) {
                            const senderName = sender.first_name || 'Someone';

                            await sendPushNotification(
                                recipient.expo_push_token,
                                `Nouveau message de ${senderName}`,
                                message.message_text,
                                {
                                    type: 'message',
                                    chatId: message.conversation_id.toString(),
                                    senderId: message.sender_id.toString(),
                                    conversationId: message.conversation_id.toString(),
                                }
                            );

                            console.log(`✅ Push notification sent to offline user ${recipientId}`);
                        } else if (!recipient?.expo_push_token) {
                            console.log(`⚠️ User ${recipientId} has no push token`);
                        }
                    } catch (pushError) {
                        console.error('❌ Error sending push notification:', pushError);
                    }
                } else {
                    console.log(`📱 User ${recipientId} is online, skipping push notification`);
                }

            } catch (error) {
                console.error("Error sending message:", error);
            }
        });

        socket.on("markAsRead", async ({conversationId, aidantId}) => {
            try {
                console.log(`Marking messages as read for conversation ${conversationId}, user ${aidantId}`);
                const messages = await Message.findAll({
                    where: {
                        conversation_id: conversationId,
                        destination_id: aidantId,
                    },
                    attributes: ['id'],
                });

                const messageIds = messages.map(m => m.id);

                if (messageIds.length > 0) {
                    const [updatedCount] = await MessageStatus.update(
                        {status: "read"},
                        {
                            where: {
                                message_id: {[Op.in]: messageIds},
                                status: {[Op.in]: ["sent", "delivered"]}
                            }
                        }
                    );

                    console.log(`Marked ${updatedCount} messages as read in conversation ${conversationId}`);
                }

                // Emit to the user
                io.to(`user_${aidantId}`).emit("messageRead", {conversationId});
            } catch (error) {
                console.error("❌ Error marking messages as read:", error);
            }
        });

        socket.on("typing", ({conversationId, userId, isTyping}) => {
            socket.to(conversationId).emit("userTyping", {conversationId, userId, isTyping});
        });

        socket.on("disconnect", () => {
            if (socket.userId) {
                const userId = socket.userId.toString();
                const userSockets = onlineUsers.get(userId);

                if (userSockets) {
                    userSockets.delete(socket.id);

                    if (userSockets.size === 0) {
                        onlineUsers.delete(userId);
                        console.log(`User ${socket.userId} went offline (no more connections)`);
                    } else {
                        console.log(`User ${socket.userId} still has ${userSockets.size} connection(s)`);
                    }
                }
            }
            console.log("User disconnected:", socket.id);
        });

        // Handle ping-pong for connection health
        socket.on('pong', () => {
            socket.emit('ping');
        });
    });

    return io;
};

module.exports = setupSocket;