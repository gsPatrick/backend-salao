const { Client, PackageSubscription, SalonPlanSubscription, MonthlyPackage, SalonPlan } = require('./src/models');

async function test() {
    try {
        const client = await Client.findByPk(68, {
            include: [
                { model: PackageSubscription, as: 'subscriptions', include: [{ model: MonthlyPackage, as: 'package' }] },
                { model: SalonPlanSubscription, as: 'plan_subscriptions', include: [{ model: SalonPlan, as: 'plan' }] }
            ]
        });

        if (!client) {
            console.log('Client 68 not found');
            return;
        }

        console.log('Client Name:', client.name);
        console.log('JSONB Packages:', JSON.stringify(client.packages, null, 2));
        
        console.log('Associated Subscriptions:', client.subscriptions.length);
        client.subscriptions.forEach(s => {
            console.log(`- Sub ID ${s.id}: ${s.package?.name}, Clicks: ${s.clicks}, Total: ${s.total_sessions}`);
        });

        console.log('Associated Plan Subscriptions:', client.plan_subscriptions.length);
        client.plan_subscriptions.forEach(s => {
            console.log(`- Plan Sub ID ${s.id}: ${s.plan?.name}, Used: ${s.used_sessions}, Total: ${s.total_sessions}`);
        });

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit();
    }
}

test();
