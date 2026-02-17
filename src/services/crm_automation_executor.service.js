const { Client, Appointment, CRMSettings, FinancialTransaction } = require('../models');
const aiService = require('./ai.service');
const { Op } = require('sequelize');

class CRMAutomationExecutor {

    constructor() {
        this.queue = [];
        this.isProcessing = false;

        // Simple In-Memory Queue Processor (Fallback for BullMQ)
        setInterval(() => this.processQueue(), 1000);
    }

    /**
     * Add job to queue
     */
    async enqueue(tenantId, triggerType, data) {
        this.queue.push({ tenantId, triggerType, data, timestamp: Date.now() });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift();

        try {
            console.log(`[CRM Executor] Processing job: ${job.triggerType} for Tenant ${job.tenantId}`);
            await this.executeJob(job);
        } catch (error) {
            console.error('[CRM Executor] Job Failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async executeJob({ tenantId, triggerType, data, type, clientId }) {
        // Fallback for different job structures
        const finalTrigger = triggerType || type;
        const finalClientId = data?.clientId || clientId;

        console.log(`[CRM Executor] Processing Job: ${finalTrigger} for Client ${finalClientId}`);

        // 1. Fetch Rules
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        if (!settings || !settings.funnel_stages) return;

        // Flatten rules from all stages (or specific stage if needed)
        // We assume rules are attached to stages in `compiled_rules`
        let rules = [];
        settings.funnel_stages.forEach(stage => {
            if (Array.isArray(stage.compiled_rules)) {
                rules = rules.concat(stage.compiled_rules.map(r => ({ ...r, origin_stage_id: stage.id })));
            }
        });

        // Filter rules by trigger
        const matchingRules = rules.filter(r => r.trigger === finalTrigger);
        console.log(`[CRM Executor] Found ${matchingRules.length} rules matching trigger '${finalTrigger}'`);

        if (matchingRules.length === 0) return;

        // 2. Fetch Client & Build Context
        let client = null;
        if (finalClientId) {
            client = await Client.findByPk(finalClientId, {
                include: [{ model: Appointment, as: 'Appointments' }] // Basic include, optimizable
            });
        }
        if (!client) {
            console.error(`[CRM Executor] Client ${finalClientId} not found.`);
            return;
        }

        const context = await this.buildContext(client, tenantId);

        // 3. Evaluate & Execute
        for (const rule of matchingRules) {
            if (this.checkConditions(rule, context)) {

                // GUARDRAIL: Anti-Loop
                if (rule.action.type === 'move_client') {
                    const lastMove = client.last_automated_move ? new Date(client.last_automated_move) : null;
                    const now = new Date();
                    if (lastMove && (now - lastMove) < 24 * 60 * 60 * 1000) {
                        console.warn(`[CRM Executor] Anti-Loop triggered for Client ${client.id}. Skipping move.`);
                        continue;
                    }
                }

                await this.executeAction(rule, client, tenantId, context);

                // CONFLICT PROTECTION
                break;
            }
        }
    }

    async buildContext(client, tenantId) {
        // Calculate Metrics
        const appointments = await Appointment.findAll({
            where: { client_id: client.id, tenant_id: tenantId, status: { [Op.in]: ['concluido'] } }
        });

        const totalSpent = await FinancialTransaction.sum('amount', {
            where: { client_id: client.id, tenant_id: tenantId, type: 'receita' }
        }) || 0;

        const lastAppt = appointments.length > 0
            ? appointments.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            : null;

        // Calculate accurate inactivity
        let lastInteractionDate = client.createdAt ? new Date(client.createdAt) : new Date();
        if (client.lastVisit) lastInteractionDate = new Date(client.lastVisit); // Legacy field
        if (lastAppt) lastInteractionDate = new Date(lastAppt.date); // Appointment overrides

        const daysSinceLastVisit = Math.floor((new Date() - lastInteractionDate) / (1000 * 60 * 60 * 24));

        return {
            client_name: client.name,
            total_appointments: appointments.length,
            total_spent: parseFloat(totalSpent),
            days_since_last_visit: daysSinceLastVisit,
            is_new_client: appointments.length === 0,
            current_stage: client.crm_stage
        };
    }

    checkConditions(rule, context) {
        if (!rule.conditions) return true;

        // Example Condition Logic
        if (rule.conditions.days_threshold) {
            if (context.days_since_last_visit < rule.conditions.days_threshold) return false;
        }

        if (rule.conditions.event_type) {
            // Already filtered by trigger usually, but double check if needed
            console.log(`[CRM Executor] Condition for event_type is present but not evaluated here.`);
        }

        console.log(`[CRM Executor] All conditions passed for rule ${rule.name || 'Unnamed'}.`);
        return true;
    }

    async checkTimeRules(client, tenantId) {
        // 1. Fetch Rules (Similar to executeJob but optimized for time triggers)
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        if (!settings || !settings.funnel_stages) return;

        let rules = [];
        settings.funnel_stages.forEach(stage => {
            if (Array.isArray(stage.compiled_rules)) {
                rules = rules.concat(stage.compiled_rules.map(r => ({ ...r, origin_stage_id: stage.id })));
            }
        });

        // Filter for time-based triggers
        const timeRules = rules.filter(r => ['inactivity', 'time_in_stage'].includes(r.trigger));
        if (timeRules.length === 0) return;

        const context = await this.buildContext(client, tenantId);

        for (const rule of timeRules) {
            // Optimization: Only check rules relevant to the client's current stage?
            // User might want global inactivity rules regardless of stage.

            if (this.checkConditions(rule, context)) {
                // GUARDRAIL: Anti-Loop
                if (rule.action.type === 'move_client') {
                    const lastMove = client.last_automated_move ? new Date(client.last_automated_move) : null;
                    const now = new Date();
                    if (lastMove && (now - lastMove) < 24 * 60 * 60 * 1000) {
                        continue;
                    }
                }
                await this.executeAction(rule, client, tenantId, context);

                // CONFLICT PROTECTION: Execute only the first matching rule per client pass
                break;
            }
        }
    }

    async executeAction(rule, client, tenantId, context) {
        const { action } = rule;
        console.log(`[Automação IA] Cliente: ${client.name} | Ação: ${action.type} | Motivo: Regra ${rule.trigger}`);

        if (action.type === 'move_client') {
            await client.update({
                crm_stage: action.params.target_stage,
                last_automated_move: new Date()
            });
            // Update classification/tags if possible logic exists
        }
        else if (action.type === 'send_message') {
            // Call AI to generate message if template is dynamic
            let content = action.params.template;

            // If template looks like a prompt, call AI
            if (content.length > 50 || content.includes('{{')) {
                content = await aiService.processMessage(tenantId, client.phone, `Gere uma mensagem para o cliente ${client.name} seguindo esta regra: ${content}`, false, 'ACTION_GENERATION');
            }

            const whatsappService = require('./whatsapp.service');
            const { Tenant } = require('../models');
            const tenant = await Tenant.findByPk(tenantId);
            if (tenant) {
                await whatsappService.sendMessage(client.phone, content, tenant);
                console.log(`[Automação IA] Cliente: ${client.name} | Mensagem Enviada: "${content.substring(0, 30)}..."`);
            } else {
                console.error(`[CRM Executor] Tenant ${tenantId} not found for sending WhatsApp.`);
            }
        }
    }
}

module.exports = new CRMAutomationExecutor();
