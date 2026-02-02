const { CRMSettings, Lead } = require('../../models');

class CRMService {
    async getSettings(tenantId) {
        let settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });

        if (!settings) {
            settings = await CRMSettings.create({ tenant_id: tenantId });
        }

        // Self-healing: Ensure 'recurrent' stage exists
        if (settings.funnel_stages && Array.isArray(settings.funnel_stages)) {
            const hasRecurrent = settings.funnel_stages.some(s => s.id === 'recurrent');
            if (!hasRecurrent) {
                const newStage = {
                    id: 'recurrent',
                    title: 'Recorrentes (Ativos)',
                    icon: '💎',
                    visible: true,
                    deletable: true,
                    configTitle: 'Fidelização',
                    configDescription: 'Manter engajamento com cliente ativo.',
                    isAIActionActive: false
                };

                const stages = [...settings.funnel_stages];
                const newIndex = stages.findIndex(s => s.id === 'new');

                if (newIndex >= 0) {
                    stages.splice(newIndex + 1, 0, newStage);
                } else {
                    stages.unshift(newStage);
                }

                // Update and persist
                settings.funnel_stages = stages;
                settings.changed('funnel_stages', true); // Force update for JSONB
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

        return Lead.findAll({ where });
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
