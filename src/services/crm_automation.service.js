const { Client, Appointment, CRMSettings, Tenant, AIChat } = require('../models');
const { Op } = require('sequelize');
const aiService = require('./ai.service');
const whatsappService = require('./whatsapp.service');

class CRMAutomationService {
    async runDailyChecks() {
        console.log('[CRM Automation] Starting daily checks...');
        const tenants = await Tenant.findAll();

        for (const tenant of tenants) {
            try {
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
    }

    // --- Real-time Handlers (triggered by Service Hooks) ---

    async handleNewClient(tenantId, client) {
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
        const today = new Date().toISOString().split('T')[0];
        if (appointment.date !== today) return; // Only trigger for today's appointments

        // Update Client CRM Stage
        if (client.crm_stage !== 'scheduled') {
            await client.update({ crm_stage: 'scheduled' });
            console.log(`[CRM Automation] Client ${client.name} stage updated to 'scheduled'`);
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
}

// Simple export for cron usage
const sequelize = require('../config/db'); // Needed for the EXTRACT helper
module.exports = new CRMAutomationService();
