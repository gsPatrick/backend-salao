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
1. NUNCA use zero à esquerda. Fale "8 horas" ou "9 horas". NUNCA escreva "08:00" ou "09:00" na resposta final de voz.
2. MAPEAMENTO OBRIGATÓRIO:
   - 06:00 até 11:00 -> Escreva "[número sem zero] horas" (ex: "7 horas").
   - 12:00 -> Escreva SEMPRE "meio dia".
   - 13:00 em diante -> Escreva "[número] horas" (ex: "14 horas", "15:30 horas").
3. SEMPRE use o sufixo "horas" para evitar que a IA fale números isolados.

## REGRAS DE ATENDIMENTO E DISPONIBILIDADE
1. OBRIGAÇÃO DE IDENTIFICAÇÃO: Você NUNCA pode dar horários sem dizer o NOME do profissional.
   - CORRETO: "O profissional Wagner tem disponível às 9 horas."
   - ERRADO: "Temos disponível às 9 horas."
2. DIAS FECHADOS: Se o cliente perguntar de um dia em que o salão está fechado (ex: hoje é Sábado e estamos fechados), diga: "Hoje estamos fechados, mas nosso horário é de [Dias] das [Hora] até [Hora]. Para segunda-feira, o profissional [Nome] tem estes horários: [Lista]". 
3. PROATIVIDADE: Se o cliente perguntar "quais os horários?", chame 'checkAvailability' para hoje ou para o próximo dia útil e apresente as opções IMEDIATAMENTE com nomes e horários por extenso.

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

        // 1. Fetch or Create Chat in DB
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });

        if (!chat) {
            chat = await AIChat.create({
                tenant_id: tenantId,
                customer_phone: phone,
                history: [],
                status: 'active'
            });
        }

        // Intervention Check: If status is 'manual', do not process with AI
        if (chat.status === 'manual') {
            console.log(`[AI Skipped] Chat with ${phone} is in MANUAL mode.`);
            // We still want to log the user message to history so the human agent sees context
            let history = [...(chat.history || [])]; // Shallow copy array
            history.push({ role: "user", content: messageText });

            chat.history = history.slice(-20);
            chat.last_message = messageText;
            chat.changed('history', true); // Force Sequelize to see the JSON change
            await chat.save();

            return null; // Return null to indicate no AI response
        }

        let history = [...(chat.history || [])];

        // Add user message
        history.push({ role: "user", content: messageText });

        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        // Robust Sanitization:
        // 1. Every 'tool' response must clearly correspond to a previous 'assistant' call.
        // 2. We keep sequences intact or drop them entirely if broken by a history slice.
        let sanitizedHistory = [];
        let callSequence = [];
        let openCallIds = new Set();

        for (const msg of history) {
            if (msg.role === 'assistant' && msg.tool_calls) {
                // If there's an unfinished sequence before this, it's malformed history. Drop it.
                if (openCallIds.size > 0) {
                    console.warn('[AI History] Dropping incomplete previous sequence');
                    sanitizedHistory = sanitizedHistory.slice(0, -callSequence.length);
                }
                callSequence = [msg];
                openCallIds = new Set(msg.tool_calls.map(tc => tc.id));
                sanitizedHistory.push(msg);
            } else if (msg.role === 'tool') {
                if (openCallIds.has(msg.tool_call_id)) {
                    sanitizedHistory.push(msg);
                    callSequence.push(msg);
                    openCallIds.delete(msg.tool_call_id);
                } else {
                    console.warn(`[AI History] Dropping orphaned tool message: ${msg.tool_call_id}`);
                }
            } else {
                // If sequence was interrupted by another role while waiting for tools, drop the sequence
                if (openCallIds.size > 0) {
                    console.warn('[AI History] Sequence interrupted. Dropping incomplete sequence.');
                    sanitizedHistory = sanitizedHistory.slice(0, -callSequence.length);
                    openCallIds.clear();
                    callSequence = [];
                }
                sanitizedHistory.push(msg);
            }
        }

        // Final safety: Remove unfinished sequence at the end if any
        if (openCallIds.size > 0) {
            sanitizedHistory = sanitizedHistory.slice(0, -callSequence.length);
        }

        // Ensure we don't start with a 'tool' role after all cleaning
        while (sanitizedHistory.length > 0 && sanitizedHistory[0].role === 'tool') {
            sanitizedHistory.shift();
        }

        try {
            let response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, ...sanitizedHistory],
                tools: tools,
                tool_choice: "auto",
            });

            let assistantMessage = response.choices[0].message;

            // Handle tool calls in a loop
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

                // Prepare messages for the next call including the updated history
                // Note: we use systemPrompt + sanitizedHistory (up to the point before tool calls) + history (containing tool responses)
                // Actually, history itself grows with assistantMessage and tool messages.
                // Re-calculating messages to ensure tool responses follow assistant tool_calls correctly.
                const nextMessages = [{ role: "system", content: systemPrompt }, ...history.slice(-20)];

                response = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: nextMessages,
                    tools: tools,
                });
                assistantMessage = response.choices[0].message;
            }

            history.push(assistantMessage);

            // Limit history size (e.g., last 20)
            const updatedHistory = history.slice(-20);

            // 2. Update Chat in DB
            chat.history = updatedHistory;
            chat.last_message = assistantMessage.content;
            if (chat.customer_name) chat.customer_name = chat.customer_name; // Optional re-assignment

            chat.changed('history', true);
            await chat.save();

            return assistantMessage.content;
        } catch (error) {
            console.error('[AI Service Error]:', error);
            return "Desculpe, tive um problema técnico ao processar sua solicitação. Um atendente humano irá te ajudar em breve.";
        }
    }

    /**
     * Synchronize a message sent manually (human intervention)
     */
    async synchronizeMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) return; // Only sync for existing chats

        let history = [...(chat.history || [])]; // Shallow copy
        const lastMsg = history[history.length - 1];

        // Avoid duplication (if the last message is already this message)
        if (lastMsg && lastMsg.content === messageText) {
            return;
        }

        history.push({ role: "assistant", content: messageText });

        chat.history = history.slice(-20);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    /**
     * Synchronize a message received from a user (for logging/monitoring)
     */
    async synchronizeUserMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });

        if (!chat) {
            chat = await AIChat.create({
                tenant_id: tenantId,
                customer_phone: phone,
                history: [],
                status: 'active'
            });
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });

        chat.history = history.slice(-20);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    /**
     * Improve text for marketing campaigns
     */
    async improveText(text) {
        if (!this.isConfigured()) throw new Error('OpenAI não configurada');

        const prompt = `Você é um especialista em marketing para salões de beleza. Melhore a seguinte mensagem para ser mais engajadora, persuasiva e profissional. Mantenha a mensagem central, mas aprimore a redação. Retorne apenas o texto melhorado em português do Brasil.\n\nMensagem: "${text}"`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('[AI Improve Text Error]:', error);
            throw error;
        }
    }

    /**
     * Process Internal Test Chat Message
     */
    async processTestMessage(tenantId, messageText, history = []) {
        if (!this.isConfigured()) {
            return "OpenAI não configurada.";
        }

        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        // Convert frontend history format if necessary, but here we assume it's already {role, content}
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: messageText }
        ];

        try {
            let response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
            });

            let assistantMessage = response.choices[0].message;

            // Handle tool calls in a loop (Simulation mode, still executes but non-WhatsApp)
            while (assistantMessage.tool_calls) {
                messages.push(assistantMessage);

                for (const toolCall of assistantMessage.tool_calls) {
                    // For test chat, we pass a dummy phone or a flag to denote test
                    const result = await this.handleToolCall(toolCall, tenantId, "INTERNAL_TEST");
                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                }

                response = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: messages,
                    tools: tools,
                });
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
