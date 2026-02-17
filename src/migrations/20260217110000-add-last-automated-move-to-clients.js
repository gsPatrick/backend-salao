'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('clients', 'last_automated_move', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Timestamp of the last AI/Automation driven stage change'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('clients', 'last_automated_move');
    }
};
