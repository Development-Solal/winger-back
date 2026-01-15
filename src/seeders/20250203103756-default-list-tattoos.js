module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListTattoos',
      [
        {
          title: 'non',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'discrets',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'visibles',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListTattoos', null, {});
  },
};
