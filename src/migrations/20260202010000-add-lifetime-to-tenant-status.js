'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Postgres specific way to add value to ENUM
        await queryInterface.sequelize.query("ALTER TYPE \"enum_tenants_subscription_status\" ADD VALUE IF NOT EXISTS 'lifetime'");
    },

    down: async (queryInterface, Sequelize) => {
        // Scaling back ENUM is hard in Postgres, usually involves renaming and creating new one.
        // Given it's a new value, we might just leave it or handle it if absolutely necessary.
        console.log('Down migration for ENUM value addition is not fully supported without recreation.');
    }
};
