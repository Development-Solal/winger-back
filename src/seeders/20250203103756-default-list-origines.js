module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListOrigines',
      [
        {
          title: 'française',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'européenne',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'étrangère',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListOrigines', null, {});
  },
};
