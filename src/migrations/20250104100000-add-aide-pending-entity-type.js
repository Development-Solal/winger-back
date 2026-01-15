'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Vérifier si la valeur existe
    const [results] = await queryInterface.sequelize.query(`
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'aide_pending'
        AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_GdprConsents_entity_type'
      );
    `);

    // Ajouter la valeur seulement si elle n'existe pas
    if (results.length === 0) {
      // Créer une nouvelle connexion sans transaction
      const pgClient = queryInterface.sequelize.connectionManager.pool;
      await queryInterface.sequelize.query(
          `ALTER TYPE "enum_GdprConsents_entity_type" ADD VALUE 'aide_pending';`,
          { raw: true }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Cannot remove ENUM value - requires recreating the type');
  }
};