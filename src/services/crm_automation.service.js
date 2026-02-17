const crmAutomationExecutor = require('./crm_automation_executor.service');
const { Plan, Tenant } = require('../models');

class CRMAutomationService {

    async isAIEnabled(tenantId) {
        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });
        if (!tenant || !tenant.plan) return false;
        // Check for Pro/Premium or specific AI flag if added
        const planName = tenant.plan.name.toLowerCase();
        return ['pro', 'premium', 'superadmin', 'gold', 'diamond'].some(p => planName.includes(p));
    }

    async runDailyChecks() {
        console.log('[CRM Automation] Starting daily checks...');
        const tenants = await Tenant.findAll();

        for (const tenant of tenants) {
            try {
                // ROUTER: AI Daily Checks
                if (await this.isAIEnabled(tenant.id)) {
                    // Start Cron Job for this tenant via Executor (logic to occur in crm_cron)
                    // But for now, we just skip legacy daily checks if we want full AI control
                    // OR we let them run in parallel.
                    // The plan said "Daily Cron Job... Checks inactivity".
                    // We will implement that in a separate crm_cron.service.js as planned.
                    // So here we might want to SKIP legacy checks to avoid double moves.
                    console.log(`[CRM Automation] Tenant ${tenant.id} is AI Enabled. Creating Batch Job.`);
                    const crmCron = require('./crm_automation_cron.service');
                    await crmCron.processTenant(tenant.id);
                    continue;
                }

                await this.processTenantCRM(tenant.id);
            } catch (error) {
                console.error(`[CRM Automation] Error processing tenant ${tenant.id}:`, error);
            }
        }
    }

    async processTenantCRM(tenantId) {
        // Daily scan only for Birthdays (can't be real-time based on creation event)
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        if (!settings || !settings.funnel_stages) return;

        const birthdayStage = settings.funnel_stages.find(s => s.id === 'birthday');
        if (birthdayStage && birthdayStage.ai_actions && Array.isArray(birthdayStage.ai_actions)) {
            const activeActions = birthdayStage.ai_actions.filter(a => a.active);
            if (activeActions.length > 0) {
                await this.handleBirthdaysDaily(tenantId, birthdayStage, activeActions);
            }
        }

        // Check for Inactive Clients (60+ days)
        const inactiveStage = settings.funnel_stages.find(s => s.id === 'inactive');
        if (inactiveStage) {
            await this.handleInactiveDaily(tenantId, inactiveStage);
        }

        // Check for Recurrent Clients (active within 60 days)
        const recurrentStage = settings.funnel_stages.find(s => s.id === 'recurrent');
        if (recurrentStage) {
            await this.handleRecurrentDaily(tenantId, recurrentStage);
        }
    }

    // --- Real-time Handlers (triggered by Service Hooks) ---

    async handleNewClient(tenantId, client) {
        // ROUTER: AI Real-time
        if (await this.isAIEnabled(tenantId)) {
            return crmAutomationExecutor.enqueue(tenantId, 'client_created', { clientId: client.id });
        }

        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const stage = settings?.funnel_stages?.find(s => s.id === 'new');
        if (stage && stage.ai_actions && Array.isArray(stage.ai_actions)) {
            for (const action of stage.ai_actions) {
                if (action.active) {
                    await this.triggerRobotAction(tenantId, client, stage, action);
                }
            }
        }
    }

    async handleScheduledToday(tenantId, client, appointment) {
        // ROUTER: AI Real-time
        if (await this.isAIEnabled(tenantId)) {
            return crmAutomationExecutor.enqueue(tenantId, 'appointment_today', { clientId: client.id, appointmentId: appointment.id });
        }

        const today = new Date().toISOString().split('T')[0];
        if (appointment.date !== today) return; // Only trigger for today's appointments

        // Update Client CRM Stage - HANDLED BY APPOINTMENT SERVICE NOW
        // We do NOT want to overwrite 'recurrent' status here.
        // if (client.crm_stage !== 'scheduled') {
        //    await client.update({ crm_stage: 'scheduled', classification: 'Agendado' });
        //    console.log(`[CRM Automation] Client ${client.name} stage updated to 'scheduled'`);
        // }

        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const stage = settings?.funnel_stages?.find(s => s.id === 'scheduled');
        if (stage && stage.ai_actions && Array.isArray(stage.ai_actions)) {
            for (const action of stage.ai_actions) {
                if (action.active) {
                    await this.triggerRobotAction(tenantId, client, stage, action, appointment);
                }
            }
        }
    }

    async handleAbsent(tenantId, client) {
        // ROUTER: AI Real-time
        if (await this.isAIEnabled(tenantId)) {
            return crmAutomationExecutor.enqueue(tenantId, 'status_change_absent', { clientId: client.id });
        }

        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const stage = settings?.funnel_stages?.find(s => s.id === 'absent');
        if (stage && stage.ai_actions && Array.isArray(stage.ai_actions)) {
            for (const action of stage.ai_actions) {
                if (action.active) {
                    await this.triggerRobotAction(tenantId, client, stage, action);
                }
            }
        }
    }

    async handleRescheduled(tenantId, client, appointment) {
        // ROUTER: AI Real-time
        if (await this.isAIEnabled(tenantId)) {
            return crmAutomationExecutor.enqueue(tenantId, 'status_change_rescheduled', { clientId: client.id, appointmentId: appointment.id });
        }

        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const stage = settings?.funnel_stages?.find(s => s.id === 'rescheduled');
        if (stage && stage.ai_actions && Array.isArray(stage.ai_actions)) {
            for (const action of stage.ai_actions) {
                if (action.active) {
                    await this.triggerRobotAction(tenantId, client, stage, action, appointment);
                }
            }
        }
    }

    // --- Periodic Internal Helpers ---

    async handleBirthdaysDaily(tenantId, stage, activeActions) {
        const today = new Date();
        const month = today.getUTCMonth() + 1;
        const day = today.getUTCDate();

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                is_active: true,
                [Op.and]: [
                    { [Op.where]: sequelize.where(sequelize.fn('EXTRACT', sequelize.col('birth_date'), 'MONTH'), month) },
                    { [Op.where]: sequelize.where(sequelize.fn('EXTRACT', sequelize.col('birth_date'), 'DAY'), day) }
                ]
            }
        });

        for (const client of clients) {
            for (const action of activeActions) {
                await this.triggerRobotAction(tenantId, client, stage, action);
            }
        }
    }

    async triggerRobotAction(tenantId, client, stage, action, appointment = null) {
        if (!client.phone) return;

        console.log(`[CRM Robot] Triggering action '${action.title}' for client ${client.name} at stage: ${stage.title}`);

        const instruction = action.description;
        const context = `
            Você é um assistente virtual agindo no CRM. 
            O cliente está na etapa: ${stage.title}.
            Ação Específica: ${action.title}.
            Instrução do Gerente para esta ação: ${instruction}
            Dados do Cliente: Nome: ${client.name}, Telefone: ${client.phone}.
            ${appointment ? `Agendamento: ${appointment.time} de hoje.` : ''}
            Gere uma mensagem curta e amigável para o WhatsApp.
        `;

        try {
            await aiService.processMessage(tenantId, client.phone, `[SISTEMA: CRM - ${stage.title} - ${action.title}]`, false, context);
        } catch (error) {
            console.error(`[CRM Robot] Error triggering AI action '${action.title}' for ${client.phone}:`, error);
        }
    }
    async handleInactiveDaily(tenantId, stage) {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const dateStr = sixtyDaysAgo.toISOString().split('T')[0];

        // Find clients with lastVisit older than 60 days AND not already in 'inactive' stage
        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                lastVisit: { [Op.lt]: dateStr },
                crm_stage: { [Op.ne]: 'inactive' }
            }
        });

        if (clients.length > 0) {
            console.log(`[CRM Automation] Found ${clients.length} clients to move to Inactive (60+ days)`);
            for (const client of clients) {
                await client.update({ crm_stage: 'inactive', classification: 'Inativa' });

                // Trigger AI Actions if any
                if (stage.ai_actions && Array.isArray(stage.ai_actions)) {
                    for (const action of stage.ai_actions) {
                        if (action.active) {
                            try {
                                await this.triggerRobotAction(tenantId, client, stage, action);
                            } catch (err) {
                                console.error(`[CRM Automation] Error triggering action for inactive client ${client.id}:`, err);
                            }
                        }
                    }
                }
            }
        }
    }

    async handleRecurrentDaily(tenantId, stage) {
        // Move clients who are NOT inactive (lastVisit < 60 days ago) 
        // AND are currently in 'inactive' to 'recurrent' (revival)

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const dateStr = sixtyDaysAgo.toISOString().split('T')[0];

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                lastVisit: { [Op.gte]: dateStr },
                crm_stage: 'inactive'
            }
        });

        if (clients.length > 0) {
            console.log(`[CRM Automation] Found ${clients.length} clients to revive from Inactive to Recurrent`);
            for (const client of clients) {
                await client.update({ crm_stage: 'recurrent', classification: 'Recorrente' });
            }
        }
    }

    async getStageClassification(tenantId, stageId, defaultIcon, defaultTitle) {
        try {
            const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
            if (!settings || !settings.funnel_stages) return `${defaultIcon} ${defaultTitle}`;

            const stage = settings.funnel_stages.find(s => s.id === stageId);
            return stage ? `${stage.icon} ${stage.title}` : `${defaultIcon} ${defaultTitle}`;
        } catch (error) {
            console.error('[CRM Automation] Error fetching stage classification:', error);
            return `${defaultIcon} ${defaultTitle}`;
        }
    }
}

// Simple export for cron usage
const sequelize = require('../config/db'); // Needed for the EXTRACT helper
module.exports = new CRMAutomationService();
