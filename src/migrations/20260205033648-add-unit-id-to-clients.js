'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'clients';
    try {
      const tableInfo = await queryInterface.describeTable(tableName);
      if (!tableInfo.unit_id) {
        await queryInterface.addColumn(tableName, 'unit_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'units',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        console.log(`Added unit_id column to ${tableName}`);
      } else {
        console.log(`Column unit_id already exists in ${tableName}`);
      }
    } catch (error) {
      console.error(`Error processing table ${tableName}:`, error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableName = 'clients';
    try {
      const tableInfo = await queryInterface.describeTable(tableName);
      if (tableInfo.unit_id) {
        await queryInterface.removeColumn(tableName, 'unit_id');
      }
    } catch (error) {
      console.error(`Error removing column from ${tableName}:`, error);
    }
  }
};
