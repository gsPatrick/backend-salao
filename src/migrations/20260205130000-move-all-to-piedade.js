'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Find the 'Piedade' unit
        const [units] = await queryInterface.sequelize.query(
            "SELECT id FROM units WHERE name ILIKE '%Piedade%' LIMIT 1;"
        );

        if (!units || units.length === 0) {
            console.log("Unit 'Piedade' not found. Skipping data migration.");
            return;
        }

        const piedadeId = units[0].id;
        console.log(`Moving all unit-less data to Piedade (ID: ${piedadeId})`);

        const tables = [
            'services',
            'products',
            'monthly_packages',
            'salon_plans',
            'stock_transactions',
            'campaigns',
            'direct_mail_campaigns',
            'promotions',
            'professionals',
            'clients',
            'appointments',
            'financial_transactions'
        ];

        for (const tableName of tables) {
            try {
                // Update all records where unit_id is NULL to point to Piedade
                await queryInterface.sequelize.query(
                    `UPDATE ${tableName} SET unit_id = ${piedadeId} WHERE unit_id IS NULL;`
                );
                console.log(`Updated data in ${tableName}`);
            } catch (error) {
                console.error(`Error updating data in ${tableName}:`, error.message);
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        // We don't necessarily want to undo this move, as it reflects a logical reorganization.
        // But if needed, we could set them back to NULL, though we'd lose the info that they WERE NULL.
    }
};
