const { Appointment } = require('./src/models');
const { Op } = require('sequelize');

async function check() {
    try {
        const appointments = await Appointment.findAll({
            where: { date: '2026-02-04' },
            attributes: ['id', 'client_id', 'date', 'status', 'tenant_id'],
            raw: true
        });

        console.log(`Appointments on 2026-02-04: ${appointments.length}`);
        appointments.forEach(a => {
            console.log(`  ID: ${a.id}, Client: ${a.client_id}, Status: ${a.status}, Tenant: ${a.tenant_id}`);
        });

        // Also check all distinct appointment dates
        const dates = await Appointment.findAll({
            attributes: ['date'],
            group: ['date'],
            order: [['date', 'DESC']],
            raw: true
        });
        console.log('\nAll distinct appointment dates:');
        dates.forEach(d => console.log(`  ${d.date}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

check();
