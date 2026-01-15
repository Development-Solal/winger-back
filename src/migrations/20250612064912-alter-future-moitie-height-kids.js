'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn("FutureMoities", "height_id");
    await queryInterface.removeColumn("FutureMoities", "kids_id");
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn("FutureMoities", "height_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "ListHeights",
        key: "id",
      },
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("FutureMoities", "kids_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "ListKids",
        key: "id",
      },
      onDelete: "SET NULL",
    });
  }
};
