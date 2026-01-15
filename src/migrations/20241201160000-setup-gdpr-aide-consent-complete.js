'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if profile_aide_id already exists in GdprAides
    const gdprAidesDescription = await queryInterface.describeTable('GdprAides');
    
    if (!gdprAidesDescription.profile_aide_id) {
      // Add profile_aide_id to GdprAides
      await queryInterface.addColumn('GdprAides', 'profile_aide_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ProfileAides',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      // Add index for profile_aide_id
      await queryInterface.addIndex('GdprAides', ['profile_aide_id'], {
        name: 'idx_gdpr_aides_profile_aide_id'
      });
    }

    // Make ALL ProfileAides fields nullable
    await queryInterface.changeColumn('ProfileAides', 'profile_number', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    await queryInterface.changeColumn('ProfileAides', 'profile_pic', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('ProfileAides', 'gender', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('ProfileAides', 'name', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('ProfileAides', 'aidant_relation', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('ProfileAides', 'description', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('ProfileAides', 'age_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListAges',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'origine_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListOrigines',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'religion_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListReligions',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'education_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListEducations',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'height_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListHeights',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'silhouette_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListSilhouettes',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'smoker_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListSmokers',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'tattoo_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListTattoos',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'commune_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListCommunes',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'town_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListTowns',
        key: 'id'
      }
    });

    await queryInterface.changeColumn('ProfileAides', 'nationality_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'ListNationalities',
        key: 'id'
      }
    });

    // Change active default to false
    await queryInterface.changeColumn('ProfileAides', 'active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove GdprAides changes
    const gdprAidesDescription = await queryInterface.describeTable('GdprAides');
    if (gdprAidesDescription.profile_aide_id) {
      await queryInterface.removeIndex('GdprAides', 'idx_gdpr_aides_profile_aide_id');
      await queryInterface.removeColumn('GdprAides', 'profile_aide_id');
    }

    // Revert ProfileAides changes (may fail if null values exist)
    await queryInterface.changeColumn('ProfileAides', 'profile_number', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });

    await queryInterface.changeColumn('ProfileAides', 'gender', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('ProfileAides', 'name', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('ProfileAides', 'aidant_relation', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('ProfileAides', 'active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  }
};