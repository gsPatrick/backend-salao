const { Client, sequelize } = require('../models');

async function syncCRMTags() {
    try {
        console.log('Starting CRM Tag Synchronization...');

        // 1. Sync New Clients (new -> Nova)
        const newClients = await Client.update(
            { classification: 'Nova' },
            {
                where: {
                    crm_stage: 'new',
                    classification: null
                }
            }
        );
        console.log(`Updated ${newClients[0]} clients to 'Nova'`);

        // 2. Sync Scheduled Clients (scheduled -> Agendado)
        const scheduledClients = await Client.update(
            { classification: 'Agendado' },
            {
                where: {
                    crm_stage: 'scheduled',
                    classification: null
                }
            }
        );
        console.log(`Updated ${scheduledClients[0]} clients to 'Agendado'`);

        // 3. Sync Inactive Clients (inactive -> Inativa)
        const inactiveClients = await Client.update(
            { classification: 'Inativa' },
            {
                where: {
                    crm_stage: 'inactive',
                    classification: null
                }
            }
        );
        console.log(`Updated ${inactiveClients[0]} clients to 'Inativa'`);

        // 4. Sync Recurrent Clients (recurrent -> Recorrente)
        const recurrentClients = await Client.update(
            { classification: 'Recorrente' },
            {
                where: {
                    crm_stage: 'recurrent',
                    classification: null
                }
            }
        );
        console.log(`Updated ${recurrentClients[0]} clients to 'Recorrente'`);

        // 5. Explicitly fix Pedro Augusto if needed (by name match, safer than ID)
        // If the user meant "marcado commo X errado", this general fix might not cover it 
        // if classification IS NOT NULL but WRONG.
        // Let's FORCE update for known stages regardless of null if we want to be strict.
        // User rule: "A tag do cliente deve sempre corresponder à coluna onde ele está."
        // So yes, FORCE update even if not null.

        console.log('Forcing strict sync for ALL clients...');

        await Client.update({ classification: 'Nova' }, { where: { crm_stage: 'new' } });
        await Client.update({ classification: 'Agendado' }, { where: { crm_stage: 'scheduled' } });
        await Client.update({ classification: 'Inativa' }, { where: { crm_stage: 'inactive' } });
        await Client.update({ classification: 'Recorrente' }, { where: { crm_stage: 'recurrent' } });
        await Client.update({ classification: 'Atendido' }, { where: { crm_stage: 'completed' } }); // Assuming completed stage exists? Usually 'atendido' status not stage.

        console.log('CRM Tag Synchronization Complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing CRM tags:', error);
        process.exit(1);
    }
}

syncCRMTags();
