"use strict";

const {Model} = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class GdprConsent extends Model {
        static associate(models) {

            GdprConsent.belongsTo(models.ProfileAidant, {
                foreignKey: 'entity_id',
                constraints: false,
                as: 'ProfileAidant'
            });

            GdprConsent.belongsTo(models.ProfileAide, {
                foreignKey: 'entity_id',
                constraints: false,
                as: 'ProfileAide'
            });
        }


        /**
         * Helper method to create consent record
         * @param {number} entityId - User/Aidant ID
         * @param {string} entityType - 'aidant', 'aidant_pro', or 'aide'
         * @param {object} consentData - Object with consent flags (cgv, privacy_policy, age_18, newsletter, push)
         * @param {string} source - 'web' or 'mobile'
         */
        static async createConsent(entityId, entityType, consentData, source, transaction) {
            const timestamp = new Date().toISOString();

            const consent = {
                cgv: {
                    status: consentData.cgv || false,
                    timestamp: consentData.cgv ? timestamp : null,
                },
                privacy_policy: {
                    status: consentData.privacy_policy || false,
                    timestamp: consentData.privacy_policy ? timestamp : null,
                },
                age_18: {
                    status: consentData.age_18 || false,
                    timestamp: consentData.age_18 ? timestamp : null,
                },
                newsletter: {
                    status: consentData.newsletter || false,
                    timestamp: consentData.newsletter ? timestamp : null,
                },
                push: {
                    status: consentData.push || false,
                    timestamp: consentData.push ? timestamp : null,
                },
            };

            //stored in profile tables

            return await this.create({
                    entity_id: entityId,
                    entity_type: entityType,
                    consent: consent,
                    source: source,
                    status: true

                },
                {transaction});
        }

        /**
         * Helper method to update consent
         * @param {number} consentId - Consent record ID
         * @param {object} updates - Object with consent updates
         */
        static async updateConsent(consentId, updates) {
            const record = await this.findByPk(consentId);
            if (!record) {
                throw new Error("Consent record not found");
            }

            const timestamp = new Date().toISOString();
            const updatedConsent = {...record.consent};

            Object.keys(updates).forEach((key) => {
                if (updatedConsent[key]) {
                    updatedConsent[key] = {
                        status: updates[key],
                        timestamp: updates[key] ? timestamp : updatedConsent[key].timestamp,
                    };
                }
            });


            await record.update({
                consent: updatedConsent,
                updated_at: new Date()

            });

            return record;
        }

        /**
         * Get consent report for a user
         * @param {number} entityId - User/Aidant ID
         * @param {string} entityType - 'aidant', 'aidant_pro', or 'aide'
         */
        static async getConsentReport(entityId, entityType) {
            return await this.findAll({
                where: {
                    entity_id: entityId,
                    entity_type: entityType,
                },
                order: [["created_at", "DESC"]],
            });
        }

        /**
         * Get latest consent for a user
         * @param {number} entityId - User/Aidant ID
         * @param {string} entityType - 'aidant', 'aidant_pro', or 'aide'
         */
        static async getLatestConsent(entityId, entityType) {
            return await this.findOne({
                where: {
                    entity_id: entityId,
                    entity_type: entityType,
                },
                order: [["created_at", "DESC"]],
            });
        }

        /**
         * Check if user has accepted all required GDPR consents
         * Note: This now should check ProfileAidant.all_required_accepted instead
         * Kept for backwards compatibility
         * @param {number} entityId - User/Aidant ID
         * @param {string} entityType - 'aidant', 'aidant_pro', or 'aide'
         */
        static async hasAllRequiredConsents(entityId, entityType) {
            const latestConsent = await this.getLatestConsent(entityId, entityType);

            if (!latestConsent) {
                return false;
            }

            // Check consent data directly
            return (
                latestConsent.consent?.cgv?.status === true &&
                latestConsent.consent?.privacy_policy?.status === true &&
                latestConsent.consent?.age_18?.status === true
            );
        }
    }

    GdprConsent.init(
        {
            consent_id: {
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
            consent: {
                type: DataTypes.JSONB,
                allowNull: false,
                defaultValue: {},
                get() {
                    const rawValue = this.getDataValue("consent");
                    return rawValue;
                },
            },
            source: {
                type: DataTypes.ENUM("web", "mobile"),
                allowNull: false,
            },
            //in profile tables
            status: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: "created_at",
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: "updated_at",
            },
        },
        {
            sequelize,
            modelName: "GdprConsent",
            tableName: "GdprConsents",
            timestamps: true,
            underscored: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    );

    return GdprConsent;
};