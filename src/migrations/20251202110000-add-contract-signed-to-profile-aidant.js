'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists in ProfileAidants
    const aidantsColumns = await queryInterface.describeTable('ProfileAidantPros');
    if (!aidantsColumns.contract_signed) {
      await queryInterface.addColumn('ProfileAidantPros', 'contract_signed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Check if column already exists in ProfileAides
    const aidesColumns = await queryInterface.describeTable('ProfileAidantPros');
    if (!aidesColumns.contract_signed) {
      await queryInterface.addColumn('ProfileAidantPros', 'contract_signed', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ProfileAidantPros', 'contract_signed');
  }
};