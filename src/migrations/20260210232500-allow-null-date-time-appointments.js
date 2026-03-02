'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('appointments', 'date', {
            type: Sequelize.DATEONLY,
            allowNull: true
        });
        await queryInterface.changeColumn('appointments', 'time', {
            type: Sequelize.TIME,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('appointments', 'time', {
            type: Sequelize.TIME,
            allowNull: false
        });
        await queryInterface.changeColumn('appointments', 'date', {
            type: Sequelize.DATEONLY,
            allowNull: false
        });
    }
};
