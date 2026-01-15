'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('GdprConsentHistory', {
            id: {
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
            consent_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to Consent table (relation not enforced at DB level)'
            },
            consent_key: {
                type: Sequelize.STRING(255),
                allowNull: false,
                comment: 'consent key',
            },

            previous_value: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            new_value: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            source: {
                type: Sequelize.ENUM('web', 'mobile'),
                allowNull: false
            },
            timestamp: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_gdpr_history_entity
                ON "GdprConsentHistory" (entity_id, entity_type);
        `);

    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('GdprConsentHistory');
    }
};