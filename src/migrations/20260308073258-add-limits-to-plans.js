'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add to salon_plans (already done but keeping for completeness/idempotency if needed)
    const salonPlansTable = await queryInterface.describeTable('salon_plans');
    if (!salonPlansTable.max_users) {
      await queryInterface.addColumn('salon_plans', 'max_users', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }
    if (!salonPlansTable.max_units) {
      await queryInterface.addColumn('salon_plans', 'max_units', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }

    // Add to plans (The one that was actually missing for Subscription limits)
    const plansTable = await queryInterface.describeTable('plans');
    if (!plansTable.max_users) {
      await queryInterface.addColumn('plans', 'max_users', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }
    if (!plansTable.max_units) {
      await queryInterface.addColumn('plans', 'max_units', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const salonPlansTable = await queryInterface.describeTable('salon_plans');
    if (salonPlansTable.max_users) {
      await queryInterface.removeColumn('salon_plans', 'max_users');
    }
    if (salonPlansTable.max_units) {
      await queryInterface.removeColumn('salon_plans', 'max_units');
    }

    const plansTable = await queryInterface.describeTable('plans');
    if (plansTable.max_users) {
      await queryInterface.removeColumn('plans', 'max_users');
    }
    if (plansTable.max_units) {
      await queryInterface.removeColumn('plans', 'max_units');
    }
  }
};
