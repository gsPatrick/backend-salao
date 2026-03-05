'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('signed_contracts', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            tenant_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'tenants',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            plan_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'plans',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            content: {
                type: Sequelize.TEXT('long'),
                allowNull: false
            },
            signature: {
                type: Sequelize.TEXT('long'),
                allowNull: true
            },
            verification_photo: {
                type: Sequelize.TEXT('long'),
                allowNull: true
            },
            signed_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('signed', 'expired', 'cancelled'),
                allowNull: false,
                defaultValue: 'signed'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('signed_contracts');
    }
};
