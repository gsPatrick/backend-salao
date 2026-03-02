'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('clients');

        if (!tableInfo.login_email) {
            // Add login_email column
            await queryInterface.addColumn('clients', 'login_email', {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Email used by client to login to the app'
            });
        }

        // Create unique index on cpf (scoped by tenant_id to allow same client in multiple salons)
        // Check if index exists first (optional, but good practice if re-running)
        try {
            await queryInterface.addIndex('clients', ['cpf', 'tenant_id'], {
                unique: true,
                where: {
                    cpf: {
                        [Sequelize.Op.ne]: null
                    }
                },
                name: 'clients_cpf_tenant_unique'
            });
        } catch (error) {
            console.log('Index clients_cpf_tenant_unique creation failed or already exists:', error.message);
        }
    },

    async down(queryInterface, Sequelize) {
        try {
            await queryInterface.removeIndex('clients', 'clients_cpf_tenant_unique');
        } catch (e) {
            // ignore if not exists
        }

        try {
            // Check if column exists before removing? usually removeColumn is fine, but for safety:
            const tableInfo = await queryInterface.describeTable('clients');
            if (tableInfo.login_email) {
                await queryInterface.removeColumn('clients', 'login_email');
            }
        } catch (e) {
            // ignore
        }
    }
};
