'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    static associate(models) {
      // Define association here
      Message.belongsTo(models.Conversation, {
        foreignKey: "conversation_id",
        onDelete: "CASCADE",
      });
      Message.belongsTo(models.ProfileAidant, {
        foreignKey: "sender_id",
        as: "Sender",
        onDelete: "CASCADE",
      });
      Message.belongsTo(models.ProfileAidant, {
        foreignKey: "destination_id",
        as: "Receiver",
        onDelete: "CASCADE",
      });
      Message.hasMany(models.MessageStatus, {
        foreignKey: "message_id",
        onDelete: "CASCADE",
      });
    }
  }
  Message.init(
    {
      conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      destination_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      message_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sent_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Message',
    }
  );
  return Message;
};
