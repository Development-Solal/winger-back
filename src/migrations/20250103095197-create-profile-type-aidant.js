// migrations/[timestamp]-create-profile-aidant.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ProfileTypeAidants', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      title_fr: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title_eng: {
        type: Sequelize.STRING,
        allowNull: false,
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('ProfileTypeAidants');
  },
};
