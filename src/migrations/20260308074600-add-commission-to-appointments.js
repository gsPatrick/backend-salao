'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('appointments');
    
    if (!tableInfo.commission_rate) {
      await queryInterface.addColumn('appointments', 'commission_rate', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }

    if (!tableInfo.commission_value) {
      await queryInterface.addColumn('appointments', 'commission_value', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('appointments', 'commission_rate');
    await queryInterface.removeColumn('appointments', 'commission_value');
  }
};
