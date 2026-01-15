'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CreditsHistory  extends Model {
    static associate(models) {
      // Define association here
      CreditsHistory.belongsTo(models.ProfileAidant, {
        foreignKey: 'sender_id',
        as: 'sender',
      });
      CreditsHistory.belongsTo(models.ProfileAidant, {
        foreignKey: 'destination_id',
        as: 'destination',
      });
    }
  }
  CreditsHistory.init(
    {
        sender_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        destination_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        credits: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
    },
    {
      sequelize,
      modelName: 'CreditsHistory',
      tableName: 'CreditsHistory',
    }
  );
  return CreditsHistory;
};
