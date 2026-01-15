const crypto = require('crypto');
const { ProfileAide, GdprAide, User, GdprConsent, ProfileAidant, ProfileAidantPro } = require('../models');
const { Op } = require('sequelize');
const { sendAideConsentRequestEmail, sendAidantConsentConfirmationEmail, sendAidantConsentRejectionEmail } = require('../utils/mail');

/**
 * Request consent from Aidé
 * UPDATED: Pro accounts with signed contracts create ProfileAide directly
 */
const requestAideConsent = async (aidantId, emailAide) => {
  try {
    // Get Aidant FIRST to check profile type
    const aidant = await User.findByPk(aidantId, {
      include: [{ model: ProfileAidant, as: 'ProfileAidant' }]
    });

    if (!aidant || !aidant.ProfileAidant) {
      return {
        success: false,
        message: 'Aidant introuvable'
      };
    }

    const isPro = aidant.ProfileAidant.profile_type_id === 2;

    // Check if Pro has signed contract
    if (isPro) {
      const aidantPro = await ProfileAidantPro.findOne({
        where: { aidant_id: aidant.ProfileAidant.id }
      });

      if (!aidantPro || !aidantPro.contract_signed) {
        return {
          success: false,
          message: 'Vous devez signer le contrat avant de créer des Aidé(e)s',
          error_code: 'CONTRACT_NOT_SIGNED'
        };
      }
    }

    // Check if email exists in ProfileAides (already accepted)
    const existingProfileAide = await ProfileAide.findOne({
      where: { email: emailAide }
    });

    if (existingProfileAide) {
      return {
        success: false,
        message: 'Cette adresse email est déjà utilisée comme Aidé(e)',
        error_code: 'PROFILE_EXISTS'
      };
    }

    // =====================================================
    // PRO ACCOUNT with signed contract: Create ProfileAide directly
    // =====================================================
    if (isPro) {
      // Generate profile number
      const lastAide = await ProfileAide.findOne({
        order: [['id', 'DESC']]
      });
      const profileNumber = `AID-${(lastAide?.id || 0) + 1}`;

      // Create ProfileAide directly
      const profileAide = await ProfileAide.create({
        aidant_id: aidantId,
        email: emailAide,
        active: true,
        profile_number: profileNumber,
        name: emailAide,
        is_suspended: false
      });

      // Create auto-accepted GdprConsent
      const timestamp = new Date().toISOString();
      const autoConsent = {
        cgv: { status: true, timestamp },
        privacy_policy: { status: true, timestamp },
        age_18: { status: true, timestamp },
        newsletter: { status: false, timestamp: null }
      };

      await GdprConsent.create({
        entity_id: profileAide.id,
        entity_type: 'aide',
        consent: autoConsent,
        source: 'auto_pro',
        status: true
      });

      // Create GdprAide record linking to ProfileAide (for tracking)
      await GdprAide.create({
        aidant_id: aidantId,
        profile_aide_id: profileAide.id,
        email_aide: emailAide,
        consent_token: null,
        consent: autoConsent
      });

      return {
        success: true,
        message: 'Aidé(e) créé(e) avec succès',
        data: {
          id: profileAide.id,
          email_aide: emailAide,
          direct_creation: true,
          profile_number: profileNumber
        }
      };
    }

    // =====================================================
    // PARTICULIER ACCOUNT: Go through consent flow
    // =====================================================

    // Check if email exists in GdprAides (pending)
    const existingGdprAide = await GdprAide.findOne({
      where: {
        email_aide: emailAide,
        aidant_id: aidantId
      }
    });

    if (existingGdprAide) {
      return {
        success: false,
        message: 'Une demande de consentement a déjà été envoyée à cette adresse email',
        error_code: 'PENDING_CONSENT',
        existing_request_id: existingGdprAide.id
      };
    }

    // Check 3 Aide limit for Particulier (active + pending)
    const activeCount = await ProfileAide.count({
      where: { aidant_id: aidantId }
    });

    const pendingCount = await GdprAide.count({
      where: { 
        aidant_id: aidantId,
        profile_aide_id: null
      }
    });

    const totalCount = activeCount + pendingCount;

    if (totalCount >= 3) {
      return {
        success: false,
        message: `Vous avez atteint la limite de 3 Aidé(e)s (${activeCount} actif${activeCount > 1 ? 's' : ''} + ${pendingCount} en attente). Veuillez supprimer un aidé existant avant d'en ajouter un nouveau.`
      };
    }

    // Generate token
    const consentToken = crypto.randomBytes(32).toString('hex');

    // Create GdprAide (no ProfileAide yet)
    const gdprAide = await GdprAide.create({
      aidant_id: aidantId,
      profile_aide_id: null,
      email_aide: emailAide,
      consent_token: consentToken,
      consent: null
    });

    // Send email
    await sendAideConsentRequestEmail(
      emailAide,
      aidant.first_name,
      aidant.last_name,
      consentToken
    );

    return {
      success: true,
      message: 'Demande de consentement envoyée avec succès',
      data: {
        id: gdprAide.id,
        email_aide: emailAide,
        consent: null
      }
    };
  } catch (error) {
    console.error('Error requesting aide consent:', error);
    throw error;
  }
};

