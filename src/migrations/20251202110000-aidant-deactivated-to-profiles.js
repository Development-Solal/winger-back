'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists in ProfileAidants
    const aidantsColumns = await queryInterface.describeTable('ProfileAidants');
    if (!aidantsColumns.aidant_deactivated) {
      await queryInterface.addColumn('ProfileAidants', 'aidant_deactivated', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Check if column already exists in ProfileAides
    const aidesColumns = await queryInterface.describeTable('ProfileAides');
    if (!aidesColumns.aidant_deactivated) {
      await queryInterface.addColumn('ProfileAides', 'aidant_deactivated', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

  const suspendedColumns = await queryInterface.describeTable('ProfileAides');
  if (!suspendedColumns.is_suspended) {
  await queryInterface.addColumn('ProfileAides', 'is_suspended', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
}
},

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ProfileAidants', 'aidant_deactivated');
    await queryInterface.removeColumn('ProfileAides', 'aidant_deactivated');
    await queryInterface.removeColumn('ProfileAides', 'is_suspended');
  }
};