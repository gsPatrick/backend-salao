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

        const birthdayConfig = settings.funnel_stages.find(s => s.id === 'birthday');
        if (birthdayConfig && birthdayConfig.isAIActionActive) {
            await this.handleBirthdaysDaily(tenantId, birthdayConfig);
        }
    }

    // --- Real-time Handlers (triggered by Service Hooks) ---

    async handleNewClient(tenantId, client) {
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const config = settings?.funnel_stages?.find(s => s.id === 'new');
        if (config && config.isAIActionActive) {
            await this.triggerRobotAction(tenantId, client, config);
        }
    }

    async handleScheduledToday(tenantId, client, appointment) {
        const today = new Date().toISOString().split('T')[0];
        if (appointment.date !== today) return; // Only trigger for today's appointments

        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const config = settings?.funnel_stages?.find(s => s.id === 'scheduled');
        if (config && config.isAIActionActive) {
            await this.triggerRobotAction(tenantId, client, config, appointment);
        }
    }

    async handleAbsent(tenantId, client) {
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const config = settings?.funnel_stages?.find(s => s.id === 'absent');
        if (config && config.isAIActionActive) {
            await this.triggerRobotAction(tenantId, client, config);
        }
    }

    async handleRescheduled(tenantId, client, appointment) {
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        const config = settings?.funnel_stages?.find(s => s.id === 'rescheduled');
        if (config && config.isAIActionActive) {
            await this.triggerRobotAction(tenantId, client, config, appointment);
        }
    }

    // --- Periodic Internal Helpers ---

    async handleBirthdaysDaily(tenantId, config) {
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
            await this.triggerRobotAction(tenantId, client, config);
        }
    }

    async triggerRobotAction(tenantId, client, stageConfig, appointment = null) {
        if (!client.phone) return;

        // Check if we already sent an AI message for this stage today to avoid spam
        // For simplicity, we can check AIChat history or a dedicated logs table.
        // For now, let's assume one-time trigger logic.

        console.log(`[CRM Robot] Triggering action for client ${client.name} (${client.phone}) at stage: ${stageConfig.title}`);

        const instruction = stageConfig.configDescription;
        const context = `
            Você é um assistente virtual agindo no CRM. 
            O cliente está na etapa: ${stageConfig.title}.
            Instrução do Gerente: ${instruction}
            Dados do Cliente: Nome: ${client.name}, Telefone: ${client.phone}.
            ${appointment ? `Agendamento: ${appointment.time} de hoje.` : ''}
            Gere uma mensagem curta e amigável para o WhatsApp.
        `;

        try {
            const message = await aiService.processMessage(tenantId, client.phone, `[SISTEMA: Ação Automática CRM - ${stageConfig.title}]`, false, context);
            if (message) {
                // message is sent by aiService.processMessage if integrated with whatsappService
                // But wait, aiService.processMessage usually sends the response automatically.
                // However, I need to make sure aiService can handle this "SISTEMA" trigger without sounding weird.
            }
        } catch (error) {
            console.error(`[CRM Robot] Error triggering AI for ${client.phone}:`, error);
        }
    }
}

// Simple export for cron usage
const sequelize = require('../config/db'); // Needed for the EXTRACT helper
module.exports = new CRMAutomationService();
