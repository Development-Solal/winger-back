'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Participant extends Model {
    static associate(models) {
      // Define association here
      Participant.belongsTo(models.Conversation, {
        foreignKey: "conversation_id",
        onDelete: "CASCADE",
      });
      Participant.belongsTo(models.ProfileAidant, {
        foreignKey: "aidant_id",
        onDelete: "CASCADE",
      });
    }
  }
  Participant.init(
    {
      conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      aidant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Participant',
    }
  );
  return Participant;
};
