'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add email column
    await queryInterface.addColumn('ProfileAides', 'email', {
      type: Sequelize.STRING,
      allowNull: true, // Nullable for existing records
      unique: false // We'll check uniqueness per aidant in code
    });

    // Add index for faster email lookups
    await queryInterface.addIndex('ProfileAides', ['email'], {
      name: 'idx_profile_aides_email'
    });

    // Add composite index for aidant + email (prevent same aidant adding same email twice)
    await queryInterface.addIndex('ProfileAides', ['aidant_id', 'email'], {
      name: 'idx_profile_aides_aidant_email',
      unique: true,
      where: {
        email: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('ProfileAides', 'idx_profile_aides_aidant_email');
    await queryInterface.removeIndex('ProfileAides', 'idx_profile_aides_email');
    
    // Remove column
    await queryInterface.removeColumn('ProfileAides', 'email');
  }
};