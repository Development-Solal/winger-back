"use strict";

const {Model, Sequelize} = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class GdprConsentHistory extends Model {
        static associate(models) {

            GdprConsentHistory.belongsTo(models.ProfileAidant, {
                foreignKey: 'entity_id',
                constraints: false,
                as: 'ProfileAidant'
            });
            GdprConsentHistory.belongsTo(models.ProfileAide, {
                foreignKey: 'entity_id',
                constraints: false,
                as: 'ProfileAide'
            });

            GdprConsentHistory.belongsTo(models.GdprConsent, {
                foreignKey: 'consent_id',
                constraints: false,
                as: 'GdprConsent'
            });
        }


        /**
         * Helper method to create consent record
         * @param {number} entityId - User/Aidant ID
         * @param {string} entityType - 'aidant', 'aidant_pro', or 'aide'
         * @param {number} consentId - 'consentid'
         * @param {string} consentKet - 'cgv'/ 'privacy_policy'/ 'age_18'/ 'newsletter'/ 'push'
         * @param {boolean} previousValue - true or false
         * @param {boolean} newValue - true or false
         * @param {String} source - 'web' or 'mobile'
         */
        static async createConsentHistory(entityId, entityType, consentId,consentkey, previousValue, newValue, source) {
            const timestamp = new Date().toISOString();
            return await this.create({
                entity_id: entityId,
                entity_type: entityType,
                consent_id:consentId,
                consent_key: consentkey,
                previous_value: previousValue,
                new_value: newValue,
                source: source,
                timestamp: timestamp
            });
        }

    }


    GdprConsentHistory.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            entity_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: "entity_id",
            },
            entity_type: {
                type: DataTypes.ENUM("aidant", "aidant_pro", "aide"),
                allowNull: false,
                field: "entity_type",
            },
            consent_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: "consent_id",
            },
            consent_key: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            previous_value: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            new_value: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            source: {
                type: DataTypes.ENUM("web", "mobile"),
                allowNull: false,
            },
            timestamp: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        },
        {
            sequelize,
            modelName: "GdprConsentHistory",
            tableName: "GdprConsentHistory",
            timestamps: false,
            underscored: true
        }
    );

    return GdprConsentHistory;
};