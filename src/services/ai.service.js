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
 * AIService - Version 2.8 (Absolute Stability & Zero Hallucination)
 */
class AIService {
    constructor() {
        console.log('[AI Service] Initializing Version 2.8...');
        this.openai = new OpenAI({
            apiKey: config.externalServices.openai.apiKey,
        });
    }

    isConfigured() {
        return !!config.externalServices.openai.apiKey;
    }

    getSafeMessages(systemPrompt, history, limit = 20) {
        let messages = [...history];
        if (messages.length > limit) messages = messages.slice(-limit);
        while (messages.length > 0 && messages[0].role === 'tool') messages.shift();
        while (messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].tool_calls) messages.pop();
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

        const businessHours = (Array.isArray(tenant.business_hours) && tenant.business_hours.length > 0)
            ? JSON.stringify(tenant.business_hours)
            : "Segunda a Sexta das 09:00 às 18:00 (Sábado e Domingo fechado)";

        const customBehavior = config?.prompt_behavior || config?.personality || "Seja cordial, profissional e prestativa.";

        return `
Data de hoje: ${new Date().toISOString().split('T')[0]}
Você é a recepcionista virtual do ${tenant.name}.

## PERSONALIDADE
- ${customBehavior}
- Use português do Brasil amigável.
- Seja CONCISA: no máximo 2 frases curtas.

## DICÇÃO DE VOZ (OBRIGATÓRIO)
1. **NUNCA** use zero à esquerda. Fale "9 horas", jamais "08 horas" ou "09 horas".
2. **12:00** deve ser escrito sempre como "meio dia".
3. Sempre use o sufixo "horas" (ex: "14 horas", "15:30 horas").

## REGRAS DE OURO
1. **NOMES OBRIGATÓRIOS**: Você DEVE falar o nome do profissional (Wagner ou Carlos) em toda listagem de horários.
2. **PROATIVIDADE**: Se o cliente perguntar horários, chame 'consultarDisponibilidade' e apresente as opções IMEDIATAMENTE com os nomes.
3. **ZERO ERROS**: NUNCA diga frases como "estou com dificuldades técnicas" ou "não consigo acessar". Se a lista de horários vier vazia, diga: "Para hoje não temos mais vagas, mas posso ver para amanhã?".

## SERVIÇOS
${servicesList}

## PROFISSIONAIS
${professionalsList}

## AGENDAMENTO
- Para 'bookAppointment', você PRECISA de: Data, Horário, ID do Serviço, ID do Profissional (Obrigatório) e Nome.
 `;
    }

    getTools() {
        return [
            {
                type: "function",
                function: {
                    name: "consultarDisponibilidade",
                    description: "Consulta horários livres no banco de dados.",
                    parameters: {
                        type: "object",
                        properties: {
                            data: { type: "string" },
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
                    description: "Realiza o agendamento final.",
                    parameters: {
                        type: "object",
                        properties: {
                            data: { type: "string" },
                            time: { type: "string" },
                            serviceId: { type: "integer" },
                            professionalId: { type: "integer" },
                            customerName: { type: "string" }
                        },
                        required: ["data", "time", "serviceId", "professionalId", "customerName"]
                    }
                }
            }
        ];
    }

    async handleToolCall(toolCall, tenantId, phone) {
        const { name } = toolCall.function;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[AI V2.8] Executing: ${name}`, args);

        if (name === 'consultarDisponibilidade') {
            try {
                const result = await appointmentService.getAvailability(args.professionalId, args.data, args.serviceId, tenantId);
                return {
                    status: "sucesso",
                    profissional: result.professional.name,
                    vagas: result.slots,
                    lembrete: `Diga o nome ${result.professional.name} e use a dicção de horas (ex: 9 horas).`
                };
            } catch (error) {
                console.error(`[AI V2.8] Tool Error:`, error.message);
                return { status: "vazio", mensagem: "Sem horários para esta data." };
            }
        }

        if (name === 'bookAppointment') {
            try {
                let client = await Client.findOne({ where: { phone, tenant_id: tenantId } });
                if (!client) client = await Client.create({ name: args.customerName, phone, tenant_id: tenantId });
                await appointmentService.create({
                    client_id: client.id, professional_id: args.professionalId, service_id: args.serviceId,
                    date: args.data, time: args.time, status: 'confirmado'
                }, tenantId, null);
                return { status: "sucesso", mensagem: "Agendado!" };
            } catch (error) { return { status: "erro", mensagem: error.message }; }
        }
        return { error: "Não encontrada" };
    }

    async transcribeAudio(audioBuffer) {
        if (!this.isConfigured()) throw new Error('OpenAI indisponível');
        const tmp = path.join(__dirname, `../../temp/audio_${Date.now()}.ogg`);
        await fsp.mkdir(path.dirname(tmp), { recursive: true });
        await fsp.writeFile(tmp, audioBuffer);
        try {
            const res = await this.openai.audio.transcriptions.create({ file: fs.createReadStream(tmp), model: "whisper-1", language: "pt" });
            return res.text;
        } finally { await fsp.unlink(tmp).catch(() => { }); }
    }

    async generateSpeech(text, voice = 'alloy', speed = 1.0) {
        const voiceMap = {
            'Sofia (Amigável)': 'alloy',
            'Julia (Profissional)': 'onyx',
            'Clara (Calma)': 'nova',
            'Sofia': 'alloy',
            'Julia': 'onyx',
            'Clara': 'nova'
        };
        const openAIVoice = voiceMap[voice] || voice || 'alloy';
        const validSpeed = Math.max(0.25, Math.min(4.0, speed));

        try {
            const res = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: openAIVoice,
                input: text,
                speed: validSpeed,
                response_format: "opus"
            });
            return Buffer.from(await res.arrayBuffer());
        } catch (e) {
            console.error("TTS Error:", e);
            throw e;
        }
    }

    async processMessage(tenantId, phone, messageText, isAudio = false) {
        console.log(`[AI V2.8] Processing: ${phone}`);
        if (!this.isConfigured()) return "Configuração pendente.";

        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });

        if (chat.status === 'manual') {
            let h = [...(chat.history || [])];
            h.push({ role: "user", content: messageText });
            chat.history = h.slice(-20);
            await chat.save();
            return null;
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();

        try {
            let messages = this.getSafeMessages(systemPrompt, history);
            let response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools, tool_choice: "auto" });
            let assistantMessage = response.choices[0].message;

            while (assistantMessage.tool_calls) {
                history.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, phone);
                    history.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                messages = this.getSafeMessages(systemPrompt, history, 30);
                response = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools });
                assistantMessage = response.choices[0].message;
            }

            history.push(assistantMessage);
            chat.history = history.slice(-20);
            chat.last_message = assistantMessage.content;
            chat.changed('history', true);
            await chat.save();
            return assistantMessage.content;
        } catch (error) {
            console.error('[AI V2.8 Error]:', error.message);
            return "Um atendente humano irá te ajudar em breve.";
        }
    }

    async synchronizeMessage(tenantId, phone, text) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) return;
        let h = [...(chat.history || [])];
        if (h.length > 0 && h[h.length - 1].content === text) return;
        h.push({ role: "assistant", content: text });
        chat.history = h.slice(-20);
        chat.last_message = text;
        chat.changed('history', true);
        await chat.save();
    }

    async synchronizeUserMessage(tenantId, phone, text) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });
        let h = [...(chat.history || [])];
        h.push({ role: "user", content: text });
        chat.history = h.slice(-20);
        chat.last_message = text;
        chat.changed('history', true);
        await chat.save();
    }

    async improveText(text) {
        if (!this.isConfigured()) return text;
        const res = await this.openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Melhore: "${text}"` }], max_tokens: 500 });
        return res.choices[0].message.content.trim();
    }

    async processTestMessage(tenantId, text, testHistory = []) {
        const systemPrompt = await this.generateSystemPrompt(tenantId);
        const tools = this.getTools();
        const historyCopy = [...testHistory];
        historyCopy.push({ role: "user", content: text });
        try {
            let messages = this.getSafeMessages(systemPrompt, historyCopy);
            let res = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools, tool_choice: "auto" });
            let assistantMessage = res.choices[0].message;
            while (assistantMessage.tool_calls) {
                historyCopy.push(assistantMessage);
                for (const toolCall of assistantMessage.tool_calls) {
                    const result = await this.handleToolCall(toolCall, tenantId, "TEST");
                    historyCopy.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
                }
                messages = this.getSafeMessages(systemPrompt, historyCopy, 30);
                res = await this.openai.chat.completions.create({ model: "gpt-4o", messages, tools });
                assistantMessage = res.choices[0].message;
            }
            return assistantMessage.content;
        } catch (error) { return "Erro no processamento."; }
    }
}

module.exports = new AIService();
