
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('crm_settings');

        if (!tableInfo.classifications) {
            await queryInterface.addColumn('crm_settings', 'classifications', {
                type: Sequelize.JSONB,
                defaultValue: [
                    { text: 'VIP', icon: '👑' },
                    { text: 'Potencial', icon: '💡' },
                    { text: 'Retorno', icon: '🔄' }
                ],
                allowNull: true
            });
            console.log('✅ Column "classifications" added to "crm_settings"');
        } else {
            console.log('⚠️ Column "classifications" already exists. Skipping...');
        }
    },

    async down(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('crm_settings');

        if (tableInfo.classifications) {
            await queryInterface.removeColumn('crm_settings', 'classifications');
            console.log('✅ Column "classifications" removed from "crm_settings"');
        }
    }
};
