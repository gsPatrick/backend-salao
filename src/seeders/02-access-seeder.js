const { User, Tenant, sequelize } = require('../models');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log('🌱 Starting access seeding...');

            // Find or create the main tenant
            let tenant = await Tenant.findByPk(1);
            if (!tenant) {
                const firstPlan = await sequelize.models.Plan.findOne();
                tenant = await Tenant.create({
                    name: 'Salão24h Matriz',
                    slug: 'salao24h-matriz-access',
                    plan_id: firstPlan ? firstPlan.id : 1,
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
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Handle migration back if needed
    }
};
