'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('ProfileAidants', 'last_seen_at', {
      type: Sequelize.DATE,
      allowNull: true, // allow null for existing rows
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('ProfileAidants', 'last_seen_at');
  }
};
