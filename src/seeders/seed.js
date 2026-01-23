const bcrypt = require('bcryptjs');
const { Plan, Tenant, User, AIAgentConfig, sequelize } = require('../models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // We call our internal function. Note: seedDatabase handles its own process.exit, 
        // but when called via up() we want to let Sequelize handle it.
        // However, seedDatabase is async. Let's refactor slightly to separate logic.
        return seedDatabaseLogic();
    },

    down: async (queryInterface, Sequelize) => {
        // Implementation for rollback if needed
    }
};

async function seedDatabaseLogic() {
    try {
        console.log('🌱 Starting database seeding...');

        // Sync all models (create tables)
        // Note: Using sync() in seeds can be risky in production, but here we want to ensure tables exist and are up to date.
        await sequelize.sync({ alter: true });
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
                max_units: 999, // unlimited
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
                max_units: 999,
                ai_voice_response: true,
                priority_support: true,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: true,
                is_active: true,
            },
        ], { ignoreDuplicates: true });
        console.log(`✅ Created ${plans.length} plans`);

        // Get the Vitalício plan for Super Admin
        const vitalicioPlan = plans.find(p => p.name === 'vitalicio');
        const proPlan = plans.find(p => p.name === 'pro');

        if (!proPlan) throw new Error('Pro plan not found after creation');

        // 2. Create first Tenant (Salão 24h Demo)
        console.log('🏢 Creating default tenant...');
        const [tenant] = await Tenant.findOrCreate({
            where: { slug: 'salao24h-demo' },
            defaults: {
                name: 'Salão 24h Demo',
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
            }
        });
        console.log(`✅ Created/Found tenant: ${tenant.name}`);

        // 3. Create Super Admin user (Wagner)
        console.log('👤 Creating Super Admin user...');
        const [superAdmin] = await User.findOrCreate({
            where: { email: 'admin@salao24h.com' },
            defaults: {
                tenant_id: null,
                name: 'Wagner Vicente',
                password: 'admin',
                avatar_url: 'https://i.pravatar.cc/150?u=whagnervicente',
                role: 'admin',
                is_super_admin: true,
                is_active: true,
                permissions: {},
            }
        });
        console.log(`✅ Created/Found Super Admin: ${superAdmin.email}`);

        // 4. Create tenant admin user
        console.log('👤 Creating tenant admin user...');
        const [tenantAdmin] = await User.findOrCreate({
            where: { email: 'gerente@salao24h.com' },
            defaults: {
                tenant_id: tenant.id,
                name: 'Carlos Gerente',
                password: '123',
                avatar_url: 'https://i.pravatar.cc/150?u=gerente',
                role: 'gerente',
                is_super_admin: false,
                is_active: true,
                permissions: {},
            }
        });
        console.log(`✅ Created/Found tenant admin: ${tenantAdmin.email}`);

        // 5. Create other users for testing
        console.log('👤 Creating additional users...');
        const userDatas = [
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
        ];

        for (const u of userDatas) {
            await User.findOrCreate({
                where: { email: u.email },
                defaults: u
            });
        }
        console.log(`✅ Processed additional users`);

        // Update tenant with owner
        await tenant.update({ owner_user_id: tenantAdmin.id });

        // Create AI Agent Config for Demo
        console.log('🤖 Creating AI Agent config...');
        await AIAgentConfig.findOrCreate({
            where: { tenant_id: tenant.id },
            defaults: {
                zapi_instance_id: '3EDA29EB314652490154DA5DEAAACE51',
                active_plan: 'Avançada',
                is_voice_enabled: true,
                personality: 'Wagner Vicente (Idealizador)',
                prompt_behavior: 'Seja o Wagner, o criador do Salão24h. Seja carismático, proativo e ajude os clientes com agendamentos e dúvidas sobre a plataforma.'
            }
        });

        console.log('\n🎉 Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabaseLogic().then(() => process.exit(0)).catch(() => process.exit(1));
}
