'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('appointments').catch(() => null);

        if (table) {
            if (!table.package_id) {
                await queryInterface.addColumn('appointments', 'package_id', {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    references: {
                        model: 'monthly_packages',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                });
            }
            if (!table.salon_plan_id) {
                await queryInterface.addColumn('appointments', 'salon_plan_id', {
                    type: Sequelize.BIGINT,
                    allowNull: true,
                    references: {
                        model: 'salon_plans',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                });
            }
            // Ensure service_id is nullable
            if (table.service_id) {
                await queryInterface.changeColumn('appointments', 'service_id', {
                    type: Sequelize.INTEGER,
                    allowNull: true
                });
            }
        }
    },

    async down(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('appointments').catch(() => null);
        if (table) {
            if (table.package_id) await queryInterface.removeColumn('appointments', 'package_id');
            if (table.salon_plan_id) await queryInterface.removeColumn('appointments', 'salon_plan_id');
            // We don't necessarily want to make service_id NOT NULL again in down to avoid data loss if it was changed
        }
    }
};
