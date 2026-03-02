const provider = require('./whatsapp.provider');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

class WhatsAppService {
    /**
     * Send a text message
     * @param {string} phone - The recipient's phone number
     * @param {string} message - The text message
     * @param {object} tenant - The tenant object (required for context)
     */
    async sendMessage(phone, message, tenant) {
        if (!tenant) {
            console.error('[WhatsAppService] Tenant context missing for sendMessage');
            throw new Error('Tenant context required');
        }

        try {
            const result = await provider.sendMessage(tenant.id, phone, message);
            return result;
        } catch (error) {
            console.error(`[WhatsAppService] Error sending message to ${phone} for Tenant ${tenant.id}:`, error.message);
            throw error;
        }
    }

    /**
     * Send an audio message
     * @param {string} phone - The recipient's phone number
     * @param {string} audioUrl - URL or base64 of the audio
     * @param {object} tenant - The tenant object
     */
    async sendAudio(phone, audioUrl, tenant) {
        if (!tenant) {
            console.error('[WhatsAppService] Tenant context missing for sendAudio');
            throw new Error('Tenant context required');
        }

        try {
            // Logic to handle base64 vs URL
            let content = { audio: { url: audioUrl }, mimetype: 'audio/mp4', ptt: true };

            if (audioUrl.startsWith('data:audio')) {
                const base64Data = audioUrl.split(';base64,').pop();
                content.audio = Buffer.from(base64Data, 'base64');
                delete content.audio.url; // Remove url if buffer present? Baileys prioritizes one.
            }

            const result = await provider.sendMessage(tenant.id, phone, content);
            return result;
        } catch (error) {
            console.error(`[WhatsAppService] Error sending audio to ${phone} for Tenant ${tenant.id}:`, error.message);
            throw error;
        }
    }

    /**
     * Send Appointment Confirmation
     * @param {object} client 
     * @param {object} appointment 
     * @param {object} service 
     * @param {object} professional 
     * @param {object} tenant - Required
     */
    async sendAppointmentConfirmation(client, appointment, service, professional, tenant) {
        if (!tenant) throw new Error('Tenant context required for appointment confirmation');

        try {
            const dateFormatted = format(new Date(appointment.date), "dd 'de' MMMM", { locale: ptBR });
            const timeFormatted = appointment.start_time.slice(0, 5);

            const message = `Olá, ${client.name}! 👋\n\nSeu agendamento está confirmado!\n\n🗓 Data: ${dateFormatted}\n⏰ Horário: ${timeFormatted}\n💇 Serviço: ${service.name}\n👤 Profissional: ${professional.name}\n\n📍 Endereço: Salão24h (Exemplo)`;

            await this.sendMessage(client.phone, message, tenant);
        } catch (error) {
            console.error('[WhatsAppService] Error sending appointment confirmation:', error);
            throw error;
        }
    }

    /**
     * Check if WhatsApp is configured and connected for the tenant
     * @param {object} tenant 
     */
    isConfigured(tenant) {
        if (!tenant) return false;
        return provider.getStatus(tenant.id) === 'connected';
    }
}

module.exports = new WhatsAppService();
