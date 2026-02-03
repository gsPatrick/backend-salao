const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('DB Config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER
});

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
});


async function checkProfessionals() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const results = await sequelize.query(`
            SELECT id, name, unit, open_schedule, is_suspended, is_archived, tenant_id 
            FROM professionals 
            ORDER BY id ASC
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('Professionals:', JSON.stringify(results, null, 2));

        const units = await sequelize.query(`
            SELECT id, name FROM units
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('Units:', JSON.stringify(units, null, 2));

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

checkProfessionals();
