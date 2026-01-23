const { CRMSettings, Client } = require('../../models');

class CRMService {
    async getSettings(tenantId) {
        let settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });

        if (!settings) {
            settings = await CRMSettings.create({ tenant_id: tenantId });
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
        if (filters.stage) where.crm_stage = filters.stage;

        return Client.findAll({ where });
    }

    async updateLeadStage(leadId, stageId, tenantId) {
        const lead = await Client.findOne({ where: { id: leadId, tenant_id: tenantId } });
        if (!lead) {
            throw new Error('Lead não encontrado');
        }

        await lead.update({ crm_stage: stageId });
        return lead;
    }
}

module.exports = new CRMService();
