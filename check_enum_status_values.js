const { Sequelize } = require('sequelize');
const config = require('./src/config/database.js')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: false
});

async function run() {
    try {
        const [results] = await sequelize.query("SELECT enumrange(NULL::enum_appointments_status)");
        console.log("Valid statuses:", results);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

run();
