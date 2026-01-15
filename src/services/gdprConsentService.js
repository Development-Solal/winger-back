const { GdprConsent, GdprConsentHistory } = require('../models');

class GdprConsentService {
  /**
   * Create GDPR consent record
   */
  async createConsent(entityId, entityType, consentData, source) {
    try {
      // Validate mandatory consents
      if (!consentData.cgv || !consentData.privacy_policy || !consentData.age_18) {
        throw new Error('Mandatory consents (CGV, Privacy Policy, Age 18+) are required');
      }
      // createConsent saves user's consent choices
      const consent = await GdprConsent.createConsent(
        entityId,
        entityType,
        consentData,
        source
      );

      return {
        success: true,
        data: consent
      };
    } catch (error) {
      console.error('Error creating consent:', error);
      throw error;
    }
  }


  async createGdprConsentHistory(entityId, entityType, consent_key, previousValue, newValue, source) {
    try {
      // createConsent saves user's consent choices
      const consent = await GdprConsentHistory.createConsentHistory(
          entityId,
          entityType,
          consent_key,
          previousValue,
          newValue,
          source
      );

      return {
        success: true,
        data: consent
      };
    } catch (error) {
      console.error('Error creating consent history:', error);
      throw error;
    }
  }

  /**
   * Update ALL GDPR preferences (for preferences page - UC-02)
   * This allows updating mandatory AND optional consents
   */
async updatePreferences(entityId, entityType, preferences) {
  try {
    // Get latest consent record
    const latestConsent = await GdprConsent.getLatestConsent(entityId, entityType);

    if (!latestConsent) {
      throw new Error("No consent record found for this user");
    }

    const timestamp = new Date().toISOString();

    // Build consent object with timestamps
    const consent = {
      cgv: {
        status: preferences.cgv === true,
        timestamp: preferences.cgv ? timestamp : null,
      },
      privacy_policy: {
        status: preferences.privacy_policy === true,
        timestamp: preferences.privacy_policy ? timestamp : null,
      },
      age_18: {
        status: preferences.age_18 === true,
        timestamp: preferences.age_18 ? timestamp : null,
      },
      newsletter: {
        status: preferences.newsletter === true,
        timestamp: preferences.newsletter ? timestamp : null,
      },
      push: {
        status: preferences.push === true,
        timestamp: preferences.push ? timestamp : null,
      },
    };


    await latestConsent.update({
      consent: consent
      
    });

    return {
      success: true,
      data: latestConsent
    };
  } catch (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
}

  /**
   * Update optional consents only
   */
  async updateOptionalConsents(entityId, entityType, updates) {
    try {
      const latestConsent = await GdprConsent.getLatestConsent(entityId, entityType);
      
      if (!latestConsent) {
        throw new Error('No consent record found for this user');
      }

      const allowedUpdates = {};
      if (updates.newsletter !== undefined) {
        allowedUpdates.newsletter = updates.newsletter;
      }
      if (updates.push !== undefined) {
        allowedUpdates.push = updates.push;
      }

      const updated = await GdprConsent.updateConsent(
        latestConsent.consent_id,
        allowedUpdates
      );

      return {
        success: true,
        data: updated
      };
    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  }

  /**
   * Get latest GDPR preferences for a user (for preferences page - UC-02)
   */
  async getLatestPreferences(entityId, entityType) {
    try {
      const latestConsent = await GdprConsent.getLatestConsent(entityId, entityType);

      if (!latestConsent) {
        return {
          success: false,
          message: 'No consent record found'
        };
      }

      return {
        success: true,
        data: {
          consent_id: latestConsent.consent_id,
          cgv: latestConsent.consent?.cgv?.status || false,
          privacy_policy: latestConsent.consent?.privacy_policy?.status || false,
          age_18: latestConsent.consent?.age_18?.status || false,
          newsletter: latestConsent.consent?.newsletter?.status || false,
          push: latestConsent.consent?.push?.status || false,
          all_required_accepted: latestConsent.all_required_accepted,
          has_mandatory_consents: latestConsent.all_required_accepted,
          created_at: latestConsent.created_at,
        }
      };
    } catch (error) {
      console.error('Error getting latest preferences:', error);
      throw error;
    }
  }

  /**
   * Get consent report for a user
   */
  async getConsentReport(entityId, entityType) {
    try {
      const consents = await GdprConsent.getConsentReport(entityId, entityType);

      const formattedReport = consents.map(consent => ({
        consent_id: consent.consent_id,
        entity_id: consent.entity_id,
        entity_type: consent.entity_type,
        source: consent.source,
        consents: {
          cgv: {
            status: consent.consent.cgv?.status || false,
            timestamp: consent.consent.cgv?.timestamp || null
          },
          privacy_policy: {
            status: consent.consent.privacy_policy?.status || false,
            timestamp: consent.consent.privacy_policy?.timestamp || null
          },
          age_18: {
            status: consent.consent.age_18?.status || false,
            timestamp: consent.consent.age_18?.timestamp || null
          },
          newsletter: {
            status: consent.consent.newsletter?.status || false,
            timestamp: consent.consent.newsletter?.timestamp || null
          },
          push: {
            status: consent.consent.push?.status || false,
            timestamp: consent.consent.push?.timestamp || null
          }
        },
        all_required_accepted: consent.all_required_accepted,
        created_at: consent.created_at,
        updated_at: consent.updated_at
      }));

      return {
        success: true,
        data: formattedReport
      };
    } catch (error) {
      console.error('Error getting consent report:', error);
      throw error;
    }
  }

  /**
   * Get latest consent for a user
   */
  async getLatestConsent(entityId, entityType) {
    try {
      const consent = await GdprConsent.getLatestConsent(entityId, entityType);
      
      if (!consent) {
        return {
          success: false,
          message: 'No consent record found'
        };
      }

      return {
        success: true,
        data: {
          consent_id: consent.consent_id,
          entity_id: consent.entity_id,
          entity_type: consent.entity_type,
          source: consent.source,
          consents: consent.consent,
          all_required_accepted: consent.all_required_accepted,
          created_at: consent.created_at,
          updated_at: consent.updated_at
        }
      };
    } catch (error) {
      console.error('Error getting latest consent:', error);
      throw error;
    }
  }

  /**
   * Validate if user has given mandatory consents
   */
  async hasMandatoryConsents(entityId, entityType) {
    try {
      const consent = await GdprConsent.getLatestConsent(entityId, entityType);
      
      if (!consent) {
        return false;
      }

      // Use the all_required_accepted column
      return consent.all_required_accepted === true;
    } catch (error) {
      console.error('Error checking mandatory consents:', error);
      return false;
    }
  }

  /**
   * Export all consents for admin (for newsletter export)
   */
  async exportAllConsents(filters = {}) {
    try {
      const whereClause = {};

      if (filters.entityType) {
        whereClause.entity_type = filters.entityType;
      }

      const consents = await GdprConsent.findAll({
        where: whereClause,
        order: [
          ['entity_id', 'ASC'],
          ['created_at', 'DESC'],
        ],
      });

      // Get only latest consent per entity
      const latestConsents = {};
      consents.forEach((consent) => {
        const key = `${consent.entity_id}-${consent.entity_type}`;
        if (!latestConsents[key]) {
          latestConsents[key] = consent;
        }
      });

      // Filter and format
      const results = Object.values(latestConsents)
        .filter((consent) => {
          if (filters.newsletter === true) {
            return consent.consent?.newsletter?.status === true;
          }
          if (filters.allRequiredAccepted === true) {
            return consent.all_required_accepted === true;
          }
          return true;
        })
        .map((consent) => ({
          entity_id: consent.entity_id,
          entity_type: consent.entity_type,
          cgv: consent.consent?.cgv?.status || false,
          privacy_policy: consent.consent?.privacy_policy?.status || false,
          age_18: consent.consent?.age_18?.status || false,
          newsletter: consent.consent?.newsletter?.status || false,
          push: consent.consent?.push?.status || false,
          all_required_accepted: consent.all_required_accepted,
          created_at: consent.created_at,
        }));

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error exporting consents:', error);
      throw error;
    }
  }
}

module.exports = new GdprConsentService();