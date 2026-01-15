const {GdprConsent, GdprConsentHistory, ProfileAidant, User, sequelize} = require('../models');

/**
 * Get GDPR preferences for a user (Aidant)
 */
const getGdprPreferences = async (userId) => {
    try {
        // Get user's ProfileAidant
        const user = await User.findByPk(userId, {
            include: [{
                model: ProfileAidant,
                as: 'ProfileAidant'
            }]
        });

        if (!user || !user.ProfileAidant) {
            return {
                success: false,
                message: 'Profile introuvable'
            };
        }

        const profileId = user.ProfileAidant.id;

        // Determine entity_type based on profile_type_id
        const entityType = user.ProfileAidant.profile_type_id === 1 ? 'aidant' : 'aidant_pro';

        // Get latest active GDPR consent
        const latestConsent = await GdprConsent.findOne({
            where: {
                entity_id: profileId,
                entity_type: entityType,
                status: true
            },
            order: [['created_at', 'DESC']]
        });

        if (!latestConsent) {
            // No consent record yet, return defaults
            return {
                success: true,
                preferences: {
                    cgv: false,
                    privacy_policy: false,
                    age_18: false,
                    newsletter: false,
                    push: false,
                    all_required_accepted: user.ProfileAidant.all_required_accepted,
                    has_mandatory_consents: false
                }
            };
        }

        return {
            success: true,
            preferences: {
                cgv: latestConsent.consent.cgv,
                privacy_policy: latestConsent.consent.privacy_policy,
                age_18: latestConsent.consent.age_18,
                newsletter: latestConsent.consent.newsletter || false,
                push: latestConsent.consent.push || false,
                all_required_accepted: user.ProfileAidant.all_required_accepted,
                has_mandatory_consents: latestConsent.consent.cgv && latestConsent.consent.privacy_policy && latestConsent.consent.age_18,
                created_at: latestConsent.created_at
            }
        };
    } catch (error) {
        console.error('Error getting GDPR preferences:', error);
        throw error;
    }
};

/**
 * Update GDPR preferences for a user (Aidant)
 */// historique sa ton
// const updateGdprPreferences = async (userId, preferences, source = 'web') => {
//   try {
//     // Get user's ProfileAidant
//     const user = await User.findByPk(userId, {
//       include: [{
//         model: ProfileAidant,
//         as: 'ProfileAidant'
//       }]
//     });

//     if (!user || !user.ProfileAidant) {
//       return {
//         success: false,
//         message: 'Profile introuvable'
//       };
//     }

//     const profileId = user.ProfileAidant.id;

//     // Determine entity_type based on profile_type_id
//     const entityType = user.ProfileAidant.profile_type_id === 1 ? 'aidant' : 'aidant_pro';

//     // Calculate if all required consents are accepted
//     const allRequiredAccepted = preferences.cgv && preferences.privacy_policy && preferences.age_18;

//     // Warning if user is removing mandatory consents
//     let warning = null;
//     if (!allRequiredAccepted && user.ProfileAidant.all_required_accepted) {
//       warning = "Attention : En retirant un consentement obligatoire, votre profil ne sera plus visible dans les recherches.";
//     }

//     // Mark old consents as inactive
//     await GdprConsent.update(
//       { status: false },
//       {
//         where: {
//           entity_id: profileId,
//           entity_type: entityType
//         }
//       }
//     );

//     // Create new consent record
//     await GdprConsent.create({
//       entity_id: profileId,
//       entity_type: entityType,
//       consent: {
//         cgv: preferences.cgv,
//         privacy_policy: preferences.privacy_policy,
//         age_18: preferences.age_18,
//         newsletter: preferences.newsletter || false,
//         push: preferences.push || false
//       },
//       source: source,
//       status: true
//     });

//     // Update ProfileAidant's all_required_accepted
//     await user.ProfileAidant.update({
//       all_required_accepted: allRequiredAccepted
//     });

//     return {
//       success: true,
//       message: 'Préférences mises à jour avec succès',
//       preferences: {
//         cgv: preferences.cgv,
//         privacy_policy: preferences.privacy_policy,
//         age_18: preferences.age_18,
//         newsletter: preferences.newsletter || false,
//         push: preferences.push || false,
//         all_required_accepted: allRequiredAccepted
//       },
//       warning: warning
//     };
//   } catch (error) {
//     console.error('Error updating GDPR preferences:', error);
//     throw error;
//   }
// };

/**
 * Update GDPR preferences for a user (Aidant)
 */
