/**
 * CRM Automation Cron Service — 8-Attempt Engine
 * 
 * This is the CORE motor that processes all CRM funnel automations:
 * - 8-attempt messaging for New, Absent, and Inactive funnels
 * - 2-cycle reactivation for Inactive clients
 * - 60-day inactivity monitoring for Recurrent clients
 * - Birthday automation with humanized delays
 * - Scheduled appointment reminders (48h, 24h, 2h)
 * 
 * Schedule: Runs via daily cron job
 */

const { Client, Tenant, CRMSettings, Appointment, Plan } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const whatsappService = require('./whatsapp.service');

// Attempt schedule: days after funnel entry date
const ATTEMPT_SCHEDULE = [0, 2, 3, 4, 5, 12, 19, 26];
const MAX_ATTEMPTS = 8;
const INACTIVE_CYCLE_INTERVAL_DAYS = 30;
const MAX_CYCLES = 2;
const RECURRENT_INACTIVITY_DAYS = 60;

// Birthday humanization: 60-90 second delay between each message
const BIRTHDAY_MIN_DELAY_MS = 60000;  // 60 seconds
const BIRTHDAY_MAX_DELAY_MS = 90000;  // 90 seconds

class CRMAttemptEngine {

    /**
     * Main entry point — processes a single tenant
     */
    async processTenant(tenantId) {
        console.log(`[CRM Engine] ========== Starting for Tenant ${tenantId} ==========`);

        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });
        if (!tenant) return;

        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
        if (!settings || !settings.funnel_stages) return;

        const stages = settings.funnel_stages;

        try {
            // 1. Birthday Automation (HIGH PRIORITY — runs first at 08:00)
            await this.processBirthdays(tenantId, tenant, settings);

            // 2. Remove birthday tags from yesterday
            await this.removeBirthdayTags(tenantId);

            // 3. Process attempt-based funnels
            await this.processAttemptFunnel(tenantId, tenant, stages, 'new');
            await this.processAttemptFunnel(tenantId, tenant, stages, 'absent');
            await this.processInactiveFunnel(tenantId, tenant, stages);

            // 4. Monitor recurrent clients for 60-day inactivity
            await this.processRecurrentMonitoring(tenantId);

            // 5. Process appointment reminders (48h, 24h, 2h)
            await this.processAppointmentReminders(tenantId, tenant, stages);

        } catch (error) {
            console.error(`[CRM Engine] Fatal error for Tenant ${tenantId}:`, error);
        }

        console.log(`[CRM Engine] ========== Finished for Tenant ${tenantId} ==========`);
    }

    // ========================================================================
    // CORE: 8-Attempt Engine for New and Absent funnels
    // ========================================================================

    /**
     * Process clients in 'new' or 'absent' funnel with 8-attempt schedule
     */
    async processAttemptFunnel(tenantId, tenant, stages, funnelId) {
        const stage = stages.find(s => s.id === funnelId);
        if (!stage || !stage.ai_actions || !stage.ai_actions[0]?.active) return;

        const action = stage.ai_actions[0];
        const templates = action.message_templates || [];

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                crm_stage: funnelId,
                is_active: true,
                crm_attempt_count: { [Op.lt]: MAX_ATTEMPTS }
            },
            order: [['crm_funnel_entered_at', 'ASC']]
        });

        if (clients.length === 0) return;
        console.log(`[CRM Engine] [${funnelId}] Found ${clients.length} clients to process`);

        for (const client of clients) {
            try {
                const shouldSend = this.shouldSendAttempt(client);
                if (!shouldSend) continue;
                if (!client.phone) continue;

                const attemptIndex = client.crm_attempt_count || 0;
                const template = templates[attemptIndex] || templates[templates.length - 1] || '';

                if (!template) continue;

                const message = this.replacePlaceholders(template, client, tenant);
                await whatsappService.sendMessage(client.phone, message, tenant);

                // Increment attempt counter
                await client.update({
                    crm_attempt_count: attemptIndex + 1,
                    crm_last_attempt_at: new Date()
                });

                console.log(`[CRM Engine] [${funnelId}] Attempt ${attemptIndex + 1}/${MAX_ATTEMPTS} sent to ${client.name}`);

                // Check if this was the last attempt (8th)
                if (attemptIndex + 1 >= MAX_ATTEMPTS) {
                    await this.moveClientToFunnel(client, 'inactive', tenantId);
                    console.log(`[CRM Engine] [${funnelId}] ${client.name} → Inativos (8 tentativas esgotadas)`);
                }

                // Small delay between clients to avoid WhatsApp rate limiting
                await this.delay(2000);

            } catch (err) {
                console.error(`[CRM Engine] [${funnelId}] Error processing ${client.name}:`, err.message);
            }
        }
    }

    // ========================================================================
    // INACTIVE: 2-Cycle Reactivation Engine
    // ========================================================================

    /**
     * Process inactive clients with 2-cycle reactivation logic
     */
    async processInactiveFunnel(tenantId, tenant, stages) {
        const stage = stages.find(s => s.id === 'inactive');
        if (!stage || !stage.ai_actions || !stage.ai_actions[0]?.active) return;

        const action = stage.ai_actions[0];
        const templates = action.message_templates || [];

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                crm_stage: 'inactive',
                is_active: true,
                [Op.or]: [
                    { crm_attempt_cycle: { [Op.lt]: MAX_CYCLES } },
                    {
                        crm_attempt_cycle: MAX_CYCLES,
                        crm_attempt_count: { [Op.lt]: MAX_ATTEMPTS }
                    }
                ]
            },
            order: [['crm_funnel_entered_at', 'ASC']]
        });

        if (clients.length === 0) return;
        console.log(`[CRM Engine] [inactive] Found ${clients.length} clients to process`);

        for (const client of clients) {
            try {
                const currentCycle = client.crm_attempt_cycle || 1;
                const currentAttempt = client.crm_attempt_count || 0;

                // If all attempts exhausted for current cycle
                if (currentAttempt >= MAX_ATTEMPTS) {
                    if (currentCycle >= MAX_CYCLES) {
                        // Both cycles exhausted — stop automation
                        console.log(`[CRM Engine] [inactive] ${client.name}: 2 cycles exhausted. Stopping automation.`);
                        continue;
                    }

                    // Check if 30-day interval has passed since last attempt
                    const lastAttempt = client.crm_last_attempt_at ? new Date(client.crm_last_attempt_at) : null;
                    if (!lastAttempt) continue;

                    const daysSinceLastAttempt = Math.floor((new Date() - lastAttempt) / (1000 * 60 * 60 * 24));
                    if (daysSinceLastAttempt < INACTIVE_CYCLE_INTERVAL_DAYS) {
                        continue; // Still within 30-day cooldown
                    }

                    // Start new cycle
                    await client.update({
                        crm_attempt_count: 0,
                        crm_attempt_cycle: currentCycle + 1,
                        crm_funnel_entered_at: new Date()
                    });
                    console.log(`[CRM Engine] [inactive] ${client.name}: Starting Cycle ${currentCycle + 1}`);
                    continue; // Will be processed in next run
                }

                // Normal attempt processing
                const shouldSend = this.shouldSendAttempt(client);
                if (!shouldSend) continue;
                if (!client.phone) continue;

                const template = templates[currentAttempt] || templates[templates.length - 1] || '';
                if (!template) continue;

                const message = this.replacePlaceholders(template, client, tenant);
                await whatsappService.sendMessage(client.phone, message, tenant);

                await client.update({
                    crm_attempt_count: currentAttempt + 1,
                    crm_last_attempt_at: new Date()
                });

                console.log(`[CRM Engine] [inactive] Cycle ${currentCycle}, Attempt ${currentAttempt + 1}/${MAX_ATTEMPTS} sent to ${client.name}`);
                await this.delay(2000);

            } catch (err) {
                console.error(`[CRM Engine] [inactive] Error processing ${client.name}:`, err.message);
            }
        }
    }

    // ========================================================================
    // RECURRENT: 60-Day Inactivity Monitoring
    // ========================================================================

    async processRecurrentMonitoring(tenantId) {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - RECURRENT_INACTIVITY_DAYS);

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                crm_stage: 'recurrent',
                is_active: true,
                [Op.or]: [
                    { last_visit: { [Op.lt]: sixtyDaysAgo } },
                    { last_visit: null }
                ]
            }
        });

        for (const client of clients) {
            await this.moveClientToFunnel(client, 'inactive', tenantId);
            console.log(`[CRM Engine] [recurrent] ${client.name} → Inativos (60+ dias sem visita)`);
        }

        // Also revive: clients currently inactive but with recent activity → recurrent
        const recentClients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                crm_stage: 'inactive',
                is_active: true,
                last_visit: { [Op.gte]: sixtyDaysAgo }
            }
        });

        for (const client of recentClients) {
            await this.moveClientToFunnel(client, 'recurrent', tenantId);
            console.log(`[CRM Engine] [inactive→recurrent] ${client.name} revived (recent visit)`);
        }
    }

    // ========================================================================
    // APPOINTMENT REMINDERS: 48h, 24h, 2h
    // ========================================================================

    async processAppointmentReminders(tenantId, tenant, stages) {
        const stage = stages.find(s => s.id === 'scheduled');
        if (!stage || !stage.ai_actions || !stage.ai_actions[0]?.active) return;

        const action = stage.ai_actions[0];
        const templates = action.message_templates || [];
        const reminderHours = action.reminder_schedule?.hours_before || [48, 24, 2];

        const now = new Date();

        for (let i = 0; i < reminderHours.length; i++) {
            const hours = reminderHours[i];
            const templateMsg = templates[i] || templates[templates.length - 1] || '';
            if (!templateMsg) continue;

            // Calculate target window: appointments happening in ~hours from now (±30 min tolerance)
            const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
            const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
            const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);

            const targetDateStr = targetTime.toISOString().split('T')[0];

            const appointments = await Appointment.findAll({
                where: {
                    tenant_id: tenantId,
                    date: targetDateStr,
                    status: { [Op.in]: ['agendado', 'pendente', 'confirmado'] }
                },
                include: [{ model: Client, as: 'client' }]
            });

            for (const appt of appointments) {
                try {
                    const client = appt.client;
                    if (!client || !client.phone || !client.is_active) continue;

                    // Check if we already sent this reminder
                    const prefs = client.preferences || {};
                    const reminderKey = `reminder_${hours}h_${appt.id}`;
                    if (prefs[reminderKey]) continue;

                    const message = this.replacePlaceholders(templateMsg, client, tenant);
                    await whatsappService.sendMessage(client.phone, message, tenant);

                    // Mark as sent
                    await client.update({
                        preferences: { ...prefs, [reminderKey]: new Date().toISOString() }
                    });

                    console.log(`[CRM Engine] [reminder] ${hours}h reminder sent to ${client.name} for appointment ${appt.id}`);
                    await this.delay(1500);

                } catch (err) {
                    console.error(`[CRM Engine] [reminder] Error sending ${hours}h reminder:`, err.message);
                }
            }
        }
    }

    // ========================================================================
    // BIRTHDAY AUTOMATION: Daily job at 08:00
    // ========================================================================

    async processBirthdays(tenantId, tenant, settings) {
        const today = new Date();
        const month = today.getMonth() + 1; // JS months are 0-indexed
        const day = today.getDate();
        const currentYear = today.getFullYear();

        // Birthday message template
        const birthdayTemplate = "Feliz Aniversário, [Nome]! 🎂🎉\n\nA equipe da [Nome do Negócio] deseja um dia incrível para você! Que este novo ano seja repleto de realizações.\n\nVenha comemorar conosco! 🎁💜";

        // Find clients with birthday today
        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                is_active: true,
                birth_date: { [Op.ne]: null }
            }
        });

        // Filter by month/day in JS (more reliable across DBs)
        const birthdayClients = clients.filter(c => {
            const bd = new Date(c.birth_date);
            return (bd.getMonth() + 1) === month && bd.getDate() === day;
        });

        if (birthdayClients.length === 0) return;
        console.log(`[CRM Engine] [birthday] Found ${birthdayClients.length} birthdays today`);

        for (const client of birthdayClients) {
            try {
                // Annual control: only send once per year
                const prefs = client.preferences || {};
                if (prefs.birthday_tag_sent_year === currentYear) {
                    console.log(`[CRM Engine] [birthday] Already sent to ${client.name} this year`);
                    continue;
                }

                if (!client.phone) continue;

                // Send birthday message
                const message = this.replacePlaceholders(birthdayTemplate, client, tenant);
                await whatsappService.sendMessage(client.phone, message, tenant);

                // Apply "Parabéns" tag, save previous classification
                const prevClassification = client.classification;
                await client.update({
                    classification: 'Parabéns',
                    preferences: {
                        ...prefs,
                        birthday_tag_sent_year: currentYear,
                        prev_classification: prevClassification
                    }
                });

                console.log(`[CRM Engine] [birthday] 🎂 Message sent + tag applied for ${client.name}`);

                // HUMANIZATION: 60-90 second random delay between each birthday message
                const randomDelay = BIRTHDAY_MIN_DELAY_MS + Math.random() * (BIRTHDAY_MAX_DELAY_MS - BIRTHDAY_MIN_DELAY_MS);
                await this.delay(randomDelay);

            } catch (err) {
                console.error(`[CRM Engine] [birthday] Error for ${client.name}:`, err.message);
            }
        }
    }

    /**
     * Remove "Parabéns" tag from clients whose birthday was yesterday
     */
    async removeBirthdayTags(tenantId) {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();

        const clients = await Client.findAll({
            where: {
                tenant_id: tenantId,
                classification: 'Parabéns',
                is_active: true
            }
        });

        for (const client of clients) {
            if (!client.birth_date) continue;
            const bd = new Date(client.birth_date);
            const bdMonth = bd.getMonth() + 1;
            const bdDay = bd.getDate();

            // If today is NOT the client's birthday, remove tag (it was yesterday)
            if (bdMonth !== todayMonth || bdDay !== todayDay) {
                const prefs = client.preferences || {};
                const prevClassification = prefs.prev_classification || null;
                await client.update({ classification: prevClassification });
                console.log(`[CRM Engine] [birthday] Tag removed from ${client.name} → restored '${prevClassification}'`);
            }
        }
    }

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    /**
     * Determines if it's time to send the next attempt based on funnel entry date + schedule
     */
    shouldSendAttempt(client) {
        const enteredAt = client.crm_funnel_entered_at ? new Date(client.crm_funnel_entered_at) : null;
        if (!enteredAt) return true; // First time — no entry date yet, send immediately

        const attemptIndex = client.crm_attempt_count || 0;
        if (attemptIndex >= MAX_ATTEMPTS) return false;

        const scheduledDay = ATTEMPT_SCHEDULE[attemptIndex];
        if (scheduledDay === undefined) return false;

        // Calculate the exact date this attempt should be sent
        const attemptDate = new Date(enteredAt);
        attemptDate.setDate(attemptDate.getDate() + scheduledDay);

        // Set to start of day for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        attemptDate.setHours(0, 0, 0, 0);

        // Only send if today >= scheduled date
        if (today < attemptDate) return false;

        // Prevent duplicate today: check if already sent today
        const lastAttempt = client.crm_last_attempt_at ? new Date(client.crm_last_attempt_at) : null;
        if (lastAttempt) {
            const lastAttemptDay = new Date(lastAttempt);
            lastAttemptDay.setHours(0, 0, 0, 0);
            if (lastAttemptDay.getTime() === today.getTime()) {
                return false; // Already sent today
            }
        }

        return true;
    }

    /**
     * Replace placeholders [Nome] and [Nome do Negócio] in message templates
     */
    replacePlaceholders(template, client, tenant) {
        const clientName = client.social_name && client.use_social_name ? client.social_name : (client.name || '');
        const firstName = clientName.split(' ')[0];
        const businessName = tenant?.name || tenant?.business_name || 'nosso salão';

        return template
            .replace(/\[Nome\]/g, firstName)
            .replace(/\[Nome do Negócio\]/g, businessName);
    }

    /**
     * Move a client to a different funnel, resetting attempt counters
     */
    async moveClientToFunnel(client, targetFunnelId, tenantId) {
        const classificationMap = {
            'new': 'Novo',
            'scheduled': 'Agendado',
            'absent': 'Faltou',
            'recurrent': 'Recorrente',
            'inactive': 'Inativo'
        };

        await client.update({
            crm_stage: targetFunnelId,
            classification: classificationMap[targetFunnelId] || targetFunnelId,
            crm_attempt_count: 0,
            crm_attempt_cycle: 1,
            crm_last_attempt_at: null,
            crm_funnel_entered_at: new Date(),
            last_automated_move: new Date()
        });
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new CRMAttemptEngine();
