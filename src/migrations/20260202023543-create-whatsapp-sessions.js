'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('WhatsAppSessions', {
            tenant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                references: {
                    model: 'tenants',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            key: {
                type: Sequelize.STRING,
                allowNull: false,
                primaryKey: true
            },
            value: {
                type: Sequelize.TEXT, // Storing JSON stringified data
                allowNull: false
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Add index for faster lookups
        await queryInterface.addIndex('WhatsAppSessions', ['tenant_id', 'key']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('WhatsAppSessions');
    }
};
