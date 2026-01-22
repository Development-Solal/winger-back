'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('GdprAides', 'status');

    await queryInterface.addColumn('GdprAides', 'consent', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'GDPR consent data with timestamps: {cgv: {status: true, timestamp: "..."}, privacy_policy: {...}, age_18: {...}, newsletter: {...}}'
    });
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.removeColumn('GdprAides', 'consent');

    await queryInterface.addColumn('GdprAides', 'status', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether Aide has accepted consent'
    });
  }
};