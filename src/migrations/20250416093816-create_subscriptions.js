'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("Subscriptions", {
      id: {
        type: Sequelize.STRING, // PayPal subscription ID (e.g. "I-S452EF9NP3AV")
        primaryKey: true,
        allowNull: false,
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
      plan_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING, // e.g. "ACTIVE", "CANCELLED"
        allowNull: false,
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      next_billing_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      payer_email: {
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
    await queryInterface.dropTable("Subscriptions");
  }
};
