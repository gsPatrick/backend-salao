const fs = require('fs');
const fsp = fs.promises;
const OpenAI = require('openai');
const config = require('../config');
const { Tenant, Plan, Service, Professional, Appointment, Client, AIChat } = require('../models');
const appointmentService = require('../features/Appointment/appointment.service');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

/**
 * AIService - Version 2.6 (Ultra-Robust Tool Sequence & Natural Voice)
 */
class AIService {
    constructor() {
        console.log('[AI Service] Initializing Version 2.6...');
        this.openai = new OpenAI({
            apiKey: config.externalServices.openai.apiKey,
        });
        this.conversations = new Map();
    }

    isConfigured() {
        return !!config.externalServices.openai.apiKey;
    }

    /**
     * Slices history without breaking tool sequence integrity.
     * Ensures we never start with a 'tool' message or end with an unanswered assistant call.
     */
    safeSliceHistory(history, limit = 20) {
        if (history.length <= limit) {
            let clean = [...history];
            while (clean.length > 0 && clean[0].role === 'tool') clean.shift();
            while (clean.length > 0 && clean[clean.length - 1].role === 'assistant' && clean[clean.length - 1].tool_calls) clean.pop();
            return clean;
        }

        let slicePoint = history.length - limit;

        // Backward-walking logic: if we are on a 'tool' message, we MUST go back to find its 'assistant' call
        while (slicePoint > 0 && history[slicePoint].role === 'tool') {
            slicePoint--;
        }

        // Final trimming to ensure the start of the array is valid
        let result = history.slice(slicePoint);
        while (result.length > 0 && result[0].role === 'tool') result.shift();
        while (result.length > 0 && result[result.length - 1].role === 'assistant' && result[result.length - 1].tool_calls) result.pop();

        return result;
    }

