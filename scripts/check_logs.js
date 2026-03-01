const { AuditLog, User, Tenant } = require('../src/models');

async function checkLogs() {
    try {
        console.log('--- Checking Audit Logs ---');
        const count = await AuditLog.count();
        console.log(`Total logs: ${count}`);

        const lastLogs = await AuditLog.findAll({
            limit: 10,
            order: [['created_at', 'DESC']],
            include: [
                { model: User, as: 'user' },
                { model: Tenant, as: 'tenant' }
            ]
        });

        if (lastLogs.length === 0) {
            console.log('No logs found!');
        } else {
            lastLogs.forEach(log => {
                console.log(`[${log.created_at}] Action: ${log.action}, Entity: ${log.entity}, User: ${log.user?.name}, Tenant: ${log.tenant?.name}, Unit ID: ${log.unit_id}`);
            });
        }

        // Check if there are any logs for TODAY
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await AuditLog.count({
            where: {
                created_at: {
                    [require('sequelize').Op.gte]: today
                }
            }
        });
        console.log(`Logs recorded today: ${todayCount}`);

    } catch (error) {
        console.error('Error checking logs:', error);
    } finally {
        process.exit();
    }
}

checkLogs();
