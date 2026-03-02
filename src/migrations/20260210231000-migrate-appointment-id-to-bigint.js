'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Change appointments.id to BIGINT using raw SQL for better Postgres handling
        await queryInterface.sequelize.query('ALTER TABLE appointments ALTER COLUMN id TYPE BIGINT');

        // 2. Change professional_reviews.appointment_id to BIGINT
        await queryInterface.changeColumn('professional_reviews', 'appointment_id', {
            type: Sequelize.BIGINT,
            allowNull: true
        });

        // 3. Change financial_transactions.appointment_id to BIGINT
        await queryInterface.changeColumn('financial_transactions', 'appointment_id', {
            type: Sequelize.BIGINT,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Revert to INTEGER
        await queryInterface.changeColumn('financial_transactions', 'appointment_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        await queryInterface.changeColumn('professional_reviews', 'appointment_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        await queryInterface.changeColumn('appointments', 'id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        });
    }
};
