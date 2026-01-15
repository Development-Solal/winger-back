module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListHeights',
      [
        {
          title: '1m50',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '1m50-1m60',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '1m60-1m70',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '1m70-1m80',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '1m80-1m90',
          id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: '1m90+',
          id: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListHeights', null, {});
  },
};
