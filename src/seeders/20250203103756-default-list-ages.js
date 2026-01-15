module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListAges',
      [
        {
          title: '18-20',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '20-25',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '25-30',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '30-35',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '35-40',
          id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '40-45',
          id: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },        {
          title: '45-50',
          id: 7,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '50-55',
          id: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },        
        {
          title: '55-60',
          id: 9,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '60-65',
          id: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '65+',
          id: 11,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListAges', null, {});
  },
};
