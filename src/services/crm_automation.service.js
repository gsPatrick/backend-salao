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
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        if (!settings || !settings.funnel_stages) return;

        const today = new Date().toISOString().split('T')[0];

        // 1. Process Birthdays
        const birthdayConfig = settings.funnel_stages.find(s => s.id === 'birthday');
        if (birthdayConfig && birthdayConfig.isAIActionActive) {
            await this.handleBirthdays(tenantId, birthdayConfig);
        }

        // 2. Process Scheduled Today
        const scheduledConfig = settings.funnel_stages.find(s => s.id === 'scheduled');
        if (scheduledConfig && scheduledConfig.isAIActionActive) {
            await this.handleScheduledToday(tenantId, scheduledConfig);
        }

        // 3. Process Absent (Faltantes)
        const absentConfig = settings.funnel_stages.find(s => s.id === 'absent');
        if (absentConfig && absentConfig.isAIActionActive) {
            await this.handleAbsentClients(tenantId, absentConfig);
        }
    }

    async handleBirthdays(tenantId, config) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

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

    async handleScheduledToday(tenantId, config) {
        const today = new Date().toISOString().split('T')[0];
        const appointments = await Appointment.findAll({
            where: {
                tenant_id: tenantId,
                date: today,
                status: 'confirmado'
            },
            include: [{ model: Client, as: 'client' }]
        });

        for (const appt of appointments) {
            if (appt.client) {
                await this.triggerRobotAction(tenantId, appt.client, config, appt);
            }
        }
    }

    async handleAbsentClients(tenantId, config) {
        // Find clients whose last appointment was 'faltante' and haven't been contacted yet
        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                status: 'Faltante',
                is_active: true
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
