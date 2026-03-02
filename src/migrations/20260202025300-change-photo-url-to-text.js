'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Change photo_url from VARCHAR(255) to TEXT to allow base64 images
        await queryInterface.changeColumn('clients', 'photo_url', {
            type: Sequelize.TEXT,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('clients', 'photo_url', {
            type: Sequelize.STRING(255),
            allowNull: true,
        });
    }
};
