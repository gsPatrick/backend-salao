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
 * AIService - Version 2.7 (Atomic History & No-Hallucination Tools)
 */
class AIService {
    constructor() {
        console.log('[AI Service] Initializing Version 2.7...');
        this.openai = new OpenAI({
            apiKey: config.externalServices.openai.apiKey,
        });
    }

    isConfigured() {
        return !!config.externalServices.openai.apiKey;
    }

    /**
     * Ensures history integrity for OpenAI.
     * 1. Never starts with a 'tool' message.
     * 2. Never ends with an unanswered 'assistant' tool call.
     * 3. Every 'tool' message MUST have its corresponding 'assistant' call included.
     */
    getSafeMessages(systemPrompt, history, limit = 20) {
        let messages = [...history];

        // Truncate to limit first
        if (messages.length > limit) {
            messages = messages.slice(-limit);
        }

        // 1. Remove leading tool messages that lost their parent assistant call
        while (messages.length > 0 && messages[0].role === 'tool') {
            messages.shift();
        }

        // 2. Remove trailing assistant messages that have tool_calls but no children (they'll be re-generated)
        while (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].tool_calls) {
            messages.pop();
        }

        // 3. Final validation: OpenAI requires that tool calls are balanced
        // If we still have a tool message whose assistant call was just outside the slice, we must drop it
        const firstMsg = messages[0];
        if (firstMsg && firstMsg.role === 'tool') {
            // This shouldn't happen after step 1, but just in case
            messages.shift();
        }

        return [{ role: "system", content: systemPrompt }, ...messages];
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
            : "Segunda a Sexta das 08h às 18h (Sábado e Domingo fechado)";

        const customBehavior = config?.prompt_behavior || config?.personality || "Seja cordial, profissional e prestativa.";

