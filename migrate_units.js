const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
});

async function migrate() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('units');

        if (!tableInfo.cnpj_cpf) {
            await queryInterface.addColumn('units', 'cnpj_cpf', {
                type: Sequelize.STRING(20),
                allowNull: true
            });
            console.log('Added cnpj_cpf to units');
        }

        if (!tableInfo.admin_name) {
            await queryInterface.addColumn('units', 'admin_name', {
                type: Sequelize.STRING(200),
                allowNull: true
            });
            console.log('Added admin_name to units');
        }

        if (!tableInfo.admin_phone) {
            await queryInterface.addColumn('units', 'admin_phone', {
                type: Sequelize.STRING(20),
                allowNull: true
            });
            console.log('Added admin_phone to units');
        }

        if (!tableInfo.settings) {
            await queryInterface.addColumn('units', 'settings', {
                type: Sequelize.JSONB,
                allowNull: true,
                defaultValue: {}
            });
            console.log('Added settings to units');
        }

        // Change logo_url length
        await sequelize.query('ALTER TABLE units ALTER COLUMN logo_url TYPE VARCHAR(2048)');
        console.log('Updated logo_url length in units');

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
