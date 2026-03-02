const bcrypt = require('bcryptjs');
const { Plan, Tenant, User, Client, Unit, sequelize } = require('./models');

async function setupMinimalDatabase() {
    try {
        console.log('🔄 Resetting database (Force Sync)...');
        await sequelize.sync({ force: true });
        console.log('✅ Database reset complete.');

        // 1. Create Plans
        console.log('📋 Creating plans...');
        await Plan.bulkCreate([
            { name: 'individual', display_name: 'Individual', price: 79.87, max_professionals: 1, max_units: 1, is_active: true },
            { name: 'essencial', display_name: 'Essencial', price: 199.90, max_professionals: 3, max_units: 1, is_active: true },
            { name: 'pro', display_name: 'Pro', price: 349.90, max_professionals: 10, max_units: 5, ai_voice_response: true, is_active: true },
            { name: 'premium', display_name: 'Premium', price: 599.90, max_professionals: null, max_units: 999, ai_voice_response: true, priority_support: true, is_active: true },
            { name: 'vitalicio', display_name: 'Vitalício', price: 0, max_professionals: null, max_units: 999, ai_voice_response: true, priority_support: true, is_active: true },
        ]);

        const vitalicioPlan = await Plan.findOne({ where: { name: 'vitalicio' } });

        // 2. Create Main Tenant
        console.log('🏢 Creating Main Tenant...');
        const tenant = await Tenant.create({
            name: 'Salão24h Matriz',
            slug: 'salao24h-matriz-admin',
            plan_id: vitalicioPlan.id,
            subscription_status: 'active',
            is_active: true
        });

        // 3. Create Super Admin User
        console.log('👤 Creating Wagner Admin...');
        const admin = await User.create({
            tenant_id: tenant.id,
            name: 'Wagner Admin',
            email: 'admin@salao24h.com',
            password: 'admin', // Will be hashed by hook
            role: 'admin',
            is_super_admin: true,
            is_active: true,
        });

        // Update tenant owner
        await tenant.update({ owner_user_id: admin.id });

        // Create Default Unit
        await Unit.create({
            tenant_id: tenant.id,
            name: 'Unidade Matriz',
            is_suspended: false,
            working_hours: []
        });

        // 4. Create Test Client (in Clients table)
        console.log('👥 Creating Test Client (Juliana Costa)...');
        const client = await Client.create({
            tenant_id: tenant.id,
            name: 'Juliana Costa',
            email: 'juliana.costa@example.com',
            password: '123',
            phone: '11999999999',
            is_active: true,
            status: 'active'
        });

        console.log('\n' + '='.repeat(50));
        console.log('🎉 MINIMAL SETUP COMPLETE!');
        console.log('='.repeat(50));
        console.log(`🔑 Admin Login: admin@salao24h.com / admin`);
        console.log(`🔑 Client Login: juliana.costa@example.com / 123`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error during setup:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

setupMinimalDatabase();
