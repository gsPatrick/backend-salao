const { CRMSettings, Lead } = require('../../models');

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
