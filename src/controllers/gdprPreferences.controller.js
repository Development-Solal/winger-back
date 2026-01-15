const gdprPreferencesService = require('../services/gdprPreferences.service');

/**
 * Get current GDPR preferences for logged-in user
 * GET /api/gdpr/preferences
 */
const getMyPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await gdprPreferencesService.getGdprPreferences(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getGdprPreferences controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des préférences'
    });
  }
};

/**
 * Update GDPR preferences for logged-in user
 * PUT /api/gdpr/preferences
 */
const updateMyPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cgv, privacy_policy, age_18, newsletter, push, source } = req.body;

    // Validate that at least the mandatory fields are provided
    if (cgv === undefined || privacy_policy === undefined || age_18 === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Les consentements obligatoires (CGV, Politique de confidentialité, 18+) doivent être fournis'
      });
    }

    const preferences = {
      cgv,
      privacy_policy,
      age_18,
      newsletter: newsletter || false,
      push: push || false
    };

    const result = await gdprPreferencesService.updateGdprPreferences(
      userId,
      preferences,
      source || 'web'
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateGdprPreferences controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour des préférences'
    });
  }
};

/**
 * Get GDPR consent history for logged-in user
 * GET /api/gdpr/history
 */
const getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await gdprPreferencesService.getGdprHistory(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getGdprHistory controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'historique'
    });
  }
};

/**
 * Export newsletter subscribers (ADMIN ONLY)
 * GET /api/gdpr/export/newsletter
 */
const { GdprConsent, ProfileAidant, ProfileAide, User, GdprAide } = require('../models'); 
const { Op } = require('sequelize');

const exportNewsletterSubscribers = async (req, res) => {
  try {
    const subscribers = [];

    //Get Aidants who accepted newsletter
    const aidantConsents = await GdprConsent.findAll({
      where: {
        entity_type: {
          [Op.in]: ['aidant', 'aidant_pro']
        },
        'consent.newsletter.status': true
      },
      include: [
        {
          model: ProfileAidant,
          as: 'ProfileAidant',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['email', 'first_name', 'last_name']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Process Aidants
    aidantConsents.forEach(consent => {
      if (consent.ProfileAidant && consent.ProfileAidant.User) {
        const profileType = consent.entity_type === 'aidant' 
          ? 'Aidant Particulier' 
          : 'Aidant Professionnel';
        
        subscribers.push({
          profile_type: profileType,
          email: consent.ProfileAidant.User.email,
          name: `${consent.ProfileAidant.User.first_name} ${consent.ProfileAidant.User.last_name}`,
          accepted_at: consent.consent.newsletter.timestamp,
          entity_id: consent.entity_id,
          source: consent.source
        });
      }
    });

   // Get Aides who accepted newsletter
    const aideConsents = await GdprConsent.findAll({
      where: {
        entity_type: 'aide',
        'consent.newsletter.status': true
      },
      include: [
        {
          model: ProfileAide,
          as: 'ProfileAide',
          attributes: ['id', 'email', 'name'],
          required: true
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Get all ProfileAide IDs
    const profileAideIds = aideConsents
      .filter(c => c.ProfileAide)
      .map(c => c.ProfileAide.id);

    //  Fetch GdprAide emails separately
    let emailMap = {};
    if (profileAideIds.length > 0) {
      const gdprAides = await GdprAide.findAll({
        where: {
          profile_aide_id: {
            [Op.in]: profileAideIds
          }
        },
        attributes: ['profile_aide_id', 'email_aide']
      });

      //  Create a map of profile_aide_id -> email_aide
      gdprAides.forEach(ga => {
        emailMap[ga.profile_aide_id] = ga.email_aide;
      });
    }

    // Process Aides
    aideConsents.forEach(consent => {
      if (consent.ProfileAide) {
        // Get email from ProfileAide or from GdprAide via map
        const email = consent.ProfileAide.email || 
                      emailMap[consent.ProfileAide.id] ||
                      'Email non renseigné';

        subscribers.push({
          profile_type: 'Aidé',
          email: email,
          name: consent.ProfileAide.name || 'Non renseigné',
          accepted_at: consent.consent.newsletter.timestamp,
          entity_id: consent.entity_id,
          source: consent.source
        });
      }
    });

    res.status(200).json({
      success: true,
      message: `${subscribers.length} abonné(s) à la newsletter`,
      data: subscribers
    });
  } catch (error) {
    console.error('Error exporting newsletter subscribers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'export des abonnés'
    });
  }
};

module.exports = {
  getMyPreferences,
  updateMyPreferences,
  getMyHistory,
  exportNewsletterSubscribers,
};