'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Units additions: opening_time, closing_time, checkin_id
        const unitTable = await queryInterface.describeTable('units');

        if (!unitTable.opening_time) {
            await queryInterface.addColumn('units', 'opening_time', {
                type: Sequelize.TIME,
                allowNull: true,
                defaultValue: '08:00'
            });
        }

        if (!unitTable.closing_time) {
            await queryInterface.addColumn('units', 'closing_time', {
                type: Sequelize.TIME,
                allowNull: true,
                defaultValue: '18:00'
            });
        }

        if (!unitTable.checkin_id) {
            await queryInterface.addColumn('units', 'checkin_id', {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                unique: true,
                allowNull: true
            });

            // Populate existing units with UUIDs
            await queryInterface.sequelize.query('UPDATE units SET checkin_id = gen_random_uuid() WHERE checkin_id IS NULL');
        }

        // 2. Clients enhancements: is_complete_registration
        const clientTable = await queryInterface.describeTable('clients');

        if (!clientTable.is_complete_registration) {
            await queryInterface.addColumn('clients', 'is_complete_registration', {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false
            });

            // Note: We set default to true for existing clients, but new "Quick Bookings" will set it to false.
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('units', 'opening_time');
        await queryInterface.removeColumn('units', 'closing_time');
        await queryInterface.removeColumn('units', 'checkin_id');
        await queryInterface.removeColumn('clients', 'is_complete_registration');
    }
};
