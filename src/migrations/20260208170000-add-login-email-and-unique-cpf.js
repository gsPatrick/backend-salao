'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add login_email column
        await queryInterface.addColumn('clients', 'login_email', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Email used by client to login to the app'
        });

        // Create unique index on cpf (globally unique across all tenants)
        await queryInterface.addIndex('clients', ['cpf'], {
            unique: true,
            where: {
                cpf: {
                    [Sequelize.Op.ne]: null
                }
            },
            name: 'clients_cpf_unique_global'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('clients', 'clients_cpf_unique_global');
        await queryInterface.removeColumn('clients', 'login_email');
    }
};
