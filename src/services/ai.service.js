const fs = require('fs');
const fsp = fs.promises;
const OpenAI = require('openai');
const config = require('../config');
const { Tenant, Plan, Service, Professional, Appointment, Client, AIChat } = require('../models');
const appointmentService = require('../features/Appointment/appointment.service');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.externalServices.openai.apiKey,
        });
        this.conversations = new Map(); // In-memory history. Use Redis for production.
    }

    isConfigured() {
        return !!config.externalServices.openai.apiKey;
    }

    /**
     * Slices conversation history without breaking tool sequences.
     * Ensures an 'assistant' message with tool_calls is always followed by its 'tool' responses.
     */
    safeSliceHistory(history, limit = 20) {
        if (history.length <= limit) return history;

        // Target slice point
        let slicePoint = history.length - limit;

        // Never start with a tool message or an assistant call that expects tools
        while (slicePoint < history.length && (history[slicePoint].role === 'tool' || (history[slicePoint].role === 'assistant' && history[slicePoint].tool_calls))) {
            slicePoint++;
        }

        // If we sliced too much (less than 5 messages left), try moving back instead
        if (history.length - slicePoint < 5) {
            slicePoint = history.length - limit;
            while (slicePoint > 0 && (history[slicePoint].role === 'tool' || (slicePoint > 0 && history[slicePoint - 1].role === 'assistant' && history[slicePoint - 1].tool_calls))) {
                slicePoint--;
            }
        }

        let result = history.slice(slicePoint);

        // Final trimming: remove trailing assistant call with tool_calls if no tool response follows
        while (result.length > 0 && result[result.length - 1].role === 'assistant' && result[result.length - 1].tool_calls) {
            result.pop();
        }

        // Remove leading tool responses that lost their assistant
        while (result.length > 0 && result[0].role === 'tool') {
            result.shift();
        }

        return result;
    }

    /**
     * Check if tenant's plan allows AI features
     */
    async checkPlanAllowsAI(tenantId) {
        if (!tenantId) return true;

        const tenant = await Tenant.findByPk(tenantId, {
            include: [{ model: Plan, as: 'plan' }],
        });

        if (!tenant || !tenant.plan) {
            throw new Error('Tenant ou plano não encontrado');
        }

        // Check if plan has ai_voice_response or advanced_ai
        if (!tenant.plan.ai_voice_response && !tenant.plan.advanced_ai) {
            return false;
        }

        return true;
    }

    /**
     * Generate dynamic prompt for the tenant
     */
    async generateSystemPrompt(tenantId) {
        const { AIAgentConfig } = require('../models');
        const tenant = await Tenant.findByPk(tenantId, {
            include: [
                { model: Service, as: 'services' },
                { model: Professional, as: 'professionals' }
            ]
        });

        const config = await AIAgentConfig.findOne({
            where: { tenant_id: tenantId }
        });

        const servicesList = tenant.services
            .filter(s => !s.is_suspended)
            .map(s => `- ${s.name} (ID: ${s.id}, R$ ${s.price}, ${s.duration}min)`)
            .join('\n');

        const professionalsList = tenant.professionals
            .filter(p => !p.is_suspended && !p.is_archived)
            .map(p => `- ${p.name} (ID: ${p.id})`)
            .join('\n');

        const businessHours = JSON.stringify(tenant.business_hours || {});

        // Use AIAgentConfig behavior or fallback
        const customBehavior = config?.prompt_behavior || config?.personality || "Seja cordial, profissional e prestativa.";

        return `
Data de hoje: ${new Date().toISOString().split('T')[0]}
Você é a recepcionista virtual do ${tenant.name}.
Localização: ${JSON.stringify(tenant.address)}
Horário de Funcionamento: ${businessHours}

## PERSONALIDADE DO ESTABELECIMENTO
- ${customBehavior}

## REGRAS DE OURO DE DICÇÃO E VOZ (PROIBIDO ERRAR)
Sua voz será convertida em áudio. Para soar natural no Brasil, você DEVE escrever os horários assim:
1. NUNCA use zero à esquerda. Fale "6 horas", "8 horas" ou "9 horas". NUNCA escreva "06:00" ou "08:00" na resposta final de voz.
2. MAPEAMENTO OBRIGATÓRIO:
   - 06:00 até 11:00 -> Escreva "[número sem zero] horas" (ex: "7 horas").
   - 12:00 -> Escreva SEMPRE "meio dia".
   - 13:00 em diante -> Escreva "[número] horas" (ex: "14 horas", "15:30 horas").
3. SEMPRE use o sufixo "horas" para evitar que a IA fale números isolados.

## REGRAS DE ATENDIMENTO E DISPONIBILIDADE
1. OBRIGAÇÃO DE IDENTIFICAÇÃO: Você NUNCA pode dar horários sem dizer o NOME do profissional.
   - CORRETO: "O profissional Wagner tem disponível às 9 horas."
   - ERRADO: "Temos disponível às 9 horas."
2. DIAS FECHADOS: Se o cliente perguntar de um dia em que o salão está fechado, informe o horário comercial e JÁ CONSULTE disponibilidade para o próximo dia útil, listando NOMES e HORÁRIOS proativamente.
3. PROATIVIDADE: Se o cliente perguntar "quais os horários?", chame 'checkAvailability' e apresente as opções IMEDIATAMENTE com nomes e horários por extenso conforme regras acima.

## SERVIÇOS
${servicesList}

## PROFISSIONAIS
${professionalsList}

## REGRAS CRÍTICAS DE AGENDAMENTO
1. SEMPRE confirme o nome do profissional antes de finalizar.
2. Para 'bookAppointment', você DEVE ter: Data, Horário, Serviço, ID do Profissional (Obrigatório) e Nome.
3. Máximo de 50 palavras por resposta. Seja direto.
- Responda em Português do Brasil amigável.
 `;
    }

    /**
     * Get Tools Definitions
     */
    getTools() {
        return [
            {
                type: "function",
                function: {
                    name: "checkAvailability",
                    description: "Consulta horários disponíveis. Chame esta função SEMPRE que o cliente perguntar sobre disponibilidade ou demonstrar interesse. Retorne as opções citando o nome do profissional explicitamente.",
                    parameters: {
                        type: "object",
                        properties: {
                            date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                            serviceId: { type: "integer", description: "ID do serviço solicitado" },
                            professionalId: { type: ["integer", "null"], description: "ID do profissional (opcional)" }
                        },
                        required: ["date", "serviceId"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "bookAppointment",
                    description: "Realiza o agendamento final no banco de dados após confirmação.",
                    parameters: {
                        type: "object",
                        properties: {
                            date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                            time: { type: "string", description: "Horário no formato HH:MM" },
                            serviceId: { type: "integer", description: "ID do serviço" },
                            professionalId: { type: "integer", description: "ID do profissional" },
                            customerName: { type: "string", description: "Nome do cliente" }
                        },
                        required: ["date", "time", "serviceId", "professionalId", "customerName"]
                    }
                }
            }
        ];
    }

    /**
     * Execute Tool logic
     */
    async handleToolCall(toolCall, tenantId, phone) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`[AI] Executing tool: ${name}`, args);

        if (name === 'checkAvailability') {
            try {
                const result = await appointmentService.getAvailability(
                    args.professionalId,
                    args.date,
                    args.serviceId,
                    tenantId
                );
                return {
                    success: true,
                    availableSlots: result.slots,
                    professional: result.professional,
                    message: result.slots.length > 0
                        ? `Horários encontrados para o profissional ${result.professional.name}. Liste-os usando a regra de dicção (ex: 9 horas).`
                        : `Não há horários disponíveis para o profissional ${result.professional.name} nesta data.`
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        if (name === 'bookAppointment') {
            try {
                // Find or create client based on phone
                let client = await Client.findOne({ where: { phone, tenant_id: tenantId } });
                if (!client) {
                    client = await Client.create({
                        name: args.customerName,
                        phone: phone,
                        tenant_id: tenantId
                    });
                }

                const appointmentData = {
                    client_id: client.id,
                    professional_id: args.professionalId,
                    service_id: args.serviceId,
                    date: args.date,
                    time: args.time,
                    status: 'confirmado'
                };

                const appointment = await appointmentService.create(appointmentData, tenantId, null);
                return {
                    success: true,
                    appointmentId: appointment.id,
                    message: "Agendamento realizado com sucesso!"
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        return { error: "Função não encontrada" };
    }

    /**
     * Transcribe Audio using Whisper
     */
    async transcribeAudio(audioBuffer) {
        if (!this.isConfigured()) throw new Error('OpenAI não configurada');

        const tempFilePath = path.join(__dirname, `../../temp/audio_${Date.now()}.ogg`);
        await fsp.mkdir(path.dirname(tempFilePath), { recursive: true });
        await fsp.writeFile(tempFilePath, audioBuffer);

        try {
            const response = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "whisper-1",
                language: "pt"
            });
            return response.text;
        } finally {
            await fsp.unlink(tempFilePath).catch(() => { });
        }
    }

    /**
     * Generate Audio response using TTS
     */
    async generateSpeech(text, voice = 'alloy') {
        const response = await this.openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
            response_format: "opus"
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer;
    }

    /**
     * Process Chat Message
     */
    async processMessage(tenantId, phone, messageText, isAudio = false) {
        if (!this.isConfigured()) {
            return "Desculpe, o sistema de IA não está configurado. Por favor, tente falar com um atendente humano.";
        }

        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });

        if (!chat) {
            chat = await AIChat.create({
                tenant_id: tenantId,
                customer_phone: phone,
                history: [],
                status: 'active'
            });
        }

        if (chat.status === 'manual') {
            let history = [...(chat.history || [])];
            history.push({ role: "user", content: messageText });
            chat.history = this.safeSliceHistory(history);
            chat.last_message = messageText;
            chat.changed('history', true);
            await chat.save();
            return null;
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });

        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        try {
            let currentMessages = [{ role: "system", content: systemPrompt }, ...this.safeSliceHistory(history)];

            let response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: currentMessages,
                tools: tools,
                tool_choice: "auto",
            });

            let assistantMessage = response.choices[0].message;

            while (assistantMessage.tool_calls) {
                history.push(assistantMessage);

                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, phone);
                    history.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                }

                currentMessages = [{ role: "system", content: systemPrompt }, ...this.safeSliceHistory(history, 30)];

                response = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: currentMessages,
                    tools: tools,
                });
                assistantMessage = response.choices[0].message;
            }

            history.push(assistantMessage);
            chat.history = this.safeSliceHistory(history);
            chat.last_message = assistantMessage.content;
            chat.changed('history', true);
            await chat.save();

            return assistantMessage.content;
        } catch (error) {
            console.error('[AI Service Error]:', error.message, error.response?.data);
            return "Desculpe, tive um problema técnico ao processar sua solicitação. Um atendente humano irá te ajudar em breve.";
        }
    }

    /**
     * Synchronize a message sent manually
     */
    async synchronizeMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) return;

        let history = [...(chat.history || [])];
        const lastMsg = history[history.length - 1];
        if (lastMsg && lastMsg.content === messageText) return;

        history.push({ role: "assistant", content: messageText });
        chat.history = this.safeSliceHistory(history);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    /**
     * Synchronize a message received from a user
     */
    async synchronizeUserMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) {
            chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        chat.history = this.safeSliceHistory(history);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    /**
     * Improve text for marketing campaigns
     */
    async improveText(text) {
        if (!this.isConfigured()) throw new Error('OpenAI não configurada');
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Melhore esta mensagem de marketing: "${text}"` }],
            max_tokens: 500
        });
        return response.choices[0].message.content.trim();
    }

    /**
     * Process Internal Test Chat Message
     */
    async processTestMessage(tenantId, messageText, testHistory = []) {
        if (!this.isConfigured()) return "OpenAI não configurada.";
        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();
        const messages = [{ role: "system", content: systemPrompt }, ...testHistory, { role: "user", content: messageText }];
        try {
            let response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools, tool_choice: "auto" });
            let assistantMessage = response.choices[0].message;
            while (assistantMessage.tool_calls) {
                messages.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, "INTERNAL_TEST");
                    messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools });
                assistantMessage = response.choices[0].message;
            }
            return assistantMessage.content;
        } catch (error) {
            console.error('[AI Test Chat Error]:', error);
            return "Erro ao processar simulação.";
        }
    }
}

module.exports = new AIService();
