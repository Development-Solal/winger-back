'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column exists before removing it
    const columns = await queryInterface.describeTable('ProfileAidants');
    if (columns.aidant_is_aide) {
      await queryInterface.removeColumn('ProfileAidants', 'aidant_is_aide');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ProfileAidants', 'aidant_is_aide', {
      type: Sequelize.String
    });
  }
};