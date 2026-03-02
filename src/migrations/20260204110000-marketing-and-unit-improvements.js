'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Marketing Campaigns attachments
        const campaignTable = await queryInterface.describeTable('campaigns');
        if (!campaignTable.attachment_url) {
            await queryInterface.addColumn('campaigns', 'attachment_url', {
                type: Sequelize.STRING(2048),
                allowNull: true
            });
        }
        if (!campaignTable.attachments) {
            await queryInterface.addColumn('campaigns', 'attachments', {
                type: Sequelize.JSONB,
                defaultValue: [],
                allowNull: true
            });
        }

        // 2. Units additions
        const unitTable = await queryInterface.describeTable('units');

        // Add cnpj_cpf, admin_name, admin_phone if missing
        if (!unitTable.cnpj_cpf) {
            await queryInterface.addColumn('units', 'cnpj_cpf', {
                type: Sequelize.STRING(20),
                allowNull: true
            });
        }
        if (!unitTable.admin_name) {
            await queryInterface.addColumn('units', 'admin_name', {
                type: Sequelize.STRING(200),
                allowNull: true
            });
        }
        if (!unitTable.admin_phone) {
            await queryInterface.addColumn('units', 'admin_phone', {
                type: Sequelize.STRING(20),
                allowNull: true
            });
        }
        if (!unitTable.smtp_settings) {
            await queryInterface.addColumn('units', 'smtp_settings', {
                type: Sequelize.JSONB,
                defaultValue: {},
                allowNull: true
            });
        }

        // 3. Change phone to JSONB if it's currently a string
        if (unitTable.phone && unitTable.phone.type === 'CHARACTER VARYING') {
            // Step-by-step migration to avoid data loss
            // This is a bit complex for a simple migration, but safe:
            await queryInterface.sequelize.query('ALTER TABLE units ALTER COLUMN phone TYPE JSONB USING jsonb_build_array(phone)');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Reverting is harder for the JSONB change, but we can try to revert simple column additions
        await queryInterface.removeColumn('campaigns', 'attachment_url');
        await queryInterface.removeColumn('campaigns', 'attachments');
        await queryInterface.removeColumn('units', 'cnpj_cpf');
        await queryInterface.removeColumn('units', 'admin_name');
        await queryInterface.removeColumn('units', 'admin_phone');
        await queryInterface.removeColumn('units', 'smtp_settings');
    }
};
