
const { sequelize } = require('../models');

async function fetchEnum() {
    try {
        const result = await sequelize.query("SELECT unnest(enum_range(NULL::enum_appointments_status))");
        console.log('Allowed ENUM values:', result[0].map(r => r.unnest));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

fetchEnum();
