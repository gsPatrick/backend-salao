'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Check and add columns to salon_plans
        const salonPlansTable = await queryInterface.describeTable('salon_plans');

        if (!salonPlansTable.active) {
            await queryInterface.addColumn('salon_plans', 'active', {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            });
        }

        if (!salonPlansTable.usage_type) {
            await queryInterface.addColumn('salon_plans', 'usage_type', {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'Serviços'
            });
        }

        // Check and add columns to monthly_packages
        const monthlyPackagesTable = await queryInterface.describeTable('monthly_packages');

        if (!monthlyPackagesTable.active) {
            await queryInterface.addColumn('monthly_packages', 'active', {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            });
        }

        if (!monthlyPackagesTable.usage_type) {
            await queryInterface.addColumn('monthly_packages', 'usage_type', {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'Serviços'
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('salon_plans', 'active');
        await queryInterface.removeColumn('salon_plans', 'usage_type');
        await queryInterface.removeColumn('monthly_packages', 'active');
        await queryInterface.removeColumn('monthly_packages', 'usage_type');
    }
};
