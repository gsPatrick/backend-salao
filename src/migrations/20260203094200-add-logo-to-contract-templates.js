'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('contract_templates');
        if (!table.logo) {
            await queryInterface.addColumn('contract_templates', 'logo', {
                type: Sequelize.TEXT('long'),
                allowNull: true
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('contract_templates', 'logo');
    }
};
