const crmAutomationExecutor = require('./crm_automation_executor.service');
const { Plan, Tenant, Client, CRMSettings, AIChat } = require('../models');
const { Op } = require('sequelize');
const aiService = require('./ai.service');

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
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        if (!settings || !settings.funnel_stages) return;

        // 1. Birthdays: Send message + apply tag "Parabéns"
        const birthdayStage = settings.funnel_stages.find(s => s.id === 'birthday');
        if (birthdayStage && birthdayStage.ai_actions && Array.isArray(birthdayStage.ai_actions)) {
            const activeActions = birthdayStage.ai_actions.filter(a => a.active);
            if (activeActions.length > 0) {
                await this.handleBirthdaysDaily(tenantId, birthdayStage, activeActions);
            }
        }

        // 2. Remove birthday tags from yesterday's birthdays
        await this.removeBirthdayTagsDaily(tenantId);

        // 3. At-Risk Clients (30-59 days without visit)
        await this.handleAtRiskDaily(tenantId, settings);

        // 4. Inactive Clients (60+ days)
        const inactiveStage = settings.funnel_stages.find(s => s.id === 'inactive');
        if (inactiveStage) {
            await this.handleInactiveDaily(tenantId, inactiveStage);
        }

        // 5. Recurrent Clients (active within 60 days, revive from inactive)
        const recurrentStage = settings.funnel_stages.find(s => s.id === 'recurrent');
        if (recurrentStage) {
            await this.handleRecurrentDaily(tenantId, recurrentStage);
        }
    }

    // --- Real-time Handlers (triggered by Service Hooks) ---

    async handleNewClient(tenantId, client) {
        // Auto-qualify: apply 'Novo' tag
        if (client.crm_stage !== 'new') {
            await client.update({ crm_stage: 'new', classification: 'Novo' });
            console.log(`[CRM Automation] Client ${client.name}: Tag 'Novo' applied`);
        }

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
        // Auto-qualify: apply 'Agendado' tag
        if (!['birthday'].includes(client.classification)) {
            await client.update({ crm_stage: 'scheduled', classification: 'Agendado' });
            console.log(`[CRM Automation] Client ${client.name}: Tag 'Agendado' applied`);
        }

        // ROUTER: AI Real-time
        if (await this.isAIEnabled(tenantId)) {
            return crmAutomationExecutor.enqueue(tenantId, 'appointment_today', { clientId: client.id, appointmentId: appointment.id });
        }

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
        // Auto-qualify: apply 'Faltou' tag
        await client.update({ crm_stage: 'absent', classification: 'Faltou' });
        console.log(`[CRM Automation] Client ${client.name}: Tag 'Faltou' applied`);

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
        const currentYear = today.getUTCFullYear();

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
            // Annual control: only send once per year
            const prefs = client.preferences || {};
            if (prefs.birthday_tag_sent_year === currentYear) {
                console.log(`[CRM Automation] Birthday already sent for ${client.name} this year. Skipping.`);
                continue;
            }

            // Apply "Parabéns" tag
            const prevClassification = client.classification;
            await client.update({
                classification: 'Parabéns',
                preferences: { ...prefs, birthday_tag_sent_year: currentYear, prev_classification: prevClassification }
            });
            console.log(`[CRM Automation] Birthday tag 'Parabéns' applied to ${client.name}`);

            // Trigger AI actions (send birthday message)
            for (const action of activeActions) {
                await this.triggerRobotAction(tenantId, client, stage, action);
            }
        }
    }

    /**
     * Remove birthday tags from yesterday's birthday clients
     */
    async removeBirthdayTagsDaily(tenantId) {
        try {
            const clients = await Client.findAll({
                where: {
                    tenant_id: tenantId,
                    classification: 'Parabéns',
                    is_active: true
                }
            });

            const today = new Date();
            const todayMonth = today.getUTCMonth() + 1;
            const todayDay = today.getUTCDate();

            for (const client of clients) {
                if (!client.birth_date) continue;
                const birthDate = new Date(client.birth_date);
                const birthMonth = birthDate.getUTCMonth() + 1;
                const birthDay = birthDate.getUTCDate();

                // If today is NOT the client's birthday, remove the tag (it was yesterday or earlier)
                if (birthMonth !== todayMonth || birthDay !== todayDay) {
                    const prefs = client.preferences || {};
                    const prevClassification = prefs.prev_classification || null;
                    await client.update({ classification: prevClassification });
                    console.log(`[CRM Automation] Birthday tag removed from ${client.name}, restored to '${prevClassification}'`);
                }
            }
        } catch (error) {
            console.error('[CRM Automation] Error removing birthday tags:', error.message);
        }
    }

    /**
     * Detect clients at risk of inactivity (30-59 days without visit)
     */
    async handleAtRiskDaily(tenantId, settings) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const clients = await Client.findAll({
                where: {
                    tenant_id: tenantId,
                    is_active: true,
                    last_visit: {
                        [Op.between]: [sixtyDaysAgo.toISOString().split('T')[0], thirtyDaysAgo.toISOString().split('T')[0]]
                    },
                    crm_stage: { [Op.notIn]: ['inactive', 'at_risk'] }
                }
            });

            if (clients.length > 0) {
                console.log(`[CRM Automation] Found ${clients.length} at-risk clients (30-59 days) for tenant ${tenantId}`);

                // Find at_risk stage or use a default action
                const atRiskStage = settings?.funnel_stages?.find(s => s.id === 'at_risk');

                for (const client of clients) {
                    await client.update({ crm_stage: 'at_risk', classification: 'Em Risco' });
                    console.log(`[CRM Automation] Client ${client.name} moved to 'at_risk'`);

                    // Trigger reactivation message if stage has actions
                    if (atRiskStage && atRiskStage.ai_actions && Array.isArray(atRiskStage.ai_actions)) {
                        for (const action of atRiskStage.ai_actions) {
                            if (action.active) {
                                try {
                                    await this.triggerRobotAction(tenantId, client, atRiskStage, action);
                                } catch (err) {
                                    console.error(`[CRM Automation] Error triggering at-risk action for ${client.name}:`, err.message);
                                }
                            }
                        }
                    } else {
                        // Default: send reactivation message via AI if no specific stage configured
                        if (client.phone) {
                            try {
                                const context = `
                                    Você é um assistente virtual de reativação.
                                    O cliente ${client.name} não visita há mais de 30 dias.
                                    Gere uma mensagem amigável e estratégica para trazê-lo de volta.
                                    Mencione que sentimos falta dele e ofereça agendar um horário.
                                `;
                                await aiService.processMessage(tenantId, client.phone, '[SISTEMA: Reativação - Em Risco]', false, context);
                            } catch (err) {
                                console.error(`[CRM Automation] Error sending at-risk reactivation to ${client.name}:`, err.message);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[CRM Automation] Error in handleAtRiskDaily:', error.message);
        }
    }

    async triggerRobotAction(tenantId, client, stage, action, appointment = null) {
        if (!client.phone) return;

        console.log(`[CRM Robot] Triggering action '${action.title}' for client ${client.name} at stage: ${stage.title}`);

        // CORE FIX: Always move client to this stage when an action is triggered
        // This ensures the funnel matches the action/tag being applied
        if (stage.id && client.crm_stage !== stage.id) {
            const classification = `${stage.icon || ''} ${stage.title}`.trim();
            await Client.update(
                { crm_stage: stage.id, classification },
                { where: { id: client.id } }
            );
            console.log(`[CRM Robot] Client ${client.name} moved to funnel: ${stage.id} (${classification})`);
        }

        // Load chat history for context before contacting
        let historyContext = '';
        try {
            const existingChat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: client.phone } });
            if (existingChat && existingChat.history && existingChat.history.length > 0) {
                const recentMsgs = existingChat.history.slice(-5);
                historyContext = '\n## HISTÓRICO RECENTE DA CONVERSA COM ESTE CLIENTE:\n';
                for (const msg of recentMsgs) {
                    historyContext += `${msg.role === 'user' ? 'CLIENTE' : 'AGENTE'}: ${(msg.content || '').substring(0, 200)}\n`;
                }
                historyContext += 'Use este contexto para personalizar sua abordagem. NÃO repita mensagens anteriores.\n';
            }
        } catch (chatErr) {
            console.error(`[CRM Robot] Error loading chat history:`, chatErr.message);
        }

        const instruction = action.description;
        const context = `
            Você é um assistente virtual agindo no CRM. 
            O cliente está na etapa: ${stage.title}.
            Ação Específica: ${action.title}.
            Instrução do Gerente para esta ação: ${instruction}
            Dados do Cliente: Nome: ${client.name}, Telefone: ${client.phone}.
            ${appointment ? `Agendamento: ${appointment.time} de hoje.` : ''}
            Gere uma mensagem curta e amigável para o WhatsApp.
            ${historyContext}
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

        // Find clients with last_visit older than 60 days AND not already in 'inactive' stage
        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                last_visit: { [Op.lt]: dateStr },
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
        // Move clients who are NOT inactive (last_visit < 60 days ago) 
        // AND are currently in 'inactive' to 'recurrent' (revival)

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const dateStr = sixtyDaysAgo.toISOString().split('T')[0];

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                last_visit: { [Op.gte]: dateStr },
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
