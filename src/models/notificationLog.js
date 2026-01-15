'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NotificationLog extends Model {
    static associate(models) {
      // Define associations here
      NotificationLog.belongsTo(models.User, {
        foreignKey: 'recipient_id',
        as: 'recipient',
      });
      NotificationLog.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender',
      });
    }
  }
  NotificationLog.init(
    {
      recipient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      message_title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notification_type: {
        type: DataTypes.ENUM('expo', 'firebase'),
        allowNull: true,
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'NotificationLog',
    }
  );
  return NotificationLog;
};