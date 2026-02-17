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

    async getUnitSelectionMenu(tenantId) {
        const { Unit } = require('../models');
        const units = await Unit.findAll({ where: { tenant_id: tenantId, is_suspended: false } });
        if (units.length <= 1) return null;

        let menu = "Olá! 👋 Seja bem-vindo ao nosso atendimento.\n\nPara começarmos, por favor, me diga em qual de nossas unidades você deseja falar:\n\n";
        units.forEach((u, i) => {
            menu += `${i + 1}. *${u.name}*\n`;
        });
        menu += "\nDigite apenas o *número* ou o *nome* da unidade.";
        return { menu, units };
    }

    async generateSystemPrompt(tenantId, unitId = null) {
        const { AIAgentConfig, Unit } = require('../models');
        const tenant = await Tenant.findByPk(tenantId, {
            include: [
                { model: Service, as: 'services' },
                { model: Professional, as: 'professionals' },
                { model: Unit, as: 'units' }
            ]
        });
        const config = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        const unitsList = tenant.units.filter(u => !u.is_suspended)
            .map(u => `- Unidade ${u.name}: ${u.address?.street || ''}, ${u.address?.number || ''}, ${u.address?.neighborhood || ''}, ${u.address?.city || ''}`).join('\n');

        const servicesList = tenant.services.filter(s => !s.is_suspended)
            .map(s => {
                const unit = tenant.units.find(u => u.id === s.unit_id);
                return `- ${s.name} (${unit ? `Unidade ${unit.name}` : 'Geral'}) (ID: ${s.id}, R$ ${s.price}, ${s.duration}min)`;
            }).join('\n');

        const professionalsList = tenant.professionals.filter(p => !p.is_suspended && !p.is_archived)
            .map(p => {
                const unit = tenant.units.find(u => u.id === p.unit_id);
                return `- ${p.name} (${unit ? `Unidade ${unit.name}` : 'Geral'}) (ID: ${p.id})`;
            }).join('\n');

        const businessHours = (Array.isArray(tenant.business_hours) && tenant.business_hours.length > 0)
            ? JSON.stringify(tenant.business_hours)
            : "Segunda a Sexta das 09:00 às 18:00 (Sábado e Domingo fechado)";

        const customBehavior = config?.prompt_behavior || config?.personality || "Seja cordial, profissional e prestativa.";

        const selectedUnit = unitId ? tenant.units.find(u => u.id === unitId) : null;

        return `
Data de hoje: ${new Date().toISOString().split('T')[0]}
Você é a recepcionista virtual do ${tenant.name}.
${selectedUnit ? `VOCÊ ESTÁ ATENDENDO PARA A UNIDADE: ${selectedUnit.name}` : ''}

## UNIDADES DISPONÍVEIS
${unitsList}

## PERSONALIDADE
- ${customBehavior}
- Use português do Brasil amigável.
- Seja CONCISA: no máximo 2 frases curtas.

## REGRAS DE OURO (UNIDADES)
1. **DIFERENCIAÇÃO DE UNIDADE**: Se o cliente perguntar por um serviço ou profissional, mencione a unidade correspondente.
2. **POLIDEZ**: Se o cliente não especificar a unidade, pergunte gentilmente: "Em qual de nossas unidades você prefere ser atendido?"

## DICÇÃO DE VOZ (OBRIGATÓRIO)
1. **NUNCA** use zero à esquerda. Fale "9 horas", jamais "08 horas" ou "09 horas".
2. **12:00** deve ser escrito sempre como "meio dia".
3. Sempre use o sufixo "horas" (ex: "14 horas", "15:30 horas").

## AGENDAMENTO
1. **NOMES OBRIGATÓRIOS**: Você DEVE falar o nome do profissional (Wagner ou Carlos) em toda listagem de horários.
2. **PROATIVIDADE**: Se o cliente perguntar horários, chame 'consultarDisponibilidade' e apresente as opções IMEDIATAMENTE com os nomes.
3. **ZERO ERROS**: NUNCA diga frases como "estou com dificuldades técnicas" ou "não consigo acessar". Se a lista de horários virem vazia, diga: "Para hoje não temos mais vagas, mas posso ver para amanhã?".

## SERVIÇOS
${servicesList}

## PROFISSIONAIS
${professionalsList}

## REQUISITOS PARA BOOKING
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
                            professionalId: { type: ["integer", "null"] },
                            unitId: { type: ["integer", "null"] }
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
                            unitId: { type: "integer" },
                            customerName: { type: "string" }
                        },
                        required: ["data", "time", "serviceId", "professionalId", "unitId", "customerName"]
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
                const result = await appointmentService.getAvailability(args.professionalId, args.data, args.serviceId, tenantId, args.unitId);
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
                    client_id: client.id,
                    professional_id: args.professionalId,
                    service_id: args.serviceId,
                    unit_id: args.unitId,
                    date: args.data,
                    time: args.time,
                    status: 'confirmado'
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

    async processMessage(tenantId, phone, messageText, isAudio = false, additionalContext = '') {
        console.log(`[AI V2.8] Processing: ${phone}`);
        if (!this.isConfigured()) return "Configuração pendente.";

        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) chat = await AIChat.create({ tenant_id: tenantId, customer_phone: phone, history: [], status: 'active' });

        // Unit Selection Menu Logic
        if (!chat.unit_id) {
            const menuData = await this.getUnitSelectionMenu(tenantId);
            if (menuData) {
                const { menu, units } = menuData;

                // Check if user replied with a choice
                const choice = messageText.trim().toLowerCase();
                const matchedUnit = units.find((u, i) =>
                    choice === (i + 1).toString() ||
                    choice === u.name.toLowerCase() ||
                    u.name.toLowerCase().includes(choice)
                );

                if (matchedUnit) {
                    await chat.update({ unit_id: matchedUnit.id });
                    // Continue to process as a normal message now that we have a unit
                    messageText = `Olá, escolhi a unidade ${matchedUnit.name}. Como pode me ajudar?`;
                } else {
                    // If no match and it's not a generic greeting, just send the menu
                    // We sync the user message first so it shows up in history
                    await this.synchronizeUserMessage(tenantId, phone, messageText);
                    return menu;
                }
            }
        }

        if (chat.status === 'manual') {
            let h = [...(chat.history || [])];
            h.push({ role: "user", content: messageText });
            chat.history = h.slice(-20);
            await chat.save();
            return null;
        }

        let history = [...(chat.history || [])];
        history.push({ role: "user", content: messageText });
        const systemPrompt = (await this.generateSystemPrompt(tenantId, chat.unit_id)) + '\n' + additionalContext;
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

    async synchronizeMessage(tenantId, phone, text, name = null) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) {
            chat = await AIChat.create({
                tenant_id: tenantId,
                customer_phone: phone,
                customer_name: name,
                history: [],
                status: 'active'
            });
        } else if (name && !chat.customer_name) {
            await chat.update({ customer_name: name });
        }

        let h = [...(chat.history || [])];
        if (h.length > 0 && h[h.length - 1].content === text) return;
        h.push({ role: "assistant", content: text });
        chat.history = h.slice(-20);
        chat.last_message = text;
        chat.changed('history', true);
        await chat.save();
    }

    async synchronizeUserMessage(tenantId, phone, text, name = null) {
        let chat = await AIChat.findOne({ where: { tenant_id: tenantId, customer_phone: phone } });
        if (!chat) {
            chat = await AIChat.create({
                tenant_id: tenantId,
                customer_phone: phone,
                customer_name: name,
                history: [],
                status: 'active'
            });
        } else if (name && !chat.customer_name) {
            await chat.update({ customer_name: name });
        }

        let h = [...(chat.history || [])];
        if (h.length > 0 && h[h.length - 1].content === text && h[h.length - 1].role === 'user') return;
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

            historyCopy.push(assistantMessage);
            return assistantMessage.content;
        } catch (error) {
            console.error('[AI V2.8 Test Error]:', error.message);
            return "Erro no teste.";
        }
    }

    async compileCRMActionRules(userDescription) {
        if (!this.isConfigured()) return [];

        const prompt = `
        You are a CRM Rule Compiler.
        Translate the User's Natural Language Description into a JSON Array of Rules.

        # USER DESCRIPTION:
        "${userDescription}"

        # JSON SCHEMA OUTPUT (STRICT):
        [
          {
            "trigger": "inactivity" | "time_in_stage" | "appointment_created" | "appointment_completed",
            "conditions": {
              "days_threshold": number (only for inactivity/time_in_stage),
              "event_type": "created" | "completed" | "cancelled" (only for appointment events)
            },
            "action": {
              "type": "move_client" | "send_message" | "notify_admin",
              "params": {
                 "target_stage": string (stage id or approximate name),
                 "template": string (message content if sending message)
              }
            }
          }
        ]

        # EXAMPLES:
        Input: "Se o cliente ficar 30 dias sem vir, mova para Inativos."
        Output: [{"trigger":"inactivity","conditions":{"days_threshold":30},"action":{"type":"move_client","params":{"target_stage":"inativos"}}}]

        Input: "Quando o cliente agendar, mova para Agendados."
        Output: [{"trigger":"appointment_created","conditions":{},"action":{"type":"move_client","params":{"target_stage":"scheduled"}}}]

        RETURN ONLY JSON. NO MARKDOWN.
        `;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: prompt }],
                temperature: 0.1 // Deterministic
            });

            let content = response.choices[0].message.content.trim();
            // Cleanup markdown if present
            if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '');
            else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '');

            return JSON.parse(content);
        } catch (error) {
            console.error('[AI Compiler] Error:', error);
            return []; // Return empty array on failure
        }
    }
}

module.exports = new AIService();
