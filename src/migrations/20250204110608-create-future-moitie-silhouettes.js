"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("FutureMoitieSilhouettes", {
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
      silhouette_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ListSilhouettes",
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
    await queryInterface.dropTable("FutureMoitieSilhouettes");
  },
};