const updateGdprPreferences = async (userId, preferences, source = 'web') => {
    console.log("preferences" , preferences)
    try {
        // Get user's ProfileAidant
        const user = await User.findByPk(userId, {
            include: [{
                model: ProfileAidant,
                as: 'ProfileAidant'
            }]
        });

        if (!user || !user.ProfileAidant) {
            return {
                success: false,
                message: 'Profile introuvable'
            };
        }
        const profileId = user.ProfileAidant.id;

        // Determine entity_type based on profile_type_id
        const entityType = user.ProfileAidant.profile_type_id === 1 ? 'aidant' : 'aidant_pro';

        // Calculate if all required consents are accepted
        const allRequiredAccepted = preferences.cgv && preferences.privacy_policy && preferences.age_18;

        // Warning if user is removing mandatory consents
        let warning = null;
        if (!allRequiredAccepted && user.ProfileAidant.all_required_accepted) {
            warning = "Attention : En retirant un consentement obligatoire, votre profil ne sera plus visible dans les recherches.";
        }

        //  Find existing consent record
        const existingConsent = await GdprConsent.findOne({
            where: {
                entity_id: profileId,
                entity_type: entityType,
                status: true
            }
        });
        console.log("existing consent" , existingConsent);

        if (existingConsent) {
            const oldConsent = { ...existingConsent.dataValues.consent };
            // UPDATE existing record
            const gdprConsent = await existingConsent.update({
                consent: {
                    cgv: preferences.cgv,
                    privacy_policy: preferences.privacy_policy,
                    age_18: preferences.age_18,
                    newsletter: preferences.newsletter || false,
                    push: preferences.push || false
                },
                source: source
                // updated_at is automatically updated by Sequelize
            });

            console.log("existingConsent", existingConsent)
            console.log("preferences", preferences);

            if(oldConsent.cgv!==preferences.cgv)
                await GdprConsentHistory.createConsentHistory(profileId, entityType,existingConsent.dataValues.consent_id, "cgv", oldConsent.cgv, preferences.cgv, source);

            if(oldConsent.privacy_policy!== preferences.privacy_policy)
            await GdprConsentHistory.createConsentHistory(profileId, entityType,existingConsent.dataValues.consent_id,"privacy_policy", oldConsent.privacy_policy, preferences.privacy_policy, source);

            if(oldConsent.age_18!== preferences.age_18)
            await GdprConsentHistory.createConsentHistory(profileId, entityType,existingConsent.dataValues.consent_id, "age_18", oldConsent.age_18, preferences.age_18, source);

            if(oldConsent.newsletter!== preferences.newsletter)
            await GdprConsentHistory.createConsentHistory(profileId, entityType,existingConsent.dataValues.consent_id, "newsletter", oldConsent.newsletter, preferences.newsletter, source);

            if(oldConsent.push!== preferences.push)
            await GdprConsentHistory.createConsentHistory(profileId, entityType,existingConsent.dataValues.consent_id,"push", oldConsent.push, preferences.push, source);
        } else {
            // Create new record if none exists (first time only)
            const gdprConsent = await GdprConsent.create({
                entity_id: profileId,
                entity_type: entityType,
                consent: {
                    cgv: preferences.cgv,
                    privacy_policy: preferences.privacy_policy,
                    age_18: preferences.age_18,
                    newsletter: preferences.newsletter || false,
                    push: preferences.push || false
                },
                source: source,
                status: true,

            });
            const consentId =gdprConsent.dataValues.consent_id;

            await GdprConsentHistory.createConsentHistory(profileId, entityType, consentId, "cgv", false, preferences.cgv, source);
            await GdprConsentHistory.createConsentHistory(profileId, entityType, consentId,"privacy_policy", false, preferences.privacy_policy, source);
            await GdprConsentHistory.createConsentHistory(profileId, entityType, consentId,"age_18", false, preferences.age_18, source);
            await GdprConsentHistory.createConsentHistory(profileId, entityType, consentId,"newsletter", false, preferences.newsletter, source);
            await GdprConsentHistory.createConsentHistory(profileId, entityType, consentId,"push", false, preferences.push, source);
        }

        // Update ProfileAidant's all_required_accepted
        await user.ProfileAidant.update({
            all_required_accepted: allRequiredAccepted
        });

        return {
            success: true,
            message: 'Préférences mises à jour avec succès',
            preferences: {
                cgv: preferences.cgv,
                privacy_policy: preferences.privacy_policy,
                age_18: preferences.age_18,
                newsletter: preferences.newsletter || false,
                push: preferences.push || false,
                all_required_accepted: allRequiredAccepted,
                updated_at: new Date()
            },
            warning: warning
        };
    } catch (error) {
        console.error('Error updating GDPR preferences:', error);
        throw error;
    }
};


/** TIMESTMAPS SA
 * Update GDPR preferences for a user (Aidant)
 */