    async checkPlanAllowsAI(tenantId) {
        if (!tenantId) return true;
        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });
        if (!tenant || !tenant.plan) throw new Error('Tenant ou plano não encontrado');
        return !!(tenant.plan.ai_voice_response || tenant.plan.advanced_ai);
    }

    async generateSystemPrompt(tenantId) {
        const { AIAgentConfig } = require('../models');
        const tenant = await Tenant.findByPk(tenantId, {
            include: [{ model: Service, as: 'services' }, { model: Professional, as: 'professionals' }]
        });
        const config = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        const servicesList = tenant.services.filter(s => !s.is_suspended)
            .map(s => `- ${s.name} (ID: ${s.id}, R$ ${s.price}, ${s.duration}min)`).join('\n');
        const professionalsList = tenant.professionals.filter(p => !p.is_suspended && !p.is_archived)
            .map(p => `- ${p.name} (ID: ${p.id})`).join('\n');
        const businessHours = tenant.business_hours && Object.keys(tenant.business_hours).length > 0
            ? JSON.stringify(tenant.business_hours)
            : "Segunda a Sexta das 08:00 às 18:00 (Sábado e Domingo fechado)";
        const customBehavior = config?.prompt_behavior || config?.personality || "Seja cordial, profissional e prestativa.";

        return `
Data de hoje: ${new Date().toISOString().split('T')[0]}
Você é a recepcionista virtual do ${tenant.name}.
Horário de Funcionamento: ${businessHours}

## PERSONALIDADE E TOM
- ${customBehavior}
- Use português do Brasil amigável e direto.

## REGRAS DE OURO DE DICÇÃO (PARA ÁUDIO)
1. **NUNCA** use zero à esquerda em horários. Fale "9 horas", **NUNCA** "09 horas".
2. **MAERAMENTO OBRIGATÓRIO**:
   - 08:00 -> "8 horas"
   - 12:00 -> "meio dia" (fale sempre assim)
   - 13:00 em diante -> "[Número] horas" (ex: "15:30 horas")
3. Use sempre o sufixo "horas" para uma locução natural.

## REGRAS DE RESPOSTA E DISPONIBILIDADE
1. **IDENTIFICAÇÃO OBRIGATÓRIA**: Você deve falar o NOME do profissional Wagner ou Carlos em toda listagem de horários.
   - CERTO: "O profissional Wagner tem disponível às 9 horas."
   - ERRADO: "Temos horários às 9 horas."
2. **DIAS FECHADOS**: Se o salão estiver fechado hoje, informe o horário padrão e JÁ CONSULTE disponibilidade para o próximo dia útil, citando NOMES e HORÁRIOS de forma proativa.
3. **MÁXIMO 50 PALAVRAS**: Seja extremamente direto e conciso.

## SERVIÇOS
${servicesList}

## PROFISSIONAIS
${professionalsList}

## AGENDAMENTO
- Para 'bookAppointment', você DEVE ter: Data, Horário, Serviço, ID do Profissional (Obrigatório) e Nome.
- NUNCA invente horários. Use sempre 'checkAvailability'.
 `;
    }

    getTools() {
        return [
            {
                type: "function",
                function: {
                    name: "checkAvailability",
                    description: "Consulta horários disponíveis. Exige proatividade em citar o nome do profissional e usar a dicção correta das horas.",
                    parameters: {
                        type: "object",
                        properties: {
                            date: { type: "string" },
                            serviceId: { type: "integer" },
                            professionalId: { type: ["integer", "null"] }
                        },
                        required: ["date", "serviceId"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "bookAppointment",
                    description: "Realiza o agendamento final no banco de dados.",
                    parameters: {
                        type: "object",
                        properties: {
                            date: { type: "string" },
                            time: { type: "string" },
                            serviceId: { type: "integer" },
                            professionalId: { type: "integer" },
                            customerName: { type: "string" }
                        },
                        required: ["date", "time", "serviceId", "professionalId", "customerName"]
                    }
                }
            }
        ];
    }

    async handleToolCall(toolCall, tenantId, phone) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[AI V2.6] Executing tool: ${name}`, args);

        if (name === 'checkAvailability') {
            try {
                const result = await appointmentService.getAvailability(args.professionalId, args.date, args.serviceId, tenantId);
                return {
                    success: true,
                    availableSlots: result.slots,
                    professional: result.professional,
                    reminder: `VOCÊ DEVE FALAR O NOME DO PROFISSIONAL ${result.professional.name} E USAR A REGRA DE HORAS (EX: 9 HORAS).`
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        if (name === 'bookAppointment') {
            try {
                let client = await Client.findOne({ where: { phone, tenant_id: tenantId } });
                if (!client) client = await Client.create({ name: args.customerName, phone, tenant_id: tenantId });
                const appointment = await appointmentService.create({
                    client_id: client.id, professional_id: args.professionalId, service_id: args.serviceId,
                    date: args.date, time: args.time, status: 'confirmado'
                }, tenantId, null);
                return { success: true, appointmentId: appointment.id, message: "Sucesso!" };
            } catch (error) { return { success: false, error: error.message }; }
        }
        return { error: "Função não encontrada" };
    }

    async transcribeAudio(audioBuffer) {
        if (!this.isConfigured()) throw new Error('OpenAI não configurada');
        const tempFilePath = path.join(__dirname, `../../temp/audio_${Date.now()}.ogg`);
        await fsp.mkdir(path.dirname(tempFilePath), { recursive: true });
        await fsp.writeFile(tempFilePath, audioBuffer);
        try {
            const response = await this.openai.audio.transcriptions.create({ file: fs.createReadStream(tempFilePath), model: "whisper-1", language: "pt" });
            return response.text;
        } finally { await fsp.unlink(tempFilePath).catch(() => { }); }
    }

    async generateSpeech(text, voice = 'alloy') {
        const response = await this.openai.audio.speech.create({ model: "tts-1", voice, input: text, response_format: "opus" });
        return Buffer.from(await response.arrayBuffer());
    }

    async processMessage(tenantId, phone, messageText, isAudio = false) {
        console.log(`[AI V2.6] Processing message for ${phone}`);
        if (!this.isConfigured()) return "Configuração pendente.";

        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });

        if (chat.status === 'manual') {
            let history = [...(chat.history || [])];
            history.push({ role: "user", content: messageText });
            chat.history = this.safeSliceHistory(history);
            await chat.save();
            return null;
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        try {
            let currentMessages = [{ role: "system", content: systemPrompt }, ...this.safeSliceHistory(history)];
            let response = await this.openai.chat.completions.create({ model: "gpt-4o", messages: currentMessages, tools, tool_choice: "auto" });
            let assistantMessage = response.choices[0].message;

            while (assistantMessage.tool_calls) {
                history.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, phone);
                    history.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                currentMessages = [{ role: "system", content: systemPrompt }, ...this.safeSliceHistory(history, 30)];
                response = await this.openai.chat.completions.create({ model: "gpt-4o", messages: currentMessages, tools });
                assistantMessage = response.choices[0].message;
            }

            history.push(assistantMessage);
            chat.history = this.safeSliceHistory(history);
            chat.last_message = assistantMessage.content;
            chat.changed('history', true);
            await chat.save();
            return assistantMessage.content;
        } catch (error) {
            console.error('[AI V2.6 Error]:', error.message, error.response?.data || '');
            return "Desculpe, tive um problema técnico. Um atendente humano irá te ajudar em breve.";
        }
    }

    async synchronizeMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) return;
        let history = [...(chat.history || [])];
        if (history.length > 0 && history[history.length - 1].content === messageText) return;
        history.push({ role: "assistant", content: messageText });
        chat.history = this.safeSliceHistory(history);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    async synchronizeUserMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });
        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        chat.history = this.safeSliceHistory(history);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    async improveText(text) {
        if (!this.isConfigured()) throw new Error('OpenAI não configurada');
        const response = await this.openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Melhore esta mensagem: "${text}"` }], max_tokens: 500 });
        return response.choices[0].message.content.trim();
    }

    async processTestMessage(tenantId, messageText, testHistory = []) {
        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();
        const messages = [{ role: "system", content: systemPrompt }, ...testHistory, { role: "user", content: messageText }];
        try {
            let response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools, tool_choice: "auto" });
            let assistantMessage = response.choices[0].message;
            while (assistantMessage.tool_calls) {
                messages.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, "TEST");
                    messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools });
                assistantMessage = response.choices[0].message;
            }
            return assistantMessage.content;
        } catch (error) { return "Erro ao processar."; }
    }
}

module.exports = new AIService();
