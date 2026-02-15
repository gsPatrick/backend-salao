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

            // Self-healing: Ensure 'recurrent' stage exists
            const hasRecurrent = migratedStages.some(s => s.id === 'recurrent');
            if (!hasRecurrent) {
                modified = true;
                const newStage = {
                    id: 'recurrent',
                    title: 'Recorrentes (Ativos)',
                    icon: '💎',
                    visible: true,
                    deletable: true,
                    ai_actions: [
                        {
                            title: 'Fidelização',
                            description: 'Manter engajamento com cliente ativo.',
                            active: false
                        }
                    ]
                };

                const newIndex = migratedStages.findIndex(s => s.id === 'new');
                if (newIndex >= 0) {
                    migratedStages.splice(newIndex + 1, 0, newStage);
                } else {
                    migratedStages.unshift(newStage);
                }
            }

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
