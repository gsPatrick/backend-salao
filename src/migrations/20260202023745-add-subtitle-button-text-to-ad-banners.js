'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add subtitle column
        await queryInterface.addColumn('ad_banners', 'subtitle', {
            type: Sequelize.STRING(200),
            allowNull: true,
        });

        // Add button_text column
        await queryInterface.addColumn('ad_banners', 'button_text', {
            type: Sequelize.STRING(100),
            allowNull: true,
            defaultValue: 'Saiba mais',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('ad_banners', 'subtitle');
        await queryInterface.removeColumn('ad_banners', 'button_text');
    }
};
