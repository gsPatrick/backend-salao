const { Client } = require('../models');
const { Op } = require('sequelize');
const crmAutomationExecutor = require('./crm_automation_executor.service');

class CRMAutomationCronService {

    async processTenant(tenantId) {
        console.log(`[CRM Cron] Starting batch processing for Tenant ${tenantId}`);
        const BATCH_SIZE = 50;
        let offset = 0;
        let totalProcessed = 0;

        while (true) {
            const clients = await Client.findAll({
                where: {
                    tenant_id: tenantId,
                    is_active: true,
                    status: { [Op.ne]: 'blocked' } // Don't automation blocked clients
                },
                limit: BATCH_SIZE,
                offset: offset,
                order: [['id', 'ASC']]
            });

            if (clients.length === 0) break;

            await Promise.all(clients.map(async (client) => {
                try {
                    await crmAutomationExecutor.checkTimeRules(client, tenantId);
                } catch (e) {
                    console.error(`[CRM Cron] Error validating client ${client.id}:`, e.message);
                }
            }));

            totalProcessed += clients.length;
            offset += BATCH_SIZE;

            // Safety Delay to prevent CPU spikes
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`[CRM Cron] Finished. Processed ${totalProcessed} clients for Tenant ${tenantId}`);
    }
}

module.exports = new CRMAutomationCronService();
