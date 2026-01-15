module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListTownOptions',
      [
        {
          title: 'dans ma ville',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'dans mon département',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'dans ma région',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'dans la France entière',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'dans le monde entier',
          id: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },

      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListTownOptions', null, {});
  },
};