'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "GdprAides" 
      ALTER COLUMN profile_aide_id DROP NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // S'assurer qu'il n'y a pas de NULL avant de restaurer
    await queryInterface.sequelize.query(`
      DELETE FROM "GdprAides" WHERE profile_aide_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "GdprAides" 
      ALTER COLUMN profile_aide_id SET NOT NULL;
    `);
  }
};