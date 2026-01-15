'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable('ProfileAides');
    if (!columns.aidant_is_aide) {
      await queryInterface.addColumn('ProfileAides', 'aidant_is_aide', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the column if migration is rolled back
    const columns = await queryInterface.describeTable('ProfileAides');
    if (columns.aidant_is_aide) {
      await queryInterface.removeColumn('ProfileAides', 'aidant_is_aide');
    }
  }
};