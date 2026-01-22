'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ProfileAidants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      profile_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ProfileTypeAidants',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      profile_number: {
        type: Sequelize.STRING,
        unique: true,
      },
      profile_pic: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      age_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ListAges",
          key: "id",
        },
      },
      commune_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListCommunes",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      town_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ListTowns",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      aidant_is_aide: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      online: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable('ProfileAidants');
  },
};
