'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      // Define association here
    Conversation.hasMany(models.Participant, {
      foreignKey: "conversation_id",
      onDelete: "CASCADE",
    });
    Conversation.hasMany(models.Message, {
      foreignKey: "conversation_id",
      onDelete: "CASCADE",
    });
    }
  }
  Conversation.init(
    {
      last_message_at: DataTypes.DATE,
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Conversation',
    }
  );
  return Conversation;
};
