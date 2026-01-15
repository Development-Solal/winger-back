'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MessageStatus extends Model {
    static associate(models) {
      // Define association here
      MessageStatus.belongsTo(models.Message, {
        foreignKey: "message_id",
        onDelete: "CASCADE",
      });
      MessageStatus.belongsTo(models.ProfileAidant, {
        foreignKey: "user_id",
        onDelete: "CASCADE",
      });
    }
  }
  MessageStatus.init(
    {
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("sent", "delivered", "read"),
        defaultValue: "sent",
      },
    },
    {
      sequelize,
      modelName: 'MessageStatus',
      tableName: "MessageStatus"
    }
  );
  return MessageStatus;
};
