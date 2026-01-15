'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('GdprConsents', {
            consent_id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            entity_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to User or Aidant (relation not enforced at DB level)'
            },
            entity_type: {
                type: Sequelize.ENUM('aidant', 'aidant_pro', 'aide'),
                allowNull: false
            },
            consent: {
                type: Sequelize.JSONB,
                allowNull: false,
                defaultValue: {},
                comment: 'JSON structure with consent details and timestamps'
            },
            source: {
                type: Sequelize.ENUM('web', 'mobile'),
                allowNull: false
            },
            status: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_gdpr_entity
                ON "GdprConsents" (entity_id, entity_type);
        `);


        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_gdpr_created_at
                ON "GdprConsents" (created_at);
        `);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('GdprConsents');
    }
};