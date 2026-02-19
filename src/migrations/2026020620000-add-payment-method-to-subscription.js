'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Subscriptions', 'payment_method', {
            type: Sequelize.ENUM('paypal', 'apple', 'stripe'),
            allowNull: true,
            defaultValue: 'paypal'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn('Subscriptions', 'payment_method');
    }
};
