const config = require('../config');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class WhatsAppService {
    constructor() {
        this.instanceId = config.externalServices.zapi.instanceId;
        this.token = config.externalServices.zapi.token;
        this.clientToken = config.externalServices.zapi.clientToken;
        this.baseUrl = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`;
    }

    isConfigured() {
        return !!(this.instanceId && this.token);
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.clientToken) {
            headers['Client-Token'] = this.clientToken;
        }
        return headers;
    }

    /**
     * Send a text message via WhatsApp
     */
    async sendMessage(phone, message) {
        if (!this.isConfigured()) {
            console.log('[Z-API] Not configured. Would send to:', phone, message);
            return { success: true, simulated: true };
        }

        try {
            const response = await axios.post(`${this.baseUrl}/send-text`, {
                phone: phone,
                message: message
            }, { headers: this.getHeaders() });
            return response.data;
        } catch (error) {
            console.error('[Z-API] Error sending text:', error.response?.data || error.message);
            throw new Error('Falha ao enviar mensagem WhatsApp');
        }
    }

    /**
     * Send an audio message via WhatsApp
     */
    async sendAudio(phone, audioBuffer) {
        if (!this.isConfigured()) {
            console.log('[Z-API] Not configured. Would send audio to:', phone);
            return { success: true, simulated: true };
        }

        try {
            // Z-API often requires the data URI prefix for Base64 media
            const base64Audio = `data:audio/ogg;base64,${audioBuffer.toString('base64')}`;
            const response = await axios.post(`${this.baseUrl}/send-audio`, {
                phone: phone,
                audio: base64Audio
            }, { headers: this.getHeaders() });
            return response.data;
        } catch (error) {
            console.error('[Z-API] Error sending audio:', error.response?.data || error.message);
            throw new Error('Falha ao enviar áudio WhatsApp');
        }
    }

    /**
     * Download audio from a URL (e.g., from Z-API webhook)
     */
    async downloadAudio(url) {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (error) {
            console.error('[WhatsApp Service] Error downloading audio:', error.message);
            throw new Error('Falha ao baixar áudio do WhatsApp');
        }
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
