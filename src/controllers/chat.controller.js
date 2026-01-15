const { Conversation, Participant, Message, MessageStatus, Blocklist, User, ProfileAidant, Subscription, CreditsHistory, sequelize } = require("../models");
const { Op, Sequelize } = require("sequelize");
const logger = require('../utils/logger');
const  {sendMessageEmail} = require('../utils/mail')

// Create a conversation between users
const createConversation = async (req, res) => {
  try {
    const { userId, aidantId } = req.body;

    if (!userId || !aidantId) {
      return res.status(400).json({ error: "Both userId and aidantId are required" });
    }

    const user = await User.findByPk(userId, {
      include: {
        model: ProfileAidant,
        include: {
          model: Subscription,
          as: "subscription",
          required: false,
          where: {
            [Op.or]: [
              { status: "active" },
              {
                status: "cancelled",
                next_billing_time: { [Op.gt]: new Date() }
              }
            ]
          }
        }
      }
    });
    
    const hasActiveSubscription = user.ProfileAidant?.subscription ? true : false;
    const hasCredits = user.credits > 0;

    if (!hasCredits && !hasActiveSubscription) {
      return res.status(400).json({ error: "You need credits or an active subscription to start a conversation." });
    }

    //Step 1: Check if the users have blocked each other
    const isBlocked = await Blocklist.findOne({
      where: {
        [Op.or]: [
          { blocker_id: userId, blocked_id: aidantId },
          { blocker_id: aidantId, blocked_id: userId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({ error: "You cannot start a conversation with this user." });
    }

    // Step 2: Find all conversations where userId is a participant
    const userConversations = await Participant.findAll({
      where: { aidant_id: userId },
      attributes: ["conversation_id"],
    });

    const conversationIds = userConversations.map(p => p.conversation_id);

    // Step 3: Check if any of these conversations also include aidantId
    const existingConversation = await Participant.findOne({
      where: {
        conversation_id: { [Op.in]: conversationIds },
        aidant_id: aidantId,
      },
    });

    let conversation;

    // Step 5: If no existing conversation, create a new one
    if (!existingConversation) {
      const transaction = await sequelize.transaction();

      try {
        const hasActiveSubscription = !!user.ProfileAidant?.subscription;
        const hasCredits = user.credits > 0;

        conversation = await Conversation.create({
          last_message_at: new Date()
        }, { transaction });

        await Participant.bulkCreate([
          { conversation_id: conversation.id, aidant_id: userId },
          { conversation_id: conversation.id, aidant_id: aidantId },
        ], { transaction });

        if (hasActiveSubscription) {
          // User is subscribed — allow without deducting credits
          console.log("Conversation started using subscription.");
        } else if (hasCredits) {
          // No subscription — fallback to credit usage
          await user.update({ credits: user.credits - 1 }, { transaction });
    
          await CreditsHistory.create({
            sender_id: userId,
            destination_id: aidantId,
            credits: 1,
            active: true,
          }, { transaction });

        } else {
          throw new Error("No active subscription or available credits.");
        }

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } else {
      conversation = await Conversation.findByPk(existingConversation.conversation_id);
    }

    // Step 5: Fetch the conversation again, including participant details
    conversation = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: Participant,
          include: [
            {
              model: ProfileAidant,
              attributes: ["profile_pic", "first_name", "last_name", "online"],
            },
          ],
        },
      ],
    });
    
    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Conversation error", message: error.message });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    const blockedUsers = await Blocklist.findAll({
      where: { blocker_id: userId },
      attributes: ["blocked_id"],
    });

    const blockedUserIds = blockedUsers.map(b => b.blocked_id);

    const participantConversations = await Participant.findAll({
      where: { aidant_id: userId },
      attributes: ["conversation_id"],
    });

    const conversationIds = participantConversations.map(p => p.conversation_id);

    if (conversationIds.length === 0) {
      return res.status(200).json([]);
    }

    const conversations = await Conversation.findAll({
      where: { id: { [Op.in]: conversationIds } },
      include: [
        {
          model: Participant,
          include: [
            {
              model: ProfileAidant,
              attributes: ["profile_pic", "first_name", "last_name", "online"],
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    const filteredConversations = conversations.filter(conversation =>
        !conversation.Participants.some(participant => blockedUserIds.includes(participant.aidant_id))
    );


    const conversationsWithUnread = await Promise.all(
        filteredConversations.map(async (conversation) => {
          const conversationData = conversation.toJSON();

          const messages = await Message.findAll({
            where: {
              conversation_id: conversation.id,
              destination_id: userId,
            },
            attributes: ['id'],
            include: [
              {
                model: MessageStatus,
                where: {
                  status: { [Op.in]: ['sent', 'delivered'] }
                },
                required: true,
              },
            ],
          });

          return {
            ...conversationData,
            unread_count: messages.length,
          };
        })
    );

    res.status(200).json(conversationsWithUnread);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to get conversations", message: error.message });
  }
};


// Send a message
const sendMessage = async (req, res) => {
    try {
      const { conversation_id, sender_id, destination_id, message_text } = req.body.messageData;
  
      const conversation = await Conversation.findByPk(conversation_id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (!conversation.is_active) {
        return res.status(404).json({ error: "Conversation no more active" });
      }

      // Check if sender is blocked
      const isBlocked = await Blocklist.findOne({
        where: { blocker_id: sender_id, blocked_id: destination_id  },
      });
  
      if (isBlocked) {
        return res.status(403).json({ error: "You are blocked by this user" });
      }
  
      const message = await Message.create({
        conversation_id,
        sender_id,
        destination_id,
        message_text,
      });
  
      await MessageStatus.create({
        message_id: message.id,
        user_id: destination_id,
        status: "sent",
      });
  
      await Conversation.update(
        { last_message_at: new Date() },
        { where: { id: conversation_id } }
      );
  
      const response = await Message.findByPk(message.id, {
        include: [{ model: MessageStatus }],
      });
    
      const user = await User.findOne({ where: { id: destination_id } });
      sendMessageEmail(user);

      res.status(200).json(response);
    } catch (error) {
      console.error(error);
      logger.error(`API Error: ${error.message}`, { stack: error.stack });
      res.status(500).json({ error: "Chat error", error: error.message  });
    }
};
  
// Get messages in a conversation
const getMessages = async (req, res) => {
    try {
      const { conversationId } = req.params;
  
      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (!conversation.is_active) {
        return res.status(404).json({ error: "Conversation no more active" });
      }

      const messages = await Message.findAll({
        where: { conversation_id: conversationId },
        order: [["sent_at", "ASC"]],
        include: [{
          model: MessageStatus,
        }],
      });
  
      res.status(200).json(messages);
    } catch (error) {
      console.error(error);
      logger.error(`API Error: ${error.message}`, { stack: error.stack });
      res.status(500).json({ error: "Retrieving messages error", error: error.message  });
    }
};
  
// Block a user
const blockUser = async (req, res) => {
    try {
      const { blocker_id, blocked_id } = req.body;
  
      const existingBlock = await Blocklist.findOne({ where: { blocker_id, blocked_id } });
  
      if (!existingBlock) {
        await Blocklist.create({ blocker_id, blocked_id });
      }
  
      res.status(200).json({ message: "Utilisateur bloqué avec succès" });
    } catch (error) {
      console.error(error);
      logger.error(`API Error: ${error.message}`, { stack: error.stack });
      res.status(500).json({ error: "Error blocking user", error: error.message  });
    }
};

const getBlockedUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const blockedUsers = await Blocklist.findAll({
      where: { blocker_id: userId },
      include: [
        {
          model: ProfileAidant,
          as: "Blocked",
          attributes: ["id", "first_name", "last_name", "profile_pic"],
        },
      ],
    });

    res.status(200).json(blockedUsers);
  } catch (error) {
    console.error(error);
    logger.error(`API Error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: "Error fetching blocked users", error: error.message  });  }
};

const unblockUser = async (req, res) => {
  try {
    const { blocker_id, blocked_id } = req.body;

    // Step 1: Check if the block exists
    const existingBlock = await Blocklist.findOne({ where: { blocker_id, blocked_id } });

    if (!existingBlock) {
      return res.status(404).json({ error: "User is not blocked" });
    }

    // Step 2: Remove from the blocklist
    await Blocklist.destroy({ where: { blocker_id, blocked_id } });

    res.status(200).json({ message: "Utilisateur débloqué avec succès" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    logger.error(`API Error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: "Error unblocking user", error: error.message  });
  }
};

const deactivateChat = async (req, res) => {
  try {
    const { conversationId } = req.params; // ID of conversation & user making request
    const { aidant_id } = req.body;

    
    const conversation = await Conversation.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation non trouvée." });
    }

    if (!conversation.is_active) {
      return res.status(400).json({ error: "La conversation est déjà inactive." });
    }

    
    // Check if last message was sent by the destination user and is older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const lastMessage = await Message.findOne({
      where: { conversation_id: conversationId },
      order: [["sent_at", "DESC"]],
    });

    const hasReplied = await Message.findOne({
      where: {
        conversation_id: conversationId,
        sender_id: aidant_id
      }
    });


    // Check if last message was sent by the destination user and is older than 7 days
    if (hasReplied) {
      return res.status(404).json({ error: "Vous ne pouvez pas libérer un credit pour cette conversation." });
    } else {
      if (conversation.createdAt > sevenDaysAgo) {
        return res.status(400).json({ error: "Vous devez attendre 7 jours pour libérer un crédit." });
      }
    }

    // if (!lastMessage) {
    //   return res.status(404).json({ error: "No messages found in this conversation." });
    // }

    // if (lastMessage.sent_at > sevenDaysAgo) {
    //   return res.status(400).json({ error: "Vous devez attendre 7 jours pour libérer un crédit." });
    // }

    //  Deactivate conversation
    await Conversation.update(
      { is_active: false },
      { where: { id: conversationId } }
    );

    let creditHistory;

    if (lastMessage) {
      creditHistory = await CreditsHistory.findOne({
        where: {
          sender_id: lastMessage.sender_id,
          destination_id: lastMessage.destination_id,
          active: true,
        },
        order: [['createdAt', 'DESC']], // In case there are multiple
      });
    }

    if (creditHistory) {
      // Step 3: Refund 1 credit
      await User.increment("credits", {
        by: 1,
        where: { id: req.user.id},
      });
    
      // Step 4: Mark credit history as refunded
      await creditHistory.update({
        credits: 0,
        active: false,
      });
    } else {
      // Was probably a subscription-based conversation — no refund needed
      console.log("Aucun remboursement de crédit : la conversation était probablement basée sur un abonnement.");
    }

    res.json({ message: "Conversation désactivée, 1 crédit remboursé" });
  } catch (error) {
    console.error("Error reactivating conversation:", error);
    res.status(500).json({ error: "Error reactivating user", error: error.message  });
  }
}

const reactivateChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const aidantProfile = await ProfileAidant.findOne({
      where: { user_id: userId },
      include: [{
        model: Subscription,
        as: "subscription",
        where: {
          [Op.or]: [
            { status: "active" },
            {
              status: "cancelled",
              next_billing_time: { [Op.gt]: new Date() }
            }
          ]
        },
        required: false,
      }],
    });

    const hasActiveSubscription = aidantProfile?.subscription ? true : false;

    if (!hasActiveSubscription && user.credits < 1) {
      return res.status(400).json({ error: "Insufficient credits and no active subscription" });
    }

    // Get participants of the conversation
    const participants = await Participant.findAll({
      where: { conversation_id: id },
    });

    if (participants.length !== 2) {
      return res.status(400).json({ error: "Invalid conversation participants" });
    }

    const sender_id = userId;
    const destination_id = participants.find(p => p.aidant_id !== userId)?.aidant_id;

    // Update conversation to active
    await Conversation.update({ is_active: true }, { where: { id } });

    if (!hasActiveSubscription) {
      await User.update(
        { credits: user.credits - 1 },
        { where: { id: userId } }
      );

      await CreditsHistory.update(
        {
          credits: 1,
          active: true,
        },
        {
          where: {
            sender_id: sender_id,
            destination_id: destination_id,
            active: false,
          },
          limit: 1,
        }
      );
    }

    res.json({ message: "Conversation réactivée" + (hasActiveSubscription ? " via abonnement" : ", 1 crédit déduit") });
  } catch (error) {
    console.error("Error reactivating conversation:", error);
    res.status(500).json({ error: "Error reactivating user", error: error.message  });
  }
}

