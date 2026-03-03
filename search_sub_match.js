const { PackageSubscription, SalonPlanSubscription, Client } = require('./src/models');

async function test() {
    try {
        console.log('Checking PackageSubscriptions...');
        const pkgSubs = await PackageSubscription.findAll({ include: [{ model: Client, as: 'client' }] });
        pkgSubs.forEach(s => {
            const used = s.clicks || 0;
            const total = s.total_sessions || 0;
            if ((used == 3 && total == 3) || (used == 2 && total == 12)) {
                console.log(`Match in PackageSub! Client: ${s.client?.name} (ID: ${s.client_id}), ${used}/${total}`);
            }
        });

        console.log('Checking SalonPlanSubscriptions...');
        const planSubs = await SalonPlanSubscription.findAll({ include: [{ model: Client, as: 'client' }] });
        planSubs.forEach(s => {
            const used = s.used_sessions || 0;
            const total = s.total_sessions || 0;
            if ((used == 3 && total == 3) || (used == 2 && total == 12)) {
                console.log(`Match in PlanSub! Client: ${s.client?.name} (ID: ${s.client_id}), ${used}/${total}`);
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

test();