/**
 * Resend consent request (delete old, create new)
 */
const resendConsentRequest = async (aidantId, emailAide, oldRequestId) => {
  try {
    // Hard delete old request
    await GdprAide.destroy({
      where: {
        id: oldRequestId,
        aidant_id: aidantId
      }
    });

    // Create new request
    return await requestAideConsent(aidantId, emailAide);
  } catch (error) {
    console.error('Error resending consent request:', error);
    throw error;
  }
};

/**
 * Get consent request by token
 */
const getConsentRequestByToken = async (token) => {
  try {
    const consentRequest = await GdprAide.findOne({
      where: { consent_token: token },
      include: [
        {
          model: User,
          as: 'Aidant',
          attributes: ['first_name', 'last_name', 'email']
        }
      ]
    });

    // Record not found (deleted or invalid token)
    if (!consentRequest) {
      return {
        success: false,
        message: 'Demande introuvable ou expirée',
        status_type: 'not_found'
      };
    }

    // Check if already processed (has consent)
    if (consentRequest.consent !== null) {
      const wasAccepted = consentRequest.consent.cgv?.status === true;
      
      return {
        success: false,
        message: wasAccepted 
          ? 'Ce consentement a déjà été accepté' 
          : 'Ce consentement a déjà été traité',
        status_type: wasAccepted ? 'accepted' : 'processed'
      };
    }

    // Valid pending request
    return {
      success: true,
      data: {
        id: consentRequest.id,
        email_aide: consentRequest.email_aide,
        aidant: {
          first_name: consentRequest.Aidant.first_name,
          last_name: consentRequest.Aidant.last_name
        },
        created_at: consentRequest.created_at
      }
    };
  } catch (error) {
    console.error('Error getting consent request:', error);
    throw error;
  }
};

/**
 * Accept consent
 * UPDATED: Only updates GdprAide and creates GdprConsent
 * Does NOT create ProfileAide (created later in registration flow)
 */
