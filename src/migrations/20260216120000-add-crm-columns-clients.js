'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('clients');

        if (!tableInfo.crm_stage) {
            await queryInterface.addColumn('clients', 'crm_stage', {
                type: Sequelize.STRING,
                defaultValue: 'new',
                allowNull: true
            });
        }

        if (!tableInfo.classification) {
            await queryInterface.addColumn('clients', 'classification', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('clients');

        if (tableInfo.classification) {
            await queryInterface.removeColumn('clients', 'classification');
        }

        if (tableInfo.crm_stage) {
            await queryInterface.removeColumn('clients', 'crm_stage');
        }
    }
};
