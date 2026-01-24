const { Campaign, AcquisitionChannel, MarketingCampaign } = require('../../models');

class MarketingService {
    // --- Campaigns ---
    async listCampaigns(tenantId) {
        return Campaign.findAll({
            where: { tenant_id: tenantId },
            order: [['created_at', 'DESC']]
        });
    }

    async createCampaign(data, tenantId) {
        return Campaign.create({
            ...data,
            tenant_id: tenantId
        });
    }

    async updateCampaign(id, data, tenantId) {
        const [updated] = await Campaign.update(data, {
            where: { id, tenant_id: tenantId }
        });
        if (updated) {
            return Campaign.findOne({ where: { id, tenant_id: tenantId } });
        }
        return null;
    }

    async deleteCampaign(id, tenantId) {
        return Campaign.destroy({
            where: { id, tenant_id: tenantId }
        });
    }

    // --- Acquisition Channels ---
    async listChannels(tenantId) {
        return AcquisitionChannel.findAll({
            where: { tenant_id: tenantId },
            order: [['created_at', 'DESC']]
        });
    }

    async createChannel(data, tenantId) {
        return AcquisitionChannel.create({
            ...data,
            tenant_id: tenantId
        });
    }

    async updateChannel(id, data, tenantId) {
        const [updated] = await AcquisitionChannel.update(data, {
            where: { id, tenant_id: tenantId }
        });
        if (updated) {
            return AcquisitionChannel.findOne({ where: { id, tenant_id: tenantId } });
        }
        return null;
    }

    // --- Direct Mail Campaigns (MarketingCampaign) ---
    async listDirectMail(tenantId) {
        return MarketingCampaign.findAll({
            where: { tenant_id: tenantId },
            order: [['created_at', 'DESC']]
        });
    }

    async createDirectMail(data, tenantId) {
        return MarketingCampaign.create({
            ...data,
            tenant_id: tenantId
        });
    }

    async updateDirectMail(id, data, tenantId) {
        const [updated] = await MarketingCampaign.update(data, {
            where: { id, tenant_id: tenantId }
        });
        if (updated) {
            return MarketingCampaign.findOne({ where: { id, tenant_id: tenantId } });
        }
        return null;
    }

    async deleteDirectMail(id, tenantId) {
        return MarketingCampaign.destroy({
            where: { id, tenant_id: tenantId }
        });
    }
}

module.exports = new MarketingService();
