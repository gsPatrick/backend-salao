const { sequelize, Appointment, PackageSubscription, SalonPlanSubscription, Client } = require('../src/models');

async function fixSessionStatus() {
    const transaction = await sequelize.transaction();
    try {
        console.log('Starting session status fix...');

        // 1. Fix Fernando Luiz (Client 51)
        // IDs identified: 56, 57 (plus others if they match criteria)
        // Criteria: status 'agendado', package_id 15 or 16, or just specific IDs
        const client51Appts = await Appointment.findAll({
            where: {
                client_id: 51,
                status: 'agendado'
            },
            transaction
        });

        for (const appt of client51Appts) {
            console.log(`Checking Appointment ${appt.id} (Type: ${typeof appt.id}) for Client 51...`);
            // Convert to string to be safe
            const idStr = String(appt.id);
            if (appt.consumed_sessions > 0 || ['56', '57'].includes(idStr)) {
                console.log(`Fixing Appointment ${appt.id}: Setting status to 'concluido'`);
                await appt.update({ status: 'concluido' }, { transaction });
            }
        }

        // 2. Fix Luciana Souza (Client 52)
        // IDs identified: 61, 63, 64, 65, 66
        const client52Appts = await Appointment.findAll({
            where: {
                client_id: 52,
                status: 'agendado'
            },
            transaction
        });

        for (const appt of client52Appts) {
            console.log(`Checking Appointment ${appt.id} (Type: ${typeof appt.id}) for Client 52...`);
            const idStr = String(appt.id);
            if (appt.consumed_sessions > 0 || ['61', '63', '64', '65', '66'].includes(idStr)) {
                console.log(`Fixing Appointment ${appt.id}: Setting status to 'concluido'`);
                await appt.update({ status: 'concluido' }, { transaction });
            }
        }

        // 3. General fix: Any appointment with consumed_sessions > 0 and status 'agendado'
        const generalFix = await Appointment.findAll({
            where: {
                status: 'agendado',
                consumed_sessions: { [sequelize.Sequelize.Op.gt]: 0 }
            },
            transaction
        });

        for (const appt of generalFix) {
            console.log(`General Fix: Appointment ${appt.id} (Client ${appt.client_id}) has consumed sessions but is 'agendado'. Fixing...`);
            await appt.update({ status: 'concluido' }, { transaction });
        }

        await transaction.commit();
        console.log('Fix completed successfully.');

    } catch (error) {
        await transaction.rollback();
        console.error('Error fixing session status:', error);
    } finally {
        process.exit();
    }
}

fixSessionStatus();
