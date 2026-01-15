'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn("FutureMoities", "origine_id");
    await queryInterface.removeColumn("FutureMoities", "nationality_id");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn("FutureMoities", "origine_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "ListOrigines",
        key: "id",
      },
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("FutureMoities", "nationality_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "ListNationalities",
        key: "id",
      },
      onDelete: "SET NULL",
    });
  }
};
