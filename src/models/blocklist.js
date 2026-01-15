'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Blocklist extends Model {
    static associate(models) {
      // Define association here
      Blocklist.belongsTo(models.ProfileAidant, {
        foreignKey: "blocker_id",
        as: "Blocker",
        onDelete: "CASCADE",
      });
      Blocklist.belongsTo(models.ProfileAidant, {
        foreignKey: "blocked_id",
        as: "Blocked",
        onDelete: "CASCADE",
      });
    }
  }
  Blocklist.init(
    {
      blocker_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
      },
      blocked_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Blocklist',
      tableName: "Blocklist"
    }
  );
  return Blocklist;
};
