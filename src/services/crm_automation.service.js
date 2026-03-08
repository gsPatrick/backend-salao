/**
 * CRM Automation Service — Orchestrator & Real-Time Handlers
 * 
 * This service handles:
 * 1. Real-time event handlers (called by service hooks when things happen)
 * 2. Daily orchestration (delegates to the 8-Attempt Engine)
 * 
 * Real-time handlers reset attempt counters and move clients between funnels
 * when events like scheduling, no-shows, or completions occur.
 */

const { Plan, Tenant, Client, CRMSettings, Appointment } = require('../models');
const { Op } = require('sequelize');
const crmEngine = require('./crm_automation_cron.service');

class CRMAutomationService {

    /**
     * Check if tenant has AI enabled (Pro/Premium/Vitalício)
     */
    async isAIEnabled(tenantId) {
        const tenant = await Tenant.findByPk(tenantId, { include: [{ model: Plan, as: 'plan' }] });
        if (!tenant || !tenant.plan) return false;
        const planName = tenant.plan.name;
        const aiPlans = ['Empresa Pro', 'Empresa Premium', 'Vitalício', 'superadmin', 'gold', 'diamond'];
        return aiPlans.some(p => planName.includes(p) || p.includes(planName));
    }

    // ========================================================================
    // DAILY ORCHESTRATOR
    // ========================================================================

    /**
     * Main daily entry point — processes all tenants
     */
    async runDailyChecks() {
        console.log('[CRM Automation] ==========================================');
        console.log('[CRM Automation] Starting daily checks...');
        console.log('[CRM Automation] ==========================================');

        const tenants = await Tenant.findAll();

        for (const tenant of tenants) {
            try {
                // Always use the new engine for all tenants
                await crmEngine.processTenant(tenant.id);
            } catch (error) {
                console.error(`[CRM Automation] Error processing tenant ${tenant.id}:`, error.message);
            }
        }

        console.log('[CRM Automation] Daily checks complete.');
    }

    // ========================================================================
    // REAL-TIME HANDLERS (triggered by service hooks)
    // ========================================================================

    /**
     * Called when a new client is created
     * → Place in 'new' funnel, reset counters, set entry date
     */
    async handleNewClient(tenantId, client) {
        try {
            await client.update({
                crm_stage: 'new',
                classification: 'Novo',
                crm_attempt_count: 0,
                crm_attempt_cycle: 1,
                crm_last_attempt_at: null,
                crm_funnel_entered_at: new Date()
            });
            console.log(`[CRM Automation] Client ${client.name}: Placed in 'Novos Clientes' with counters reset`);
        } catch (error) {
            console.error(`[CRM Automation] Error handling new client ${client.id}:`, error.message);
        }
    }

    /**
     * Called when a client gets an appointment scheduled
     * → Move to 'scheduled' funnel, reset counters
     */
    async handleScheduledToday(tenantId, client, appointment) {
        try {
            // Don't override birthday tag
            const classification = client.classification === 'Parabéns' ? 'Parabéns' : 'Agendado';

            await client.update({
                crm_stage: 'scheduled',
                classification,
                crm_attempt_count: 0,
                crm_attempt_cycle: 1,
                crm_last_attempt_at: null,
                crm_funnel_entered_at: new Date()
            });
            console.log(`[CRM Automation] Client ${client.name}: Moved to 'Agendados' (appointment scheduled)`);
        } catch (error) {
            console.error(`[CRM Automation] Error handling scheduled client ${client.id}:`, error.message);
        }
    }

    /**
     * Called when a client misses/cancels appointment
     * → Move to 'absent' funnel, reset counters to start 8-attempt recovery
     */
    async handleAbsent(tenantId, client) {
        try {
            await client.update({
                crm_stage: 'absent',
                classification: 'Faltou',
                crm_attempt_count: 0,
                crm_attempt_cycle: 1,
                crm_last_attempt_at: null,
                crm_funnel_entered_at: new Date()
            });
            console.log(`[CRM Automation] Client ${client.name}: Moved to 'Faltantes' with recovery counters reset`);
        } catch (error) {
            console.error(`[CRM Automation] Error handling absent client ${client.id}:`, error.message);
        }
    }

    /**
     * Called when a client reschedules
     * → Move back to 'scheduled' funnel
     */
    async handleRescheduled(tenantId, client, appointment) {
        try {
            await client.update({
                crm_stage: 'scheduled',
                classification: 'Agendado',
                crm_attempt_count: 0,
                crm_attempt_cycle: 1,
                crm_last_attempt_at: null,
                crm_funnel_entered_at: new Date()
            });
            console.log(`[CRM Automation] Client ${client.name}: Rescheduled → 'Agendados'`);
        } catch (error) {
            console.error(`[CRM Automation] Error handling rescheduled client ${client.id}:`, error.message);
        }
    }

    /**
     * Called when a client completes an appointment without scheduling a new one
     * → Move to 'recurrent' funnel
     */
    async handleCompleted(tenantId, client) {
        try {
            // Check if client has a future appointment
            const futureAppointment = await Appointment.findOne({
                where: {
                    client_id: client.id,
                    tenant_id: tenantId,
                    date: { [Op.gt]: new Date().toISOString().split('T')[0] },
                    status: { [Op.in]: ['agendado', 'pendente', 'confirmado'] }
                }
            });

            if (futureAppointment) {
                // Has future appointment — keep in scheduled
                console.log(`[CRM Automation] Client ${client.name}: Has future appointment, staying in Agendados`);
                return;
            }

            await client.update({
                crm_stage: 'recurrent',
                classification: 'Recorrente',
                crm_attempt_count: 0,
                crm_attempt_cycle: 1,
                crm_last_attempt_at: null,
                crm_funnel_entered_at: new Date(),
                last_visit: new Date()
            });
            console.log(`[CRM Automation] Client ${client.name}: Completed → 'Recorrente'`);
        } catch (error) {
            console.error(`[CRM Automation] Error handling completed client ${client.id}:`, error.message);
        }
    }

    /**
     * Get the classification string for a given stage  
     */
    async getStageClassification(tenantId, stageId, defaultIcon, defaultTitle) {
        try {
            const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });
            if (!settings || !settings.funnel_stages) return `${defaultIcon} ${defaultTitle}`;
            const stage = settings.funnel_stages.find(s => s.id === stageId);
            return stage ? `${stage.icon} ${stage.title}` : `${defaultIcon} ${defaultTitle}`;
        } catch (error) {
            console.error('[CRM Automation] Error fetching stage classification:', error);
            return `${defaultIcon} ${defaultTitle}`;
        }
    }
}

module.exports = new CRMAutomationService();
