const { ProfileAide, GdprAide, ProfileAidant, GdprConsent} = require('../models');
const {Sequelize} = require("sequelize");

/**
 * Get consent status map for Aidant's Aides
 * Returns: { "email@example.com": true/false }
 * true = consent accepted (ProfileAide exists)
 * false = consent pending (only GdprAide exists)
 */
const getAideConsentMap = async (aidantId) => {
  try {
    const consentMap = {};

    // 1. Get all ProfileAides (accepted consent)
    const activeAides = await ProfileAide.findAll({
      where: { aidant_id: aidantId },
      attributes: ['email']
    });

    // Mark all active Aides as true
    activeAides.forEach(aide => {
      consentMap[aide.email] = true;
    });

    // 2. Get all pending GdprAides (no ProfileAide yet)
    const pendingConsents = await GdprAide.findAll({
      where: {
        // aidant_id: aidantId,
        aidant_id: aidant.id,
        profile_aide_id: null // No ProfileAide = pending
      },
      attributes: ['email_aide']
    });

    // Mark all pending as false
    pendingConsents.forEach(gdprAide => {
      consentMap[gdprAide.email_aide] = false;
    });

    return {
      success: true,
      data: consentMap
    };
  } catch (error) {
    console.error('Error getting consent map:', error);
    throw error;
  }
};

/**
 * Get all Aides with their emails
 * Returns list of Aides with email and consent status
 */
const getAllAidesWithConsent = async (aidantId) => {
  try {
    const aides = [];

    const aidant = await ProfileAidant.findOne({
      where: {user_id: aidantId}
    });

    if (!aidant) {
      throw new Error('Aidant not found');
    }

    const allAides = await ProfileAide.findAll({
      where: {aidant_id: aidant.id},
      attributes: ["id", "profile_number", "name", "active", "is_suspended"],
      order: [["id", "ASC"]],
    });


    for (const aide of allAides) {
      const existingConsent = await GdprConsent.findOne({
        where: {
          entity_id: aide.id,
          entity_type: "aide",
          status: true
        }
      });
      const consent = existingConsent?.dataValues?.consent;
      console.log("consent", consent);
      const hasAcceptedConsent=  consent?.cgv.status && consent?.privacy_policy.status && consent?.age_18.status;
      aides.push({
        id: aide.id,
        gdpr_aide_id:null,
        email: aide.name,
        hasAcceptedConsent: hasAcceptedConsent,
        profile_number: aide.profile_number,
        is_suspended:aide.is_suspended
      })
    }
    const aideIds = aides.map(aide => aide.id);

    const gdprAides = await GdprAide.findAll({
      where: {
        aidant_id: aidantId,
        [Sequelize.Op.or]: [
          {
            profile_aide_id: {
              [Sequelize.Op.notIn]: aideIds
            }
          },
          {
            profile_aide_id: null
          }
        ]
      },
      order: [['created_at', 'DESC']]
    });
    console.log("gdprAides" , gdprAides);

    gdprAides.forEach(gdprAide => {
     const hasAccepted=   gdprAide?.consent?.cgv.status && gdprAide?.consent?.privacy_policy && gdprAide?.consent?.age_18

      aides.push({
        id: null,
        gdpr_aide_id: gdprAide.id,
        email: gdprAide.email_aide,
        hasAcceptedConsent: hasAccepted,
        profile_number: null,
        is_suspended:false
      });
    });

    return {
      success: true,
      data: aides
    };
  } catch (error) {
    console.error('Error getting Aides with consent:', error);
    throw error;
  }
};

module.exports = {
  getAideConsentMap,
  getAllAidesWithConsent
};