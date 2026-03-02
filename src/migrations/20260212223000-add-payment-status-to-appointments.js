'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('appointments', 'payment_status', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: 'pending'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('appointments', 'payment_status');
    }
};
