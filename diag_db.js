const { sequelize } = require('./src/models');

async function check() {
    try {
        const [units] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'units'");
        console.log('Units columns:', units.map(c => c.column_name));

        const [clients] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'");
        console.log('Clients columns:', clients.map(c => c.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
