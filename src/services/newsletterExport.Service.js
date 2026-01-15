const { GdprConsent, ProfileAidant, ProfileAide, User, GdprAide } = require('../models');
const { Op } = require('sequelize');

const exportNewsletterSubscribers = async () => {
  try {
    const subscribers = [];

    // 1. Get Aidants (unchanged)
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
              attributes: ['id', 'email', 'first_name', 'last_name'],
              required: true
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

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

    // 2. Get Aides with newsletter
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

// Get ProfileAide IDs
const profileAideIds = aideConsents
  .filter(c => c.ProfileAide)
  .map(c => c.ProfileAide.id);

console.log('🔍 ProfileAide IDs from consents:', profileAideIds);

// Fetch GdprAide emails
const gdprAides = await GdprAide.findAll({
  where: {
    profile_aide_id: {
      [Op.in]: profileAideIds
    }
  },
  attributes: ['profile_aide_id', 'email_aide']
});

console.log('📧 GdprAides found:', gdprAides.length);
console.log('📧 GdprAide data:', JSON.stringify(gdprAides, null, 2));

// Create email map
const emailMap = {};
gdprAides.forEach(ga => {
  emailMap[ga.profile_aide_id] = ga.email_aide;
});

console.log('📧 Email Map:', emailMap);

// Process Aides
aideConsents.forEach(consent => {
  if (consent.ProfileAide) {
    console.log(`\n🔍 Processing Aide:`, {
      entityId: consent.entity_id,
      profileAideId: consent.ProfileAide.id,
      profileEmail: consent.ProfileAide.email,
      gdprEmail: emailMap[consent.ProfileAide.id]
    });

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
    return {
      success: true,
      data: subscribers,
      count: subscribers.length
    };
  } catch (error) {
    console.error('Error exporting newsletter subscribers:', error);
    throw error;
  }
};

const getNewsletterStats = async () => {
  try {
    const aidantCount = await GdprConsent.count({
      where: {
        entity_type: {
          [Op.in]: ['aidant', 'aidant_pro']
        },
        'consent.newsletter.status': true
      }
    });

    const aideCount = await GdprConsent.count({
      where: {
        entity_type: 'aide',
        'consent.newsletter.status': true
      }
    });

    return {
      success: true,
      data: {
        total: aidantCount + aideCount,
        aidants: aidantCount,
        aides: aideCount
      }
    };
  } catch (error) {
    console.error('Error getting newsletter stats:', error);
    throw error;
  }
};

module.exports = {
  exportNewsletterSubscribers,
  getNewsletterStats
};