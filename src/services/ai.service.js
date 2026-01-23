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
Você é a recepcionista virtual do ${tenant.name}.
Localização: ${JSON.stringify(tenant.address)}
Horário de Funcionamento: ${businessHours}

## IDENTIDADE E COMPORTAMENTO
- ${customBehavior}
- Use português do Brasil natural.
- Seja concisa e direta: no máximo 2 frases curtas por resposta.
- Objetivo: Agendar serviços e tirar dúvidas.

## SERVIÇOS
${servicesList}

## PROFISSIONAIS
${professionalsList}

## REGRAS CRÍTICAS
1. SEMPRE verifique disponibilidade usando a ferramenta 'checkAvailability' antes de confirmar qualquer horário.
2. NUNCA invente horários. Se o cliente pedir um horário e não houver disponibilidade, sugira alternativas baseadas no retorno da função.
3. Só realize o agendamento com 'bookAppointment' após o cliente CONFIRMAR explicitamente o horário e profissional.
4. Para o agendamento, você precisa de: data (YYYY-MM-DD), horário (HH:MM), serviço (ID), profissional (ID) e nome do cliente.
5. Se o cliente não especificar um profissional, use null para 'professionalId' na consulta de disponibilidade.
6. Nunca responda com mais de 50 palavras.
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
                    description: "Consulta horários disponíveis para um serviço e profissional em uma data específica.",
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
                // If professionalId is null, we might need a different strategy, but our service supports it
                const slots = await appointmentService.getAvailability(
                    args.professionalId,
                    args.date,
                    args.serviceId,
                    tenantId
                );
                return {
                    success: true,
                    availableSlots: slots,
                    message: slots.length > 0 ? "Horários encontrados." : "Não há horários disponíveis para esta seleção."
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
    async generateSpeech(text, voice = 'coral') {
        const response = await this.openai.audio.speech.create({
            model: "gpt-4o-mini-tts",
            voice: voice,
            input: text,
            response_format: "mp3"
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
            let history = chat.history || [];
            history.push({ role: "user", content: messageText });
            await chat.update({
                history: history.slice(-20),
                last_message: messageText // Update last message for list view
            });
            return null; // Return null to indicate no AI response
        }

        let history = chat.history || [];

        // Add user message
        history.push({ role: "user", content: messageText });

        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        try {
            let response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: systemPrompt }, ...history],
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

                response = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }, ...history],
                    tools: tools,
                });
                assistantMessage = response.choices[0].message;
            }

            history.push(assistantMessage);

            // Limit history size (e.g., last 20)
            const updatedHistory = history.slice(-20);

            // 2. Update Chat in DB
            await chat.update({
                history: updatedHistory,
                last_message: assistantMessage.content,
                customer_name: chat.customer_name // Could be updated if tool found it
            });

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

        let history = chat.history || [];
        const lastMsg = history[history.length - 1];

        // Avoid duplication (if the last message is already this message)
        if (lastMsg && lastMsg.content === messageText) {
            return;
        }

        history.push({ role: "assistant", content: messageText });

        await chat.update({
            history: history.slice(-20),
            last_message: messageText
        });
    }
}

module.exports = new AIService();
