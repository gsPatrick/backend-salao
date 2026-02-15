
const { Appointment, Client } = require('../models');
const { Op } = require('sequelize');

async function verify() {
    try {
        console.log('Starting verification...');

        // statuses to check
        const completionStatuses = ['concluido', 'atendido', 'realizado', 'pago', 'finalizado', 'completed', 'done'];
        const completionStatusesUpper = completionStatuses.map(s => s.toUpperCase());
        const completionStatusesCapitalized = completionStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1));
        const allCompletionStatuses = [...new Set([...completionStatuses, ...completionStatusesUpper, ...completionStatusesCapitalized])];

        console.log('Checking statuses:', allCompletionStatuses);

        // Find appointments with these statuses
        const appointments = await Appointment.findAll({
            where: {
                status: { [Op.in]: allCompletionStatuses }
            },
            limit: 10,
            attributes: ['id', 'status', 'client_id']
        });

        console.log(`Found ${appointments.length} appointments with matching statuses.`);
        appointments.forEach(a => console.log(`Appointment ${a.id}: status="${a.status}"`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

verify();
