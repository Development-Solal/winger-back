const express = require('express');
const router = express.Router();
const { createConversation, getUserConversations, sendMessage, getMessages, blockUser, getBlockedUsers, unblockUser, reactivateChat, deactivateChat, deactivateChatMonCompte } = require('../controllers/chat.controller');
const authenticateToken = require('../middlewares/autheticationMiddleware');

/**
 * @swagger
 * /api/chat/createConversation:
 *   post:
 *     summary: Starting a conversation 
 *     description: Starting a new conversation with another aidant
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/conversation", authenticateToken, createConversation);


/**
 * @swagger
 * /api/chat/getUserConversations:
 *   get:
 *     summary: Get a user messages
 *     description: Retrieve all the messages of 1 user
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/conversations/:userId", authenticateToken, getUserConversations);

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a message
 *     description: Send a message to a destinated user
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/message", authenticateToken, sendMessage);

/**
 * @swagger
 * /api/chat/getMessages:
 *   get:
 *     summary: Retrieve messages
 *     description: Get all the messages of a conversation
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/messages/:conversationId", authenticateToken, getMessages);

/**
 * @swagger
 * /api/chat/blockUser:
 *   post:
 *     summary: Block a user
 *     description: Block a user
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/block", authenticateToken, blockUser);

/**
 * @swagger
 * /api/chat/unblockUser:
 *   post:
 *     summary: Unblock a user
 *     description: Unblock a user
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/unblockUser", authenticateToken, unblockUser);

/**
 * @swagger
 * /api/chat/getBlockedUsers:
 *   get:
 *     summary: Get all blocked users
 *     description: Retrieved the list of all blocked users
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/block/:userId", authenticateToken, getBlockedUsers);

/**
 * @swagger
 * /api/chat/conversations/:conversationId/deactivateChat:
 *   get:
 *     summary: Deactivate a chat
 *     description: Deactivate a conversation
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/conversations/:conversationId/deactivateChat", authenticateToken, deactivateChat);

/**
 * @swagger
 * /api/chat/conversations/:id/reactivate:
 *   get:
 *     summary: Reactivate a chat
 *     description: Reactivate a conversation
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
*/
router.put("/conversations/:id/reactivate", authenticateToken, reactivateChat);

/**
 * @swagger
 * /api/chat/conversations/deactivateChatMonCompte:
 *   post:
 *     summary: Deactivate a chat from mon compte
 *     description: Deactivate a conversation from mon compte
 *     tags:
 *      - Chat
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/conversations/deactivateChatMonCompte", authenticateToken, deactivateChatMonCompte);

module.exports = router;