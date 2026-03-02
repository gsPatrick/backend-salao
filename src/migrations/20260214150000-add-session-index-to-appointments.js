'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('appointments');
        if (!tableInfo.session_index) {
            await queryInterface.addColumn('appointments', 'session_index', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'The sequential number of this session within the package/plan (1-based)'
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('appointments');
        if (tableInfo.session_index) {
            await queryInterface.removeColumn('appointments', 'session_index');
        }
    }
};
