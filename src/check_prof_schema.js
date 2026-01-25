
const { sequelize } = require('./models');

async function checkProfessionalsSchema() {
    try {
        const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'professionals'");
        console.log('Columns in professionals table:', results.map(r => r.column_name));
        process.exit();
    } catch (error) {
        console.error('Error checking schema:', error);
        process.exit(1);
    }
}

checkProfessionalsSchema();
