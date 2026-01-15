'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("PaymentHistory", {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
      aidant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ProfileAidants", // Ensure this matches your Aidant table name
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subscription_type: {
        type: Sequelize.ENUM("forfait", "abonnement"),
        allowNull: false,
      },
      credits: {
        type: Sequelize.INTEGER,
        allowNull: true, // NULL for subscriptions
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      payment_status: {
        type: Sequelize.ENUM("pending", "success", "failed"),
        defaultValue: "pending",
        allowNull: false,
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("PaymentHistory");
  }
};
