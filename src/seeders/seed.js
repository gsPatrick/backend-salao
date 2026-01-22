const bcrypt = require('bcryptjs');
const { Plan, Tenant, User, sequelize } = require('../models');

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Sync all models (create tables)
        await sequelize.sync({ force: true });
        console.log('✅ Database synced');

        // 1. Create Plans
        console.log('📋 Creating plans...');
        const plans = await Plan.bulkCreate([
            {
                name: 'individual',
                display_name: 'Individual',
                price: 79.87,
                max_professionals: 1,
                max_clients: 100,
                max_units: 1,
                ai_voice_response: false,
                priority_support: false,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: false,
                is_active: true,
            },
            {
                name: 'essencial',
                display_name: 'Empresa Essencial',
                price: 199.90,
                max_professionals: 5,
                max_clients: 500,
                max_units: 1,
                ai_voice_response: false,
                priority_support: false,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: true,
                is_active: true,
            },
            {
                name: 'pro',
                display_name: 'Empresa Pro',
                price: 349.90,
                max_professionals: 15,
                max_clients: null, // unlimited
                max_units: 3,
                ai_voice_response: true,
                priority_support: false,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: true,
                is_active: true,
            },
            {
                name: 'premium',
                display_name: 'Empresa Premium',
                price: 599.90,
                max_professionals: null, // unlimited
                max_clients: null, // unlimited
                max_units: null, // unlimited
                ai_voice_response: true,
                priority_support: true,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: true,
                is_active: true,
            },
            {
                name: 'vitalicio',
                display_name: 'Vitalício',
                price: 0,
                max_professionals: null,
                max_clients: null,
                max_units: null,
                ai_voice_response: true,
                priority_support: true,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: true,
                is_active: true,
            },
        ]);
        console.log(`✅ Created ${plans.length} plans`);

        // Get the Vitalício plan for Super Admin
        const vitalicioPlan = plans.find(p => p.name === 'vitalicio');
        const proPlan = plans.find(p => p.name === 'pro');

        // 2. Create first Tenant (Salão 24h Demo)
        console.log('🏢 Creating default tenant...');
        const tenant = await Tenant.create({
            name: 'Salão 24h Demo',
            slug: 'salao24h-demo',
            plan_id: proPlan.id,
            phone: '(81) 3333-4444',
            email: 'contato@salao24h.com',
            address: {
                street: 'Rua das Flores',
                number: '123',
                neighborhood: 'Boa Viagem',
                city: 'Recife',
                state: 'PE',
                cep: '51020-000',
            },
            is_active: true,
            subscription_status: 'active',
        });
        console.log(`✅ Created tenant: ${tenant.name}`);

        // 3. Create Super Admin user (Wagner)
        console.log('👤 Creating Super Admin user...');
        const superAdmin = await User.create({
            tenant_id: null, // Super Admin doesn't belong to a tenant
            name: 'Wagner Vicente',
            email: 'admin@salao24h.com',
            password: 'admin', // Will be hashed by hook
            avatar_url: 'https://i.pravatar.cc/150?u=whagnervicente',
            role: 'admin',
            is_super_admin: true,
            is_active: true,
            permissions: {},
        });
        console.log(`✅ Created Super Admin: ${superAdmin.email}`);

        // 4. Create tenant admin user
        console.log('👤 Creating tenant admin user...');
        const tenantAdmin = await User.create({
            tenant_id: tenant.id,
            name: 'Carlos Gerente',
            email: 'gerente@salao24h.com',
            password: '123', // Will be hashed by hook
            avatar_url: 'https://i.pravatar.cc/150?u=gerente',
            role: 'gerente',
            is_super_admin: false,
            is_active: true,
            permissions: {},
        });
        console.log(`✅ Created tenant admin: ${tenantAdmin.email}`);

        // 5. Create other users for testing
        console.log('👤 Creating additional users...');
        const additionalUsers = await User.bulkCreate([
            {
                tenant_id: tenant.id,
                name: 'Ana Concierge',
                email: 'concierge@salao24h.com',
                password: '123',
                avatar_url: 'https://i.pravatar.cc/150?u=concierge',
                role: 'recepcao',
                is_super_admin: false,
                is_active: true,
            },
            {
                tenant_id: tenant.id,
                name: 'Fernanda Lima',
                email: 'fernanda@salao24h.com',
                password: '123',
                avatar_url: 'https://i.pravatar.cc/150?u=fernanda',
                role: 'profissional',
                is_super_admin: false,
                is_active: true,
            },
            {
                tenant_id: tenant.id,
                name: 'Maria Silva',
                email: 'maria@salao24h.com',
                password: '123',
                avatar_url: 'https://i.pravatar.cc/150?u=maria',
                role: 'profissional',
                is_super_admin: false,
                is_active: true,
            },
        ], { individualHooks: true }); // individualHooks to trigger password hashing
        console.log(`✅ Created ${additionalUsers.length} additional users`);

        // Update tenant with owner
        await tenant.update({ owner_user_id: tenantAdmin.id });

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📝 Login credentials:');
        console.log('   Super Admin: admin@salao24h.com / admin');
        console.log('   Gerente: gerente@salao24h.com / 123');
        console.log('   Concierge: concierge@salao24h.com / 123');
        console.log('   Profissional: fernanda@salao24h.com / 123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
