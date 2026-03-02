'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('ad_banners', 'target_state', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Filter banner by user state'
        });
        await queryInterface.addColumn('ad_banners', 'target_city', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Filter banner by user city'
        });
        await queryInterface.addColumn('ad_banners', 'target_neighborhood', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Filter banner by user neighborhood'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('ad_banners', 'target_state');
        await queryInterface.removeColumn('ad_banners', 'target_city');
        await queryInterface.removeColumn('ad_banners', 'target_neighborhood');
    }
};
