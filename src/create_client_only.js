const { Client, Tenant, sequelize } = require('./models');

async function createClientOnly() {
    try {
        console.log('🔍 Checking for Test Client...');

        // 1. Get Tenant (needed for foreign key)
        const tenant = await Tenant.findOne();
        if (!tenant) {
            console.error('❌ No Tenant found! Cannot create client without a tenant.');
            return;
        }
        console.log(`🏢 Using Tenant: ${tenant.name} (ID: ${tenant.id})`);

        // 2. Find or Create Client
        const [client, created] = await Client.findOrCreate({
            where: { email: 'juliana.costa@example.com' },
            defaults: {
                tenant_id: tenant.id,
                name: 'Juliana Costa',
                password: '123', // Plain text as per your current setup logic
                phone: '11999999999',
                is_active: true,
                status: 'active'
            }
        });

        if (created) {
            console.log('✅ Client CREATED successfully!');
        } else {
            console.log('ℹ️ Client ALREADY EXISTS.');
            // Ensure password and tenant are correct even if exists
            await client.update({
                password: '123',
                tenant_id: tenant.id
            });
            console.log('   (Updated password and tenant to ensure correctness)');
        }

        console.log('\n👤 Client Details:');
        console.log(`   Name: ${client.name}`);
        console.log(`   Email: ${client.email}`);
        console.log(`   Password: ${client.password}`);
        console.log(`   ID: ${client.id}`);

    } catch (error) {
        console.error('❌ Error creating client:', error);
    } finally {
        await sequelize.close();
    }
}

createClientOnly();
