'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add total_sessions to package_subscriptions
        const tableInfo = await queryInterface.describeTable('package_subscriptions');
        if (!tableInfo.total_sessions) {
            await queryInterface.addColumn('package_subscriptions', 'total_sessions', {
                type: Sequelize.INTEGER,
                allowNull: true
            });
        }

        // 2. Create salon_plan_subscriptions table
        await queryInterface.createTable('salon_plan_subscriptions', {
            id: {
                type: Sequelize.BIGINT,
                primaryKey: true,
                autoIncrement: true
            },
            tenant_id: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            unit_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'units',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            client_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'clients',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            plan_id: {
                type: Sequelize.BIGINT,
                allowNull: false,
                references: {
                    model: 'salon_plans',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            start_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            end_date: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('active', 'expired', 'archived'),
                defaultValue: 'active'
            },
            used_sessions: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            total_sessions: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('salon_plan_subscriptions');
        await queryInterface.removeColumn('package_subscriptions', 'total_sessions');
    }
};
