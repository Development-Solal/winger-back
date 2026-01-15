'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('GdprAides', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      aidant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID of the Aidant Particulier requesting consent',
      },
      email_aide: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Email address of the Aidé',
      },
      consent_token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique token for consent link',
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'TRUE if Aidé consented, FALSE if pending or rejected',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add index on consent_token for faster lookups
    await queryInterface.addIndex('GdprAides', ['consent_token'], {
      name: 'idx_gdpr_aides_consent_token',
    });

    // Add index on aidant_id for faster queries
    await queryInterface.addIndex('GdprAides', ['aidant_id'], {
      name: 'idx_gdpr_aides_aidant_id',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('GdprAides');
  },
};