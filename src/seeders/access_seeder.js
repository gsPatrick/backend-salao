const { User, Tenant, sequelize } = require('../models');

async function seedAccess() {
    try {
        console.log('🌱 Starting access seeding...');
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced');

        // Find or create the main tenant
        let tenant = await Tenant.findByPk(1);
        if (!tenant) {
            tenant = await Tenant.create({
                name: 'Salão24h Matriz',
                slug: 'salao24h-matriz-access',
                plan_id: 1, // Assume plan 1 is Individual or similar
                subscription_status: 'active'
            });
        }

        const accessUsers = [
            {
                name: 'Wagner Admin',
                email: 'admin@salao24h.com',
                password: 'admin',
                role: 'admin',
                is_super_admin: true,
                tenant_id: tenant.id
            },
            {
                name: 'Carlos Gerente',
                email: 'gerente@salao24h.com',
                password: '123',
                role: 'gerente',
                is_super_admin: false,
                tenant_id: tenant.id
            },
            {
                name: 'Fernanda Profissional',
                email: 'fernanda@salao24h.com',
                password: '123',
                role: 'profissional',
                is_super_admin: false,
                tenant_id: tenant.id
            },
            {
                name: 'João Cliente',
                email: 'cliente@salao24h.com',
                password: '123',
                role: 'cliente',
                is_super_admin: false,
                tenant_id: tenant.id
            }
        ];

        for (const userData of accessUsers) {
            const [user, created] = await User.findOrCreate({
                where: { email: userData.email },
                defaults: userData
            });

            if (!created) {
                // Update password and role to ensure they are correct
                user.password = userData.password;
                user.role = userData.role;
                user.name = userData.name;
                user.tenant_id = userData.tenant_id;
                user.is_super_admin = userData.is_super_admin;
                await user.save();
                console.log(`✅ Updated user: ${userData.email}`);
            } else {
                console.log(`✅ Created user: ${userData.email}`);
            }
        }

        console.log('🎉 Access seeding completed!');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        process.exit(0);
    }
}

seedAccess();