// const updateGdprPreferences = async (userId, preferences, source = 'web') => {
//   try {
//     // Get user's ProfileAidant
//     const user = await User.findByPk(userId, {
//       include: [{
//         model: ProfileAidant,
//         as: 'ProfileAidant'
//       }]
//     });

//     if (!user || !user.ProfileAidant) {
//       return {
//         success: false,
//         message: 'Profile introuvable'
//       };
//     }

//     const profileId = user.ProfileAidant.id;

//     // Determine entity_type based on profile_type_id
//     const entityType = user.ProfileAidant.profile_type_id === 1 ? 'aidant' : 'aidant_pro';

//     // Calculate if all required consents are accepted
//     const allRequiredAccepted = preferences.cgv && preferences.privacy_policy && preferences.age_18;

//     // Warning if user is removing mandatory consents
//     let warning = null;
//     if (!allRequiredAccepted && user.ProfileAidant.all_required_accepted) {
//       warning = "Attention : En retirant un consentement obligatoire, votre profil ne sera plus visible dans les recherches.";
//     }

//     // ✅ Find existing consent record
//     const existingConsent = await GdprConsent.findOne({
//       where: {
//         entity_id: profileId,
//         entity_type: entityType,
//         status: true
//       }
//     });

//     // ✅ Create timestamp
//     const timestamp = new Date().toISOString();

//     // ✅ Build consent object with timestamps (like during registration)
//     const consentData = {
//       cgv: {
//         status: preferences.cgv,
//         timestamp: preferences.cgv ? timestamp : null
//       },
//       privacy_policy: {
//         status: preferences.privacy_policy,
//         timestamp: preferences.privacy_policy ? timestamp : null
//       },
//       age_18: {
//         status: preferences.age_18,
//         timestamp: preferences.age_18 ? timestamp : null
//       },
//       newsletter: {
//         status: preferences.newsletter || false,
//         timestamp: (preferences.newsletter || false) ? timestamp : null
//       },
//       push: {
//         status: preferences.push || false,
//         timestamp: (preferences.push || false) ? timestamp : null
//       }
//     };

//     if (existingConsent) {
//       // ✅ UPDATE existing record with timestamps
//       await existingConsent.update({
//         consent: consentData,
//         source: source
//         // updated_at is automatically updated by Sequelize
//       });
//     } else {
//       // ✅ Create new record if none exists (first time only)
//       await GdprConsent.create({
//         entity_id: profileId,
//         entity_type: entityType,
//         consent: consentData,
//         source: source,
//         status: true
//       });
//     }

//     // Update ProfileAidant's all_required_accepted
//     await user.ProfileAidant.update({
//       all_required_accepted: allRequiredAccepted
//     });

//     return {
//       success: true,
//       message: 'Préférences mises à jour avec succès',
//       preferences: {
//         cgv: preferences.cgv,
//         privacy_policy: preferences.privacy_policy,
//         age_18: preferences.age_18,
//         newsletter: preferences.newsletter || false,
//         push: preferences.push || false,
//         all_required_accepted: allRequiredAccepted,
//         updated_at: timestamp
//       },
//       warning: warning
//     };
//   } catch (error) {
//     console.error('Error updating GDPR preferences:', error);
//     throw error;
//   }
// };

/**
 * Get GDPR consent history for a user
 */
const getGdprHistory = async (userId) => {
    try {
        // Get user's ProfileAidant
        const user = await User.findByPk(userId, {
            include: [{
                model: ProfileAidant,
                as: 'ProfileAidant'
            }]
        });

        if (!user || !user.ProfileAidant) {
            return {
                success: false,
                message: 'Profile introuvable'
            };
        }

        const profileId = user.ProfileAidant.id;

        // Determine entity_type based on profile_type_id
        const entityType = user.ProfileAidant.profile_type_id === 1 ? 'aidant' : 'aidant_pro';

        // Get all consent records (active and inactive) ordered by date
        const history = await GdprConsent.findAll({
            where: {
                entity_id: profileId,
                entity_type: entityType
            },
            order: [['created_at', 'DESC']],
            attributes: ['id', 'consent', 'source', 'status', 'created_at']
        });

        const formattedHistory = history.map(record => ({
            consent_id: record.id,
            cgv: record.consent.cgv,
            privacy_policy: record.consent.privacy_policy,
            age_18: record.consent.age_18,
            newsletter: record.consent.newsletter || false,
            push: record.consent.push || false,
            all_required_accepted: record.consent.cgv && record.consent.privacy_policy && record.consent.age_18,
            source: record.source,
            created_at: record.created_at
        }));

        return {
            success: true,
            history: formattedHistory
        };
    } catch (error) {
        console.error('Error getting GDPR history:', error);
        throw error;
    }
};

module.exports = {
    getGdprPreferences,
    updateGdprPreferences,
    getGdprHistory
};