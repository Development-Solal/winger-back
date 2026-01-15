module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListReligions',
      [
        {
          title: 'catholique',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'protestante',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'orthodoxe',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'musulmane',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'juive',
          id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'hindoue',
          id: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'bouddhiste',
          id: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'agnostique',
          id: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'athée',
          id: 9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'autre',
          id: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListReligions', null, {});
  },
};
