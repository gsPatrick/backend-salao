const { sequelize } = require('./src/models');

async function check() {
    try {
        const [tables] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', tables.map(t => t.table_name));

        const [meta] = await sequelize.query('SELECT * FROM "SequelizeMeta"');
        console.log('Migrations in DB:', meta.map(m => m.name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

check();
