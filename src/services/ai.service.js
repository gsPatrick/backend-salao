/**
 * AI Service - OpenAI Integration Placeholder
 * 
 * This service provides AI capabilities for voice responses and chat.
 * Requires ai_voice_response plan feature to be enabled.
 */

const config = require('../config');
const { Tenant, Plan } = require('../models');

class AIService {
    constructor() {
        this.apiKey = config.externalServices.openai.apiKey;
    }

    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Check if tenant's plan allows AI features
     */
    async checkPlanAllowsAI(tenantId) {
        if (!tenantId) return true; // Super Admin always has access

        const tenant = await Tenant.findByPk(tenantId, {
            include: [{ model: Plan, as: 'plan' }],
        });

        if (!tenant || !tenant.plan) {
            throw new Error('Tenant ou plano não encontrado');
        }

        if (!tenant.plan.ai_voice_response) {
            throw new Error('Recurso de IA não disponível no seu plano. Faça upgrade para Pro ou Premium.');
        }

        return true;
    }

    /**
     * Generate AI response for chat
     */
    async getAIResponse(tenantId, prompt, context = {}) {
        await this.checkPlanAllowsAI(tenantId);

        if (!this.isConfigured()) {
            console.log('[OpenAI] Not configured. Would process:', prompt);
            return {
                success: true,
                simulated: true,
                response: 'Integração com IA pendente de configuração. Configure OPENAI_API_KEY no .env',
            };
        }

        try {
            // Placeholder for actual OpenAI call
            // const response = await fetch('https://api.openai.com/v1/chat/completions', {
            //   method: 'POST',
            //   headers: {
            //     'Content-Type': 'application/json',
            //     'Authorization': `Bearer ${this.apiKey}`,
            //   },
            //   body: JSON.stringify({
            //     model: 'gpt-4',
            //     messages: [
            //       { role: 'system', content: 'Você é um assistente de salão de beleza.' },
            //       { role: 'user', content: prompt },
            //     ],
            //   }),
            // });

            console.log('[OpenAI] Processing prompt:', prompt.substring(0, 50) + '...');
            return {
                success: true,
                response: 'Esta é uma resposta simulada da IA.',
            };
        } catch (error) {
            console.error('[OpenAI] Error:', error);
            throw new Error('Falha ao processar resposta da IA');
        }
    }

    /**
     * Generate voice response for calls
     */
    async generateVoiceResponse(tenantId, customerMessage) {
        await this.checkPlanAllowsAI(tenantId);

        const systemPrompt = `
      Você é uma atendente virtual de salão de beleza.
      Seja cordial, profissional e eficiente.
      Ajude clientes a agendar serviços, tirar dúvidas sobre preços e horários.
    `;

        return this.getAIResponse(tenantId, customerMessage, { systemPrompt });
    }

    /**
     * Suggest services based on client history
     */
    async suggestServices(tenantId, clientHistory) {
        await this.checkPlanAllowsAI(tenantId);

        const prompt = `
      Baseado no histórico deste cliente, sugira serviços complementares:
      ${JSON.stringify(clientHistory)}
    `;

        return this.getAIResponse(tenantId, prompt);
    }
}

module.exports = new AIService();
