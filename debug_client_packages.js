const { Client, PackageSubscription, SalonPlanSubscription, MonthlyPackage, SalonPlan } = require('./src/models');
const sequelize = require('./src/config/db');
const { Op } = require('sequelize');

async function findClientWithData() {
    try {
        console.log('--- Searching for clients with packages or subscriptions ---');

        // 1. Check for legacy packages
        const clientWithLegacy = await Client.findOne({
            where: {
                packages: { [Op.ne]: [] }
            }
        });
        if (clientWithLegacy) {
            console.log(`Found client with legacy packages: ID ${clientWithLegacy.id}`);
            console.log('Packages:', JSON.stringify(clientWithLegacy.packages, null, 2));

            // Now test the actual service logic
            const clientData = clientWithLegacy.toJSON();
            const mergedPackages = [...(clientData.packages || [])];

            if (clientData.subscriptions) {
                clientData.subscriptions.forEach(sub => {
                    if (sub.status === 'active' || sub.status === 'pending') {
                        const exists = mergedPackages.find(p => p.id === sub.id && p.type === 'package_subscription');
                        if (!exists) {
                            mergedPackages.push({
                                id: sub.id,
                                name: sub.package?.name || 'Pacote',
                                type: 'package_subscription',
                                status: sub.status,
                                price: sub.package?.price,
                                sessions: sub.total_sessions || sub.package?.sessions,
                                used_sessions: sub.sessions || 0,
                                total_sessions: sub.total_sessions || sub.package?.sessions,
                                end_date: sub.end_date,
                                start_date: sub.start_date,
                                clicks: sub.clicks || 0
                            });
                        }
                    }
                });
            }
            console.log('Merged Packages for ID 14:', JSON.stringify(mergedPackages, null, 2));
        }

        // 2. Check for PackageSubscriptions
        const sub = await PackageSubscription.findOne({
            include: [{ model: Client, as: 'client' }]
        });
        if (sub) {
            console.log(`Found PackageSubscription: ID ${sub.id}, Client ID: ${sub.client_id}`);
            if (sub.client) {
                console.log(`Client ${sub.client_id} name: ${sub.client.name}`);
            }
        } else {
            console.log('No PackageSubscriptions found.');
        }

        // 3. Check for SalonPlanSubscriptions
        const planSub = await SalonPlanSubscription.findOne({
            include: [{ model: Client, as: 'client' }]
        });
        if (planSub) {
            console.log(`Found SalonPlanSubscription: ID ${planSub.id}, Client ID: ${planSub.client_id}`);
            if (planSub.client) {
                console.log(`Client ${planSub.client_id} name: ${planSub.client.name}`);
            }
        } else {
            console.log('No SalonPlanSubscriptions found.');
        }

    } catch (error) {
        console.error('Search failed:', error);
    } finally {
        await sequelize.close();
    }
}

findClientWithData();
