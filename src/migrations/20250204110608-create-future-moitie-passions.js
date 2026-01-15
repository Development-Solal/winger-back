"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("FutureMoitiePassions", {
      future_moitie_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "FutureMoities",
          key: "id",
        },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      passion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ListPassions",
          key: "id",
        },
        onDelete: "CASCADE",
        primaryKey: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("FutureMoitiePassions");
  },
};
