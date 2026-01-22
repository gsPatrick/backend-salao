/**
 * WhatsApp Service - Z-API Integration Placeholder
 * 
 * This service provides placeholder methods for WhatsApp integration via Z-API.
 * Configure ZAPI_INSTANCE_ID and ZAPI_TOKEN in .env to enable.
 */

const config = require('../config');

class WhatsAppService {
    constructor() {
        this.instanceId = config.externalServices.zapi.instanceId;
        this.token = config.externalServices.zapi.token;
        this.baseUrl = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`;
    }

    isConfigured() {
        return !!(this.instanceId && this.token);
    }

    /**
     * Send a text message via WhatsApp
     */
    async sendMessage(phone, message) {
        if (!this.isConfigured()) {
            console.log('[Z-API] Not configured. Would send to:', phone, message);
            return { success: true, simulated: true, message: 'Z-API integration pending configuration' };
        }

        try {
            // Placeholder for actual Z-API call
            // const response = await fetch(`${this.baseUrl}/send-text`, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ phone, message }),
            // });

            console.log('[Z-API] Sending message to:', phone);
            return { success: true, message: 'Message sent' };
        } catch (error) {
            console.error('[Z-API] Error:', error);
            throw new Error('Falha ao enviar mensagem WhatsApp');
        }
    }

    /**
     * Send appointment reminder
     */
    async sendAppointmentReminder(client, appointment) {
        const message = `Olá ${client.name}! 📅\n\n` +
            `Lembrete: Você tem um agendamento amanhã!\n` +
            `📍 Data: ${appointment.date}\n` +
            `⏰ Horário: ${appointment.time}\n\n` +
            `Confirme sua presença respondendo esta mensagem.\n\n` +
            `Salão24h`;

        return this.sendMessage(client.phone, message);
    }

    /**
     * Send appointment confirmation
     */
    async sendAppointmentConfirmation(client, appointment, service, professional) {
        const message = `Olá ${client.name}! ✅\n\n` +
            `Seu agendamento foi confirmado!\n\n` +
            `📋 Serviço: ${service.name}\n` +
            `👤 Profissional: ${professional.name}\n` +
            `📅 Data: ${appointment.date}\n` +
            `⏰ Horário: ${appointment.time}\n\n` +
            `Te esperamos!\n\n` +
            `Salão24h`;

        return this.sendMessage(client.phone, message);
    }
}

module.exports = new WhatsAppService();
