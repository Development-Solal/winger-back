'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('ProfileTypeAidants', [
      {
        title_fr: 'Particulier',
        title_eng: 'Particular',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title_fr: 'Professionnel',
        title_eng: 'Professional',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
  ,{ignoreDuplicates: true});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ProfileTypeAidants', null, {});
  },
};
