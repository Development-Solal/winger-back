'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('ProfileAidantPros', 'company_description', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    await queryInterface.changeColumn('ProfileAides', 'description', {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    await queryInterface.changeColumn('FutureMoities', 'description', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('ProfileAidantPros', 'company_description', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn('ProfileAides', 'description', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('FutureMoities', 'description', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  }
};