        return `
Data de hoje: ${new Date().toISOString().split('T')[0]}
Você é a recepcionista virtual do ${tenant.name}.
Horário de Funcionamento: ${businessHours}

## PERSONA
- ${customBehavior}
- Use português do Brasil natural e amigável.
- Seja CONCISA: no máximo 2 frases curtas por resposta.

## DICÇÃO E VOZ (NÃO NEGOCIÁVEL)
Escreva os horários exatamente assim para a voz soar natural:
1. SEMPRE use o sufixo "horas" (ex: "9 horas", "14:30 horas").
2. NUNCA use zero à esquerda. Fale "8 horas", JAMAIS "08 horas".
3. Meio dia (12:00) deve ser escrito OBRIGATORIAMENTE como "meio dia".

## REGRAS DE OURO DE ATENDIMENTO
1. **IDENTIFICAÇÃO OBRIGATÓRIA**: Você deve falar o NOME do profissional (Wagner ou Carlos) em toda resposta sobre horários.
2. **SEGUNDA-FEIRA PROATIVA**: Se o salão estiver fechado hoje ou no dia solicitado, consulte o PRÓXIMO dia disponível e já ofereça os horários com o nome do profissional.
3. **TRATAMENTO DE "SEM VAGAS"**: Se a consulta de horários vir vazada ([]), diga educadamente que não há mais vagas para esse dia. NUNCA diga que é um "erro técnico" ou "dificuldade de acesso".

## SERVIÇOS
${servicesList}

## PROFISSIONAIS
${professionalsList}

## AGENDAMENTO
- Use 'checkAvailability' para sugerir horários. NUNCA invente horários.
- Para marcar ('bookAppointment'), você PRECISA de: Data, Horário (HH:MM), ID do Serviço, ID do Profissional e Nome do cliente.
 `;
    }

    getTools() {
        return [
            {
                type: "function",
                function: {
                    name: "consultarHorarios",
                    description: "Consulta horários disponíveis. Use sempre que o cliente quiser saber 'quais horários' ou 'quando tem'.",
                    parameters: {
                        type: "object",
                        properties: {
                            data: { type: "string", description: "Data no formato YYYY-MM-DD" },
                            serviceId: { type: "integer" },
                            professionalId: { type: ["integer", "null"] }
                        },
                        required: ["data", "serviceId"]
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
        console.log(`[AI V2.7] Executing tool: ${name}`, args);

        if (name === 'consultarHorarios') {
            try {
                const result = await appointmentService.getAvailability(args.professionalId, args.data, args.serviceId, tenantId);
                const output = {
                    sucesso: true,
                    profissional: result.professional.name,
                    horarios_livres: result.slots,
                    instrucao_voz: `Mencione o nome ${result.professional.name} e use 'horas' (ex: 9 horas).`
                };
                console.log(`[AI V2.7] Tool Result:`, output);
                return output;
            } catch (error) {
                console.error(`[AI V2.7] Tool Error:`, error.message);
                return { sucesso: false, erro: "Ocorreu um erro ao buscar no banco de dados." };
            }
        }

        if (name === 'bookAppointment') {
            try {
                let client = await Client.findOne({ where: { phone, tenant_id: tenantId } });
                if (!client) client = await Client.create({ name: args.customerName, phone, tenant_id: tenantId });
                await appointmentService.create({
                    client_id: client.id, professional_id: args.professionalId, service_id: args.serviceId,
                    date: args.date, time: args.time, status: 'confirmado'
                }, tenantId, null);
                return { sucesso: true, mensagem: "Agendamento realizado com sucesso!" };
            } catch (error) { return { sucesso: false, erro: error.message }; }
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
        console.log(`[AI V2.7] Processing message for ${phone}`);
        if (!this.isConfigured()) return "Configuração pendente.";

        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });

        if (chat.status === 'manual') {
            let history = [...(chat.history || [])];
            history.push({ role: "user", content: messageText });
            chat.history = history.slice(-20);
            await chat.save();
            return null;
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        try {
            let currentMessages = this.getSafeMessages(systemPrompt, history);
            let response = await this.openai.chat.completions.create({ model: "gpt-4o", messages: currentMessages, tools, tool_choice: "auto" });
            let assistantMessage = response.choices[0].message;

            while (assistantMessage.tool_calls) {
                history.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, phone);
                    history.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                // When finishing tools, we use more history to ensure the AI knows what just happened
                currentMessages = this.getSafeMessages(systemPrompt, history, 30);
                response = await this.openai.chat.completions.create({ model: "gpt-4o", messages: currentMessages, tools });
                assistantMessage = response.choices[0].message;
            }

            history.push(assistantMessage);
            chat.history = history.slice(-20); // History in DB is just a record, no strict sequence rules
            chat.last_message = assistantMessage.content;
            chat.changed('history', true);
            await chat.save();
            return assistantMessage.content;
        } catch (error) {
            console.error('[AI V2.7 Error]:', error.message, error.response?.data || '');
            return "Desculpe, tive um problema técnico. Um atendente humano irá te ajudar em breve.";
        }
    }

    async synchronizeMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) return;
        let history = [...(chat.history || [])];
        if (history.length > 0 && history[history.length - 1].content === messageText) return;
        history.push({ role: "assistant", content: messageText });
        chat.history = history.slice(-20);
        chat.last_message = messageText;
        chat.changed('history', true);
        await chat.save();
    }

    async synchronizeUserMessage(tenantId, phone, messageText) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });
        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        chat.history = history.slice(-20);
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
        const historyCopy = [...testHistory];
        historyCopy.push({ role: "user", content: messageText });
        try {
            let messages = this.getSafeMessages(systemPrompt, historyCopy);
            let response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools, tool_choice: "auto" });
            let assistantMessage = response.choices[0].message;
            while (assistantMessage.tool_calls) {
                historyCopy.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, "TEST");
                    historyCopy.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                messages = this.getSafeMessages(systemPrompt, historyCopy, 30);
                response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools });
                assistantMessage = response.choices[0].message;
            }
            return assistantMessage.content;
        } catch (error) { return "Erro ao processar simulação."; }
    }
}

module.exports = new AIService();
