module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert(
      'ListSilhouettes',
      [
        {
          title: 'normale',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'mince',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'sportive',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: 'quelques kilos à perdre',
          id: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {ignoreDuplicates: true}
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('ListSilhouettes', null, {});
  },
};
