const { sequelize } = require('./src/models');

async function check() {
    try {
        const [units] = await sequelize.query("SELECT * FROM information_schema.columns WHERE table_name = 'units'");
        console.log('Units columns:', units.map(c => `${c.column_name} (${c.data_type})`));

        const [clients] = await sequelize.query("SELECT * FROM information_schema.columns WHERE table_name = 'clients'");
        console.log('Clients columns:', clients.map(c => `${c.column_name} (${c.data_type})`));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