const acceptConsent = async (token, gdprConsents) => {
  try {
    if (!gdprConsents.cgv || !gdprConsents.privacy_policy || !gdprConsents.age_18) {
      return {
        success: false,
        message: 'Les consentements obligatoires doivent être acceptés'
      };
    }

    const consentRequest = await GdprAide.findOne({
      where: { consent_token: token },
      include: [
        {
          model: User,
          as: 'Aidant',
          attributes: ['first_name', 'last_name', 'email']
        }
      ]
    });

    if (!consentRequest) {
      return {
        success: false,
        message: 'Demande de consentement introuvable ou expirée'
      };
    }

    if (consentRequest.consent !== null) {
      return {
        success: false,
        message: 'Cette demande a déjà été acceptée'
      };
    }

    const timestamp = new Date().toISOString();
    const consentData = {
      cgv: {
        status: gdprConsents.cgv,
        timestamp: gdprConsents.cgv ? timestamp : null
      },
      privacy_policy: {
        status: gdprConsents.privacy_policy,
        timestamp: gdprConsents.privacy_policy ? timestamp : null
      },
      age_18: {
        status: gdprConsents.age_18,
        timestamp: gdprConsents.age_18 ? timestamp : null
      },
      newsletter: {
        status: gdprConsents.newsletter || false,
        timestamp: gdprConsents.newsletter ? timestamp : null
      }
    };

    // Update GdprAide with consent data
    // profile_aide_id stays NULL (ProfileAide created later)
    await consentRequest.update({
      consent: consentData
    });

    // Create GdprConsent record
    // Use GdprAide.id as entity_id since ProfileAide doesn't exist yet
    await GdprConsent.create({
      entity_id: consentRequest.id,
      entity_type: 'aide_pending',
      consent: consentData,
      source: 'web',
      status: true
    });

    // Send confirmation to Aidant
    await sendAidantConsentConfirmationEmail(
      consentRequest.Aidant.email,
      consentRequest.Aidant.first_name,
      consentRequest.email_aide
    );

    return {
      success: true,
      message: 'Consentement accepté avec succès',
      data: {
        gdpr_aide_id: consentRequest.id,
        email: consentRequest.email_aide
      }
    };
  } catch (error) {
    console.error('Error accepting consent:', error);
    throw error;
  }
};

/**
 * Reject consent
 * Hard deletes the GdprAide record
 */
const rejectConsent = async (token) => {
  try {
    const consentRequest = await GdprAide.findOne({
      where: { consent_token: token },
      include: [
        {
          model: User,
          as: 'Aidant',
          attributes: ['first_name', 'last_name', 'email']
        }
      ]
    });

    if (!consentRequest) {
      return {
        success: false,
        message: 'Demande de consentement introuvable'
      };
    }

    const aidantEmail = consentRequest.Aidant.email;
    const aidantFirstName = consentRequest.Aidant.first_name;
    const emailAide = consentRequest.email_aide;

    // Hard delete
    await consentRequest.destroy();

    // Send rejection email
    await sendAidantConsentRejectionEmail(
      aidantEmail,
      aidantFirstName,
      emailAide
    );

    return {
      success: true,
      message: 'Consentement refusé'
    };
  } catch (error) {
    console.error('Error rejecting consent:', error);
    throw error;
  }
};

/**
 * Get all consent requests for an Aidant
 */
const getAidantConsentRequests = async (aidantId) => {
  try {
    const requests = await GdprAide.findAll({
      where: { aidant_id: aidantId },
      include: [
        {
          model: ProfileAide,
          as: 'ProfileAide',
          required: false,
          attributes: ['id', 'email', 'active', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return {
      success: true,
      data: requests
    };
  } catch (error) {
    console.error('Error getting aidant consent requests:', error);
    throw error;
  }
};

/**
 * Check if Aidant has reached the maximum number of Aides (pending + active)
 * Particuliers (profile_type_id = 1) can have max 3 Aides total
 * Pros (profile_type_id = 2) have no limit
 */
const checkAidantAideLimit = async (aidantId, transaction = null) => {
  const aidant = await ProfileAidant.findByPk(aidantId, { transaction });
  
  if (!aidant) {
    throw new Error('Aidant not found');
  }
  
  // Only Particuliers have a limit
  if (aidant.profile_type_id !== 1) {
    return { canAdd: true, currentCount: 0, limit: null };
  }
  
  // Count active ProfileAides
  const activeCount = await ProfileAide.count({
    where: { aidant_id: aidantId },
    transaction
  });
  
  // Count pending GdprAides (consent not yet completed)
  const pendingCount = await GdprAide.count({
    where: { 
      aidant_id: aidantId,
      profile_aide_id: null
    },
    transaction
  });
  
  const totalCount = activeCount + pendingCount;
  const limit = 3;
  const canAdd = totalCount < limit;
  
  return { 
    canAdd, 
    currentCount: totalCount, 
    limit,
    activeCount,
    pendingCount
  };
};

/**
 * Convert all pending GdprAides to active ProfileAides for a specific Pro Aidant
 * (After they sign the contract)
 * NEW FUNCTION - Fixes existing pending Aidés
 */
const convertPendingAidesToActive = async (aidantId) => {
  try {
    // Verify this is a Pro account with signed contract
    const aidant = await User.findByPk(aidantId, {
      include: [{ model: ProfileAidant, as: 'ProfileAidant' }]
    });

    if (!aidant || !aidant.ProfileAidant) {
      return {
        success: false,
        message: 'Aidant introuvable'
      };
    }

    if (aidant.ProfileAidant.profile_type_id !== 2) {
      return {
        success: false,
        message: 'Cette fonction est uniquement disponible pour les comptes Pro'
      };
    }

    const aidantPro = await ProfileAidantPro.findOne({
      where: { aidant_id: aidant.ProfileAidant.id }
    });

    if (!aidantPro || !aidantPro.contract_signed) {
      return {
        success: false,
        message: 'Le contrat doit être signé avant de convertir les Aidé(e)s'
      };
    }

    // FIXED: Use aidantId (user_id) directly, not ProfileAidant.id
    const pendingAides = await GdprAide.findAll({
      where: {
        aidant_id: aidantId, // ← FIXED: Use user_id
        profile_aide_id: null
        // REMOVED: consent check - Pro accounts might not have consent
      }
    });

    if (pendingAides.length === 0) {
      return {
        success: true,
        message: 'Aucun Aidé(e) en attente à convertir',
        converted: 0,
        data: []
      };
    }

    const results = [];

    for (const gdprAide of pendingAides) {
      try {
        // Check if email already exists in ProfileAides
        const existingProfileAide = await ProfileAide.findOne({
          where: { email: gdprAide.email_aide }
        });

        if (existingProfileAide) {
          console.log(`Email ${gdprAide.email_aide} already exists, skipping...`);
          continue;
        }

        // Generate profile number
        const lastAide = await ProfileAide.findOne({
          order: [['id', 'DESC']]
        });
        const profileNumber = `AID-${(lastAide?.id || 0) + 1}`;

        // Create ProfileAide - use ProfileAidant.id for aidant_id
        const profileAide = await ProfileAide.create({
          aidant_id: aidant.ProfileAidant.id, // ← Use ProfileAidant.id here
          email: gdprAide.email_aide,
          active: true,
          profile_number: profileNumber,
          name: gdprAide.email_aide,
          is_suspended: false
        });

        // Link GdprAide to ProfileAide
        await gdprAide.update({
          profile_aide_id: profileAide.id
        });

        // Create GdprConsent - handle null consent
        const timestamp = new Date().toISOString();
        const consentData = gdprAide.consent || {
          cgv: { status: true, timestamp },
          privacy_policy: { status: true, timestamp },
          age_18: { status: true, timestamp },
          newsletter: { status: false, timestamp: null }
        };

        await GdprConsent.create({
          entity_id: profileAide.id,
          entity_type: 'aide',
          consent: consentData,
          source: 'converted_after_contract',
          status: true
        });

        results.push({
          email: gdprAide.email_aide,
          profile_aide_id: profileAide.id,
          profile_number: profileNumber
        });

        console.log(`✅ Converted ${gdprAide.email_aide} → ProfileAide ID ${profileAide.id}`);
      } catch (error) {
        console.error(`❌ Error converting GdprAide ID ${gdprAide.id}:`, error.message);
      }
    }

    return {
      success: true,
      message: `${results.length} Aidé(e)s converti(e)s avec succès`,
      converted: results.length,
      data: results
    };
  } catch (error) {
    console.error('Error converting pending aides:', error);
    throw error;
  }
};

module.exports = {
  requestAideConsent,
  resendConsentRequest,
  getConsentRequestByToken,
  acceptConsent,
  rejectConsent,
  getAidantConsentRequests,
  checkAidantAideLimit,
  convertPendingAidesToActive // NEW - Add this
};