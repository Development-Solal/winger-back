'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription  extends Model {
    static associate(models) {
      // Define association here
      Subscription.belongsTo(models.ProfileAidant, {
        foreignKey: "aidant_id",
        as: "aidant",
      });
    }
  }
  Subscription.init(
    {
        id: {
            type: DataTypes.STRING, // PayPal subscription ID (e.g., "I-S452EF9NP3AV")
            primaryKey: true,
            allowNull: false,
        },
        aidant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        plan_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING, // PayPal returns values like "APPROVAL_PENDING", "ACTIVE", "CANCELLED"
            allowNull: false,
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        next_billing_time: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        payer_email: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payment_method:{
            type: DataTypes.ENUM('paypal','apple','stripe','google'),
            allowNull: false,
            defaultValue: 'paypal',
        }
    },
    {
      sequelize,
      modelName: 'Subscription',
    }
  );
  return Subscription;
};