const deactivateChatMonCompte = async (req, res) => {
  try {
    const {user_id, aidant_id } = req.body; // ID of conversation & user making request

    const aidantIds = [user_id, aidant_id]

    const result = await Participant.findAll({
      where: {
        aidant_id: aidantIds,
      },
      attributes: ['conversation_id'],
      group: ['conversation_id'],
      having: Sequelize.literal(`COUNT(DISTINCT aidant_id) = ${aidantIds.length}`),
      raw: true
    });

    const conversationId = result[0]?.conversation_id

    const conversation = await Conversation.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation non trouvée." });
    }

    if (!conversation.is_active) {
      return res.status(400).json({ error: "La conversation est déjà inactive." });
    }

    const lastMessage = await Message.findOne({
      where: { conversation_id: conversationId },
      order: [["sent_at", "DESC"]],
    });

    const hasReplied = await Message.findOne({
      where: {
        conversation_id: conversationId,
        sender_id: aidant_id
      }
    });


    // Check if last message was sent by the destination user and is older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (hasReplied) {
      return res.status(404).json({ error: "Vous ne pouvez pas libérer un credit pour cette conversation." });
    } else {
      if (conversation.createdAt > sevenDaysAgo) {
        return res.status(400).json({ error: "Vous devez attendre 7 jours pour libérer un crédit." });
      }
    }

    // if (!lastMessage) {
    //   return res.status(404).json({ error: "Aucun message trouvé dans cette conversation." });
    // }

    // if (lastMessage.sent_at > sevenDaysAgo) {
    //   return res.status(400).json({ error: "Vous devez attendre 7 jours pour libérer un crédit." });
    // }

    //  Deactivate conversation
    await Conversation.update(
      { is_active: false },
      { where: { id: conversationId } }
    );

    const creditHistory = await CreditsHistory.findOne({
      where: {
        sender_id: lastMessage.sender_id,
        destination_id: lastMessage.destination_id,
        active: true,
      },
      order: [['createdAt', 'DESC']], // In case there are multiple
    });
    

    if (creditHistory) {
      // Step 3: Refund 1 credit
      await User.increment("credits", {
        by: 1,
        where: { id: lastMessage.sender_id },
      });
    
      // Step 4: Mark credit history as refunded
      await creditHistory.update({
        credits: 0,
        active: false,
      });
    } else {
      // Was probably a subscription-based conversation — no refund needed
      console.log("Aucun remboursement de crédit : la conversation était probablement basée sur un abonnement");
    }

    res.json({ message: "Conversation désactivée, 1 crédit remboursé" });
  } catch (error) {
    console.error("Error reactivating conversation:", error);
    res.status(500).json({ error: "Error reactivating user", error: error.message  });
  }
}
module.exports = { createConversation, getUserConversations, sendMessage, getMessages, blockUser, getBlockedUsers, unblockUser, deactivateChat, reactivateChat, deactivateChatMonCompte };
