const { Client, Appointment } = require('../src/models');
const sequelize = require('../src/config/db');

async function mergeClients(fromId, toId) {
    const transaction = await sequelize.transaction();
    try {
        console.log(`Merging client ${fromId} into ${toId}...`);

        // 1. Check if both clients exist
        const fromClient = await Client.findByPk(fromId);
        const toClient = await Client.findByPk(toId);

        if (!fromClient || !toClient) {
            throw new Error('One or both clients not found');
        }

        console.log(`From: ${fromClient.name} (ID: ${fromId})`);
        console.log(`To: ${toClient.name} (ID: ${toId})`);

        // 2. Move Appointments
        const appointmentsCount = await Appointment.update(
            { client_id: toId },
            { where: { client_id: fromId }, transaction }
        );
        console.log(`Moved ${appointmentsCount} appointments.`);

        // 3. Consolidate Observations
        if (fromClient.observation && fromClient.observation !== toClient.observation) {
            const newObservation = toClient.observation
                ? `${toClient.observation} | ${fromClient.observation}`
                : fromClient.observation;

            await Client.update(
                { observation: newObservation },
                { where: { id: toId }, transaction }
            );
            console.log(`Updated observations: ${newObservation}`);
        }

        // 4. Archive fromClient (Set is_active to false and rename to avoid future search matches)
        await Client.update(
            {
                is_active: false,
                name: `${fromClient.name} (DUPLICADO - MERGED INTO ${toId})`
            },
            { where: { id: fromId }, transaction }
        );
        console.log(`Archived client ${fromId}.`);

        await transaction.commit();
        console.log('Merge completed successfully.');
    } catch (error) {
        await transaction.rollback();
        console.error('Merge failed:', error);
    }
}

// Target merge for Juliana
const JULIANA_FROM = 50;
const JULIANA_TO = 22;

mergeClients(JULIANA_FROM, JULIANA_TO).then(() => process.exit());
