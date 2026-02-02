const { Client, Appointment, sequelize } = require('../models');
const { Op } = require('sequelize');

async function syncCRMClients() {
    try {
        console.log('🚀 Starting CRM Synchronization...');

        const clients = await Client.findAll();
        console.log(`👥 Found ${clients.length} clients to process.`);

        let updatedCount = 0;

        for (const client of clients) {
            // Find all concluded appointments for this client
            const concludedAppointments = await Appointment.findAll({
                where: {
                    client_id: client.id,
                    status: 'concluido'
                },
                order: [['date', 'DESC'], ['time', 'DESC']]
            });

            const totalVisits = concludedAppointments.length;
            const lastVisit = totalVisits > 0 ? concludedAppointments[0].date : null;

            // Find the VERY LAST appointment (regardless of status) to check for CRM stage
            const lastAppointment = await Appointment.findOne({
                where: {
                    client_id: client.id,
                    status: {
                        [Op.notIn]: ['cancelado']
                    }
                },
                order: [['date', 'DESC'], ['time', 'DESC']]
            });

            let crmStage = client.crm_stage || 'new';

            // Logic similar to CRMPage.tsx for stage classification
            if (lastVisit) {
                const today = new Date();
                const lastVisitDate = new Date(lastVisit);
                const daysSinceLastVisit = Math.floor((today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysSinceLastVisit > 60) {
                    crmStage = 'inactive';
                } else if (totalVisits > 0) {
                    crmStage = 'won'; // or some other 'active' indicator
                }
            }

            if (lastAppointment) {
                if (lastAppointment.status === 'faltou') {
                    crmStage = 'absent';
                } else if (lastAppointment.status === 'reagendado') {
                    crmStage = 'rescheduled';
                }
            }

            // Update client
            await client.update({
                total_visits: totalVisits,
                last_visit: lastVisit,
                crm_stage: crmStage
            });

            updatedCount++;
            if (updatedCount % 10 === 0) {
                console.log(`⏳ Processed ${updatedCount}/${clients.length} clients...`);
            }
        }

        console.log(`\n✅ CRM Sync Completed!`);
        console.log(`📈 Updated ${updatedCount} clients.`);

    } catch (error) {
        console.error('❌ Error during CRM sync:', error);
    } finally {
        if (sequelize) {
            await sequelize.close();
        }
    }
}

syncCRMClients();
