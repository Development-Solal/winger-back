module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListEducations',
      [
        {
          title: 'bac-',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'bac',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'bac+2',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'bac+3',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'bac+4',
          id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'bac++',
          id: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListEducations', null, {});
  },
};
