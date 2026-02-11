const { Client, PackageSubscription, MonthlyPackage, SalonPlan, SalonPlanSubscription } = require('./src/models');
const sequelize = require('./src/config/db');
const { Op } = require('sequelize');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // 1. Fix missing Package Subscriptions
        const clientsWithPackages = await Client.findAll({
            where: {
                package_id: { [Op.ne]: null }
            }
        });

        console.log(`Found ${clientsWithPackages.length} clients with packages assigned.`);

        for (const client of clientsWithPackages) {
            const hasSub = await PackageSubscription.findOne({
                where: { client_id: client.id, package_id: client.package_id, status: 'active' }
            });

            if (!hasSub) {
                console.log(`Creating missing PackageSubscription for Client ${client.id} (Package ${client.package_id})...`);
                const pkg = await MonthlyPackage.findByPk(client.package_id);
                if (pkg) {
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + (parseInt(pkg.duration) || 1));

                    await PackageSubscription.create({
                        tenant_id: client.tenant_id,
                        client_id: client.id,
                        package_id: client.package_id,
                        client_name: client.name,
                        client_email: client.email,
                        client_phone: client.phone,
                        start_date: startDate,
                        end_date: endDate,
                        status: 'active',
                        active: true,
                        total_sessions: parseInt(pkg.sessions) || null,
                        clicks: 0,
                        unit_id: client.unit_id
                    });
                }
            }
        }

        // 2. Fix missing Plan Subscriptions
        const clientsWithPlans = await Client.findAll({
            where: {
                plan_id: { [Op.ne]: null }
            }
        });

        console.log(`Found ${clientsWithPlans.length} clients with plans assigned.`);

        for (const client of clientsWithPlans) {
            const hasSub = await SalonPlanSubscription.findOne({
                where: { client_id: client.id, plan_id: client.plan_id, status: 'active' }
            });

            if (!hasSub) {
                console.log(`Creating missing SalonPlanSubscription for Client ${client.id} (Plan ${client.plan_id})...`);
                const plan = await SalonPlan.findByPk(client.plan_id);
                if (plan) {
                    await SalonPlanSubscription.create({
                        tenant_id: client.tenant_id,
                        client_id: client.id,
                        plan_id: client.plan_id,
                        start_date: new Date(),
                        status: 'active',
                        active: true,
                        total_sessions: parseInt(plan.sessions) || null,
                        used_sessions: 0,
                        unit_id: client.unit_id
                    });
                }
            }
        }

        console.log('Migration complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
