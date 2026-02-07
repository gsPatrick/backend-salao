'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add client_id to package_subscriptions for proper client linking
        const table = await queryInterface.describeTable('package_subscriptions').catch(() => null);

        if (table && !table.client_id) {
            await queryInterface.addColumn('package_subscriptions', 'client_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'clients',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });

            // Add index for better query performance
            await queryInterface.addIndex('package_subscriptions', ['client_id'], {
                name: 'idx_package_subscriptions_client_id'
            });
        }
    },

    async down(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('package_subscriptions').catch(() => null);

        if (table && table.client_id) {
            await queryInterface.removeIndex('package_subscriptions', 'idx_package_subscriptions_client_id').catch(() => { });
            await queryInterface.removeColumn('package_subscriptions', 'client_id');
        }
    }
};
