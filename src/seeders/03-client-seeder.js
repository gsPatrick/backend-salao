const { Client, Tenant, sequelize } = require('../models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log('🌱 Starting client seeding (Clients table)...');

            const tenant = await Tenant.findOne();
            if (!tenant) {
                console.log('⚠️ No tenant found, skipping.');
                return;
            }

            const clients = [
                {
                    name: 'Juliana Costa',
                    email: 'juliana.costa@example.com',
                    password: '123',
                    phone: '11999999999',
                    tenant_id: tenant.id,
                    is_active: true,
                    status: 'active'
                }
            ];

            for (const clientData of clients) {
                const [client, created] = await Client.findOrCreate({
                    where: { email: clientData.email },
                    defaults: clientData
                });

                if (!created) {
                    await client.update(clientData);
                    console.log(`✅ Updated client: ${client.email}`);
                } else {
                    console.log(`✅ Created client: ${client.email}`);
                }
            }
            console.log('🎉 Client seeding completed!');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    },
    down: async () => { }
};
