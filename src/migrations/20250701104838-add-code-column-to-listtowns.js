'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ListTowns', 'Code', {
      type: Sequelize.STRING,
      allowNull: true, // Change to false if required
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ListTowns', 'Code');
  },
};
