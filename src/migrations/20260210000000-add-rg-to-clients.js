'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add 'rg' column to 'clients' table
        await queryInterface.addColumn('clients', 'rg', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remove 'rg' column from 'clients' table
        await queryInterface.removeColumn('clients', 'rg');
    }
};
