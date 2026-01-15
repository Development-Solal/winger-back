'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists in ProfileAidants
    const aidantsColumns = await queryInterface.describeTable('ProfileAidants');
    if (!aidantsColumns.all_required_accepted) {
      await queryInterface.addColumn('ProfileAidants', 'all_required_accepted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Check if column already exists in ProfileAides
    const aidesColumns = await queryInterface.describeTable('ProfileAides');
    if (!aidesColumns.all_required_accepted) {
      await queryInterface.addColumn('ProfileAides', 'all_required_accepted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ProfileAidants', 'all_required_accepted');
    await queryInterface.removeColumn('ProfileAides', 'all_required_accepted');
  }
};