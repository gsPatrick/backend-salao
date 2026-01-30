const bcrypt = require('bcryptjs');
const { Plan, Tenant, User, Client, Professional, Service, AIAgentConfig, sequelize } = require('../models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        return seedDatabaseLogic();
    },

    down: async (queryInterface, Sequelize) => {
    }
};

async function seedDatabaseLogic() {
    try {
        console.log('🌱 Starting database seeding...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced');

        // 1. Create Plans
        console.log('📋 Creating plans...');
        await Plan.bulkCreate([
            {
                name: 'individual',
                display_name: 'Individual',
                price: 79.87,
                max_professionals: 1,
                max_clients: null,
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
                display_name: 'Essencial',
                price: 199.90,
                max_professionals: 3,
                max_clients: null,
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
                display_name: 'Pro',
                price: 349.90,
                max_professionals: 10,
                max_clients: null,
                max_units: 5,
                ai_voice_response: true,
                priority_support: false,
                whatsapp_integration: true,
                financial_reports: true,
                marketing_campaigns: true,
                is_active: true,
            },
            {
                name: 'premium',
                display_name: 'Premium',
                price: 599.90,
                max_professionals: null, // Unlimited
                max_clients: null,
                max_units: 999,
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

        const allPlans = await Plan.findAll();
        console.log(`✅ Processed ${allPlans.length} plans`);

        // Get the requested plans
        const vitalicioPlan = allPlans.find(p => p.name === 'vitalicio');
        const proPlan = allPlans.find(p => p.name === 'pro');

        if (!vitalicioPlan) throw new Error('Vitalicio plan not found after creation');
        if (!proPlan) throw new Error('Pro plan not found after creation');

        // 2. Create/Update main Tenant (ID 1 preference)
        console.log('🏢 Processing main tenant...');
        let tenant = await Tenant.findByPk(1);
        if (tenant) {
            await tenant.update({
                name: 'Salão24h Matriz',
                slug: 'salao24h-matriz',
                plan_id: vitalicioPlan.id,
                subscription_status: 'active'
            });
        } else {
            [tenant] = await Tenant.findOrCreate({
                where: { slug: 'salao24h-matriz' },
                defaults: {
                    name: 'Salão24h Matriz',
                    plan_id: vitalicioPlan.id,
                    is_active: true,
                    subscription_status: 'active'
                }
            });
        }
        console.log(`✅ Main tenant ready: ${tenant.name} (ID: ${tenant.id})`);

        // 3. Create/Update Super Admin user (Wagner)
        console.log('👤 Processing Super Admin user...');
        const [superAdmin] = await User.findOrCreate({
            where: { email: 'admin@salao24h.com' },
            defaults: {
                tenant_id: tenant.id,
                name: 'Wagner Vicente',
                password: 'admin',
                role: 'admin',
                is_super_admin: true,
                is_active: true,
            }
        });

        await superAdmin.update({
            tenant_id: tenant.id,
            is_super_admin: true
        });
        console.log(`✅ Super Admin ready: ${superAdmin.email} linked to Tenant ${tenant.id}`);

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

        // 6. Create Professionals
        console.log('💇 Creating professionals...');
        await Professional.findOrCreate({
            where: { name: 'Wagner Vicente', tenant_id: tenant.id },
            defaults: {
                tenant_id: tenant.id,
                user_id: superAdmin.id,
                name: 'Wagner Vicente',
                occupation: 'Corte e Barba',
                is_suspended: false
            }
        });

        await Professional.findOrCreate({
            where: { name: 'Fernanda Lima', tenant_id: tenant.id },
            defaults: {
                tenant_id: tenant.id,
                name: 'Fernanda Lima',
                occupation: 'Colorimetria',
                is_suspended: false
            }
        });

        // 7. Create Services
        console.log('✂️ Creating services...');
        await Service.findOrCreate({
            where: { name: 'Corte Masculino', tenant_id: tenant.id },
            defaults: {
                tenant_id: tenant.id,
                name: 'Corte Masculino',
                description: 'Corte moderno com lavagem.',
                price: 50.00,
                duration: 30,
                is_suspended: false
            }
        });

        await Service.findOrCreate({
            where: { name: 'Barba', tenant_id: tenant.id },
            defaults: {
                tenant_id: tenant.id,
                name: 'Barba',
                description: 'Toalha quente e navalha.',
                price: 35.00,
                duration: 20,
                is_suspended: false
            }
        });

        // Create AI Agent Config for Matriz
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

        // 8. Create Test Client
        console.log('👥 Creating test client...');
        const [clientUser] = await User.findOrCreate({
            where: { email: 'juliana.costa@example.com' },
            defaults: {
                tenant_id: tenant.id,
                name: 'Juliana Costa',
                password: '123',
                role: 'cliente',
                is_super_admin: false,
                is_active: true,
            }
        });

        await Client.findOrCreate({
            where: { email: 'juliana.costa@example.com', tenant_id: tenant.id },
            defaults: {
                tenant_id: tenant.id,
                name: 'Juliana Costa',
                email: 'juliana.costa@example.com',
                password: '123',
                phone: '11999999999',
                is_active: true
            }
        });
        console.log('✅ Test client ready');

        console.log('\n🎉 Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

if (require.main === module) {
    seedDatabaseLogic().then(() => process.exit(0)).catch(() => process.exit(1));
}
