const { MonthlyPackage, PackageSubscription, SalonPlan, SalonPlanSubscription, Client } = require('../models');

async function fixSessionData() {
    try {
        console.log('--- Starting Session Data Sync ---');

        // 1. Fix PackageSubscriptions
        console.log('\nFixing PackageSubscriptions (populating total_sessions)...');
        const subscriptions = await PackageSubscription.findAll({
            where: { total_sessions: null },
            include: [{ model: MonthlyPackage, as: 'package', attributes: ['sessions'] }]
        });

        console.log(`Found ${subscriptions.length} subscriptions to fix.`);
        for (const sub of subscriptions) {
            const total = parseInt(sub.package?.sessions) || null;
            if (total !== null) {
                await sub.update({ total_sessions: total });
                console.log(`  Updated sub ID ${sub.id}: total_sessions = ${total}`);
            }
        }

        // 2. Create SalonPlanSubscriptions for existing clients with plans
        console.log('\nCreating SalonPlanSubscriptions for clients with plans...');
        const clientsWithPlans = await Client.findAll({
            where: { is_active: true },
            include: [{ model: SalonPlan, as: 'salon_plan', attributes: ['id', 'sessions'] }]
        });

        // Filter clients that actually have a plan_id but no active subscription
        const clientsToSub = [];
        for (const client of clientsWithPlans) {
            if (client.plan_id) {
                const existingSub = await SalonPlanSubscription.findOne({
                    where: { client_id: client.id, plan_id: client.plan_id, status: 'active' }
                });
                if (!existingSub) {
                    clientsToSub.push(client);
                }
            }
        }

        console.log(`Found ${clientsToSub.length} clients needing plan subscriptions.`);
        for (const client of clientsToSub) {
            const total = parseInt(client.salon_plan?.sessions) || null;
            await SalonPlanSubscription.create({
                tenant_id: client.tenant_id,
                unit_id: client.unit_id,
                client_id: client.id,
                plan_id: client.plan_id,
                start_date: client.created_at || new Date(),
                status: 'active',
                used_sessions: 0,
                total_sessions: total
            });
            console.log(`  Created plan sub for client ID ${client.id} (Plan: ${client.plan_id}, Total: ${total})`);
        }

        console.log('\n--- Session Data Sync Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('\nError fixing session data:', error);
        process.exit(1);
    }
}

fixSessionData();
