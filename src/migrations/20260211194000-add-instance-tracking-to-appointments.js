'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('appointments');

        if (!tableInfo.package_subscription_id) {
            await queryInterface.addColumn('appointments', 'package_subscription_id', {
                type: Sequelize.BIGINT,
                allowNull: true,
                references: {
                    model: 'package_subscriptions',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }

        if (!tableInfo.salon_plan_subscription_id) {
            await queryInterface.addColumn('appointments', 'salon_plan_subscription_id', {
                type: Sequelize.BIGINT,
                allowNull: true,
                references: {
                    model: 'salon_plan_subscriptions',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }

        if (!tableInfo.total_sessions) {
            await queryInterface.addColumn('appointments', 'total_sessions', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        if (!tableInfo.consumed_sessions) {
            await queryInterface.addColumn('appointments', 'consumed_sessions', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('appointments', 'consumed_sessions');
        await queryInterface.removeColumn('appointments', 'total_sessions');
        await queryInterface.removeColumn('appointments', 'salon_plan_subscription_id');
        await queryInterface.removeColumn('appointments', 'package_subscription_id');
    }
};
