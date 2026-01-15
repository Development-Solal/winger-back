'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ProfileAidantPros', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      aidant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProfileAidants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      company_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      company_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      company_description: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ProfileAidantPros');
  },
};
