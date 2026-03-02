require('dotenv').config();
const { Client, sequelize } = require('../src/models');
const clientService = require('../src/features/Client/client.service');

async function recalculateAllStats() {
    try {
        console.log('Starting statistics recalculation for ALL clients...');

        const clients = await Client.findAll({
            attributes: ['id', 'name'],
            where: { is_active: true } // Only active clients
        });

        console.log(`Found ${clients.length} active clients.`);

        for (const client of clients) {
            console.log(`Processing client ${client.id} - ${client.name}...`);
            await clientService.updateStatistics(client.id);
        }

        console.log('Recalculation complete!');
        process.exit(0);

    } catch (error) {
        console.error('Error recalculating stats:', error);
        process.exit(1);
    }
}

recalculateAllStats();
