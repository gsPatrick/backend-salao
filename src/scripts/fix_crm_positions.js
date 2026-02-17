const { Client, Appointment, sequelize } = require('../models');
const { Op } = require('sequelize');

async function fixCRMPositions() {
    try {
        console.log('Starting CRM Position Fix...');

        // Use 'Appointments' or no alias, as per error message
        const clients = await Client.findAll({
            include: [
                {
                    model: Appointment,
                    // Remove 'as' to rely on default or match the capitalized alias if required
                    // The error said "defined in your association (Appointments)"
                    // So we can try removing 'as' first, or use 'Appointments'
                    // Let's try removing 'as' since it's the standard.
                    required: false,
                    where: {
                        status: { [Op.in]: ['agendado', 'confirmado'] },
                        date: { [Op.gte]: new Date().toISOString().split('T')[0] }
                    }
                }
            ]
        });

        console.log(`Analyzing ${clients.length} clients...`);

        let updatedCount = 0;

        for (const client of clients) {
            let newStage = client.crm_stage;
            let newClassification = client.classification;

            // Access via default alias (likely Appointments or appointments)
            // Sequelize usually attaches it as .Appointments if model name is Appointment
            const appointments = client.Appointments || client.appointments;
            const hasFutureAppointment = appointments && appointments.length > 0;
            const lastVisit = client.last_visit ? new Date(client.last_visit) : null;
            const totalVisits = client.total_visits || 0;

            // Calculate 60 days ago
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            // LOGIC PRIORITY:
            // 1. Scheduled (Has future appointment) -> 'scheduled' / 'Agendado'
            // 2. Inactive (No future appt, Last visit > 60 days) -> 'inactive' / 'Inativa'
            // 3. Recurrent (No future appt, Last visit <= 60 days, Total visits > 0) -> 'recurrent' / 'Recorrente'
            // 4. New (No visits, No future appt) -> 'new' / 'Nova'

            if (hasFutureAppointment) {
                newStage = 'scheduled';
                newClassification = 'Agendado';
                // console.log(`Client ${client.name} has future appt -> Scheduled`);
            } else if (lastVisit && lastVisit < sixtyDaysAgo) {
                newStage = 'inactive';
                newClassification = 'Inativa';
                // console.log(`Client ${client.name} last visit ${lastVisit} -> Inactive`);
            } else if (totalVisits > 0) {
                newStage = 'recurrent';
                newClassification = 'Recorrente';
                // console.log(`Client ${client.name} active recurrent -> Recorrente`);
            } else {
                newStage = 'new';
                newClassification = 'Nova';
                // console.log(`Client ${client.name} new -> Nova`);
            }

            // Only update if changed
            if (client.crm_stage !== newStage || client.classification !== newClassification) {
                console.log(`Fixing Client ${client.id} (${client.name}): ${client.crm_stage} (${client.classification}) -> ${newStage} (${newClassification})`);
                await client.update({
                    crm_stage: newStage,
                    classification: newClassification
                });
                updatedCount++;
            }
        }

        console.log(`CRM Position Fix Complete. Updated ${updatedCount} clients.`);
        process.exit(0);
    } catch (error) {
        console.error('Error fixing CRM positions:', error);
        process.exit(1);
    }
}

fixCRMPositions();
