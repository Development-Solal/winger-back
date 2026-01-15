'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add unique constraint to the 'departement' column in ListTowns
    // await queryInterface.addConstraint('ListTowns', {
    //   fields: ['departement'],
    //   type: 'unique',
    //   name: 'unique_departement_town_constraint',
    // });

    // // Add unique constraint to the 'title' column in ListLanguages
    // await queryInterface.addConstraint('ListLanguages', {
    //   fields: ['title'],
    //   type: 'unique',
    //   name: 'unique_title_language_constraint',
    // });

    // // // Add unique constraint to the 'title' column in ListNationalities
    // await queryInterface.addConstraint('ListNationalities', {
    //   fields: ['title'],
    //   type: 'unique',
    //   name: 'unique_title_nationality_constraint',
    // });

    // // // Add unique constraint to the 'region' column in ListRegions
    // await queryInterface.addConstraint('ListRegions', {
    //   fields: ['region'],
    //   type: 'unique',
    //   name: 'unique_region_region_constraint',
    // });

    // // Add unique constraint to the 'name' column in ListCommunes
    // await queryInterface.addConstraint('ListCommunes', {
    //   fields: ['code_commune'],
    //   type: 'unique',
    //   name: 'unique_code_commune_constraint',
    // });
  },

  async down(queryInterface, Sequelize) {
    // Remove the unique constraint from 'departement' in ListTowns
    await queryInterface.removeConstraint('ListTowns', 'unique_departement_town_constraint');

    // // Remove the unique constraint from 'title' in ListLanguages
    await queryInterface.removeConstraint('ListLanguages', 'unique_title_language_constraint');

    // // Remove the unique constraint from 'title' in ListNationalities
    await queryInterface.removeConstraint('ListNationalities', 'unique_title_nationality_constraint');

    // // Remove the unique constraint from 'region' in ListRegions
    await queryInterface.removeConstraint('ListRegions', 'unique_region_region_constraint');

    // // Remove the unique constraint from 'name' in ListCommunes
    await queryInterface.removeConstraint('ListCommunes', 'unique_code_commune_constraint');
  }
};
