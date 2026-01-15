const aideConsentService = require('../services/aideConsent.service');

/**
 * Get consent status map
 * GET /api/aide/consent-map
 * Returns: { "email@example.com": true/false }
 */
const getConsentMap = async (req, res) => {
  try {
    const aidantId = req.user.id;

    const result = await aideConsentService.getAideConsentMap(aidantId);

    res.status(200).json(result.data); // Return map directly
  } catch (error) {
    console.error('Error getting consent map:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération du statut des consentements'
    });
  }
};

/**
 * Get all Aides with consent status
 * GET /api/aide/with-consent
 * Returns array with hasAcceptedConsent field
 */
const getAllAidesWithConsent = async (req, res) => {
  try {
    const aidantId = req.user.id;

    const result = await aideConsentService.getAllAidesWithConsent(aidantId);

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error getting Aides with consent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des Aidés'
    });
  }
};

module.exports = {
  getConsentMap,
  getAllAidesWithConsent
};