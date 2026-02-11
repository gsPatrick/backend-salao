const { Client } = require('./src/models');
const { Op } = require('sequelize');

async function checkClients() {
    try {
        const clients = await Client.findAll({
            where: { is_active: true },
            attributes: ['id', 'name', 'last_visit', 'unit_id', 'tenant_id'],
            order: [['last_visit', 'DESC']]
        });

        console.log('Clients with last_visit:');
        clients.forEach(c => {
            console.log(`- ID: ${c.id}, Name: ${c.name}, Last Visit: ${c.last_visit}, Unit: ${c.unit_id}, Tenant: ${c.tenant_id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkClients();
