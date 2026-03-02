'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add unit_id to package_subscriptions
        await queryInterface.addColumn('package_subscriptions', 'unit_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'units',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        // Add unit_id to marketing_campaigns
        await queryInterface.addColumn('marketing_campaigns', 'unit_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'units',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('package_subscriptions', 'unit_id');
        await queryInterface.removeColumn('marketing_campaigns', 'unit_id');
    }
};
