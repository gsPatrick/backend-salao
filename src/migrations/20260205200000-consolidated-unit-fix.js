'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Define all tables that need unit_id
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
            'financial_transactions',
            'notifications',
            'audit_logs',
            'time_records',
            'support_tickets',
            'ai_chats',
            'schedule_blocks',
            'professional_reviews',
            'acquisition_channels',
            'whatsapp_sessions',
            'contract_templates'
        ];

        console.log("--- STARTING UNIT ISOLATION MIGRATION ---");

        for (const tableName of [...tables, 'ai_agent_configs']) {
            try {
                const tableInfo = await queryInterface.describeTable(tableName);
                if (!tableInfo.unit_id) {
                    const isWhatsAppSession = tableName === 'whatsapp_sessions';
                    const isAIAgentConfig = tableName === 'ai_agent_configs';
                    const isContractTemplate = tableName === 'contract_templates'; // Added for contract_templates

                    await queryInterface.addColumn(tableName, 'unit_id', {
                        type: Sequelize.INTEGER,
                        allowNull: true, // Set to true for all during migration to avoid crashes with existing data
                        references: {
                            model: 'units',
                            key: 'id',
                        },
                        onUpdate: 'CASCADE',
                        onDelete: (tableName === 'whatsapp_sessions' || tableName === 'contract_templates') ? 'CASCADE' : 'SET NULL',
                    });
                    console.log(`[OK] Added unit_id column to ${tableName}`);
                } else {
                    console.log(`[SKIP] Column unit_id already exists in ${tableName}`);
                }
            } catch (error) {
                console.error(`[ERROR] Processing table ${tableName}:`, error.message);
            }
        }

        // 2. Data Migration: Move all orphaned records to 'Piedade'
        try {
            const [units] = await queryInterface.sequelize.query(
                "SELECT id FROM units WHERE name ILIKE '%Piedade%' LIMIT 1;"
            );

            if (units && units.length > 0) {
                const piedadeId = units[0].id;
                console.log(`Moving orphaned records to Piedade (ID: ${piedadeId})...`);

                for (const tableName of [...tables, 'ai_agent_configs']) {
                    try {
                        // Double check column existence before updating to be ultra safe
                        const tableInfo = await queryInterface.describeTable(tableName);
                        if (tableInfo.unit_id) {
                            await queryInterface.sequelize.query(
                                `UPDATE ${tableName} SET unit_id = ${piedadeId} WHERE unit_id IS NULL;`
                            );
                            console.log(`[DATA] Updated ${tableName}`);
                        }
                    } catch (err) {
                        console.error(`[DATA ERROR] Failed to update ${tableName}:`, err.message);
                    }
                }
            } else {
                console.warn("[WARN] Unit 'Piedade' not found. Data move skipped.");
            }
        } catch (error) {
            console.error("[CRITICAL] Data move failed:", error.message);
        }

        console.log("--- UNIT ISOLATION MIGRATION FINISHED ---");
    },

    down: async (queryInterface, Sequelize) => {
        // Logic for down migration if needed
    }
};
