const { CRMSettings, Lead } = require('../../models');

class CRMService {
    async getSettings(tenantId) {
        let settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });

        if (!settings) {
            settings = await CRMSettings.create({ tenant_id: tenantId });
        }

        // Migration logic: Convert single action fields to ai_actions array
        if (settings.funnel_stages && Array.isArray(settings.funnel_stages)) {
            let modified = false;
            const migratedStages = settings.funnel_stages.map(stage => {
                // If it still has the old single-action fields and no ai_actions
                if (!stage.ai_actions && (stage.configTitle || stage.configDescription)) {
                    modified = true;
                    const { configTitle, configDescription, isAIActionActive, attachmentName, ...rest } = stage;
                    return {
                        ...rest,
                        ai_actions: [
                            {
                                title: configTitle || 'Ação Sem Título',
                                description: configDescription || '',
                                active: !!isAIActionActive,
                                attachmentName: attachmentName
                            }
                        ]
                    };
                }
                return stage;
            });

            // Self-healing removed: We now allow users (Pro/Premium) to delete any stage, including 'recurrent'.

            if (modified) {
                settings.funnel_stages = migratedStages;
                settings.changed('funnel_stages', true);
                await settings.save();
            }
        }

        return settings;
    }

    async updateSettings(data, tenantId) {
        let settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });

        if (!settings) {
            throw new Error('Configurações de CRM não encontradas');
        }

        // Rule Compiler Trigger
        if (data.funnel_stages && Array.isArray(data.funnel_stages)) {
            const crmRuleCompiler = require('../../services/crm_rule_compiler.service');
            const oldStages = settings.funnel_stages || [];

            const newStages = await Promise.all(data.funnel_stages.map(async (newStage) => {
                const oldStage = oldStages.find(s => s.id === newStage.id);

                // Trigger Compiler if description acts as the "Rule Source"
                // We check if description exists and changed.
                if (newStage.description && (!oldStage || oldStage.description !== newStage.description)) {
                    console.log(`[CRM Service] Compiling rules for stage: ${newStage.title}`);
                    const rules = await crmRuleCompiler.compileRules(newStage.description);
                    return { ...newStage, compiled_rules: rules };
                }

                // Preserve existing compiled rules if description didn't change
                if (oldStage && oldStage.compiled_rules && !newStage.compiled_rules) {
                    return { ...newStage, compiled_rules: oldStage.compiled_rules };
                }

                return newStage;
            }));

            data.funnel_stages = newStages;
        }

        await settings.update(data);
        return settings;
    }

    async listLeads(tenantId, filters = {}) {
        const where = { tenant_id: tenantId };
        if (filters.status) where.status = filters.status;

        const leads = await Lead.findAll({ where });

        return leads.map(lead => {
            const data = lead.toJSON();
            // Map Social Name if exists in preferences or top-level (matching Client/Professional logic)
            const useSocialName = data.use_social_name || data.preferences?.useSocialName;
            if (useSocialName && data.social_name) {
                data.legal_name = data.name;
                data.name = data.social_name;
            } else {
                data.legal_name = data.name;
            }
            data.use_social_name = !!useSocialName;
            return data;
        });
    }

    async createLead(data, tenantId) {
        return Lead.create({
            ...data,
            tenant_id: tenantId
        });
    }

    async updateLeadStatus(leadId, status, tenantId) {
        const lead = await Lead.findOne({ where: { id: leadId, tenant_id: tenantId } });
        if (!lead) {
            throw new Error('Lead não encontrado');
        }

        await lead.update({ status });
        return lead;
    }
}

module.exports = new CRMService();
