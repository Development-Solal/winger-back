'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentHistory  extends Model {
    static associate(models) {
      // Define association here
      PaymentHistory.belongsTo(models.ProfileAidant, {
        foreignKey: "aidant_id",
        as: "aidant",
      });
    }
  }
  PaymentHistory.init(
    {
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        aidant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        subscription_type: {
            type: DataTypes.ENUM("forfait", "abonnement"),
            allowNull: false,
        },
        credits: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        payment_status: {
            type: DataTypes.ENUM("pending", "success", "failed"),
            defaultValue: "pending",
        },
        transaction_id: {
          type: DataTypes.STRING,
          allowNull: true,
        },
    },
    {
      sequelize,
      modelName: 'PaymentHistory',
      tableName: 'PaymentHistory',
    }
  );
  return PaymentHistory;
};
