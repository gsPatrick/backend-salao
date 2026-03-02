const sequelize = require('../config/db');

async function addMissingColumns() {
    try {
        console.log('Checking for missing columns in clients table...');
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('clients');

        if (!tableInfo.team) {
            console.log('Adding "team" column...');
            await queryInterface.addColumn('clients', 'team', {
                type: 'VARCHAR(255)',
                allowNull: true
            });
            console.log('"team" column added.');
        } else {
            console.log('"team" column already exists.');
        }

        if (!tableInfo.kinship) {
            console.log('Adding "kinship" column...');
            await queryInterface.addColumn('clients', 'kinship', {
                type: 'VARCHAR(255)',
                allowNull: true
            });
            console.log('"kinship" column added.');
        } else {
            console.log('"kinship" column already exists.');
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

addMissingColumns();
