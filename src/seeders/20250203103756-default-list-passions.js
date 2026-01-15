module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListPassions',
      [
        {
          title: 'musique',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'lecture',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'cinéma',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'spectacles',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'tv',
          id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'sport',
          id: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'internet',
          id: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListPassions', null, {});
  },
};
