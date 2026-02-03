const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
});

async function checkTenantAndProfessional() {
    try {
        await sequelize.authenticate();
        console.log('Connection established.');

        // Check tenant business hours
        const tenants = await sequelize.query(`
            SELECT id, name, business_hours FROM tenants
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('Tenants:', JSON.stringify(tenants, null, 2));

        // Check professional times
        const professionals = await sequelize.query(`
            SELECT id, name, start_time, end_time, lunch_start, lunch_end, open_schedule, unit FROM professionals
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('Professionals:', JSON.stringify(professionals, null, 2));

        // Check services
        const services = await sequelize.query(`
            SELECT id, name, duration, price FROM services LIMIT 5
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('Services:', JSON.stringify(services, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkTenantAndProfessional();
