
const clientService = require('../features/Client/client.service');

async function updateStats() {
    try {
        console.log('Fetching all clients...');
        const { Client } = require('../models');
        const clients = await Client.findAll({ attributes: ['id', 'status'] });

        console.log(`Found ${clients.length} clients. Updating stats...`);

        for (const client of clients) {
            await clientService.updateStatistics(client.id);
        }

        console.log('All clients updated.');
    } catch (error) {
        console.error('Error updating stats:', error);
    } finally {
        process.exit();
    }
}

updateStats();
