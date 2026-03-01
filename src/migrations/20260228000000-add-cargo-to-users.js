'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add cargo if it does not exist to prevent migration failure if it already exists partially
        return queryInterface.describeTable('users').then(tableDefinition => {
            if (!tableDefinition.cargo) {
                return queryInterface.addColumn('users', 'cargo', {
                    type: Sequelize.STRING,
                    allowNull: true,
                });
            } else {
                return Promise.resolve();
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        return queryInterface.removeColumn('users', 'cargo');
    }
};
