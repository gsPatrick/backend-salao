'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('appointments', 'cancellation_reason', {
            type: Sequelize.TEXT,
            allowNull: true
        });
        await queryInterface.addColumn('appointments', 'canceled_at', {
            type: Sequelize.DATE,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('appointments', 'cancellation_reason');
        await queryInterface.removeColumn('appointments', 'canceled_at');
    }
};
