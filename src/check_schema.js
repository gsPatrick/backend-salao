
const { sequelize } = require('./models');

async function checkSchema() {
    try {
        const [results] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients'");
        console.log('Columns in clients table:', results);

        const [client] = await sequelize.query("SELECT * FROM clients LIMIT 1");
        console.log('Sample client record:', client);

        process.exit();
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
