'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Favorites', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        type: Sequelize.INTEGER
      },
      aidant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: "ProfileAidants",
            key: "id",
        },
        onDelete: "CASCADE",
      },
      aide_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
              model: "ProfileAides",
              key: "id",
          },
          onDelete: "CASCADE",
      },
      fav_aide_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
              model: "ProfileAides",
              key: "id",
          },
          onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Favorites');
  }
};