const gdprAideService = require('../services/gdprAideService');

/**
 * Aidant requests consent from Aidé
 * POST /api/gdpr-aide/request-consent
 */
const requestAideConsent = async (req, res) => {
  try {
    const aidantId = req.user.id;
    const { email_aide } = req.body;

    if (!email_aide) {
      return res.status(400).json({
        success: false,
        message: "L'email de l'Aidé(e) est requis",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_aide)) {
      return res.status(400).json({
        success: false,
        message: "Format d'email invalide",
      });
    }

    const result = await gdprAideService.requestAideConsent(aidantId, email_aide);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error_code: result.error_code,
        existing_request_id: result.existing_request_id
      });
    }

    res.status(200).json({
      success: true,
      message: result.message || "Demande de consentement envoyée avec succès",
      data: result.data,
    });
  } catch (error) {
    console.error('Error requesting aide consent:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'envoi de la demande de consentement",
    });
  }
};

/**
 * Resend consent request (delete old, create new)
 * POST /api/gdpr-aide/resend-consent
 */
const resendConsentRequest = async (req, res) => {
  try {
    const aidantId = req.user.id;
    const { email_aide, old_request_id } = req.body;

    if (!email_aide || !old_request_id) {
      return res.status(400).json({
        success: false,
        message: "Email et ID de la demande précédente requis",
      });
    }

    const result = await gdprAideService.resendConsentRequest(aidantId, email_aide, old_request_id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Nouvelle demande de consentement envoyée avec succès",
      data: result.data,
    });
  } catch (error) {
    console.error('Error resending consent request:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du renvoi de la demande",
    });
  }
};

/**
 * Get consent request details by token (for Aidé)
 * GET /api/gdpr-aide/consent/:token
 */
const getConsentRequest = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await gdprAideService.getConsentRequestByToken(token);

    if (!result.success) {
      return res.status(result.already_processed ? 200 : 404).json({
        success: false,
        message: result.message,
        already_processed: result.already_processed || false
      });
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error getting consent request:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération de la demande de consentement",
    });
  }
};

/**
 * Aidé accepts consent
 * POST /api/gdpr-aide/consent/:token/accept
 */
const acceptConsent = async (req, res) => {
  try {
    const { token } = req.params;
    const { cgv, privacy_policy, age_18, newsletter } = req.body;

    if (!cgv || !privacy_policy || !age_18) {
      return res.status(400).json({
        success: false,
        message: "Les consentements obligatoires (CGV, Politique de confidentialité, et confirmation 18+) doivent être acceptés.",
      });
    }

    const gdprConsents = {
      cgv: cgv === true,
      privacy_policy: privacy_policy === true,
      age_18: age_18 === true,
      newsletter: newsletter === true,
    };

    const result = await gdprAideService.acceptConsent(token, gdprConsents);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error accepting consent:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de l'acceptation du consentement",
    });
  }
};

/**
 * Aidé rejects consent
 * POST /api/gdpr-aide/consent/:token/reject
 */
const rejectConsent = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await gdprAideService.rejectConsent(token);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error rejecting consent:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du rejet du consentement",
    });
  }
};

/**
 * Get all consent requests for logged-in Aidant
 * GET /api/gdpr-aide/my-requests
 */
const getMyConsentRequests = async (req, res) => {
  try {
    const aidantId = req.user.id;

    const result = await gdprAideService.getAidantConsentRequests(aidantId);

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error getting consent requests:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des demandes de consentement",
    });
  }
};

/**
 * Convert pending aides to active (for Pro accounts after contract signing)
 * POST /api/gdpr-aide/convert-pending
 * NEW ENDPOINT
 */
const convertPendingToActive = async (req, res) => {
  try {
    const aidantId = req.user.id;

    const result = await gdprAideService.convertPendingAidesToActive(aidantId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error converting pending aides:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la conversion des Aidé(e)s"
    });
  }
};

module.exports = {
  requestAideConsent,
  resendConsentRequest,
  getConsentRequest,
  acceptConsent,
  rejectConsent,
  getMyConsentRequests,
  convertPendingToActive // NEW - Add this
};