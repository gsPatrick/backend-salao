const marketingService = require('./marketing.service');
const auditLogService = require('../../services/auditLog.service');

// --- Campaigns ---
exports.listCampaigns = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const campaigns = await marketingService.listCampaigns(req.tenantId, unitId);
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.body.unitId;
        const data = { ...req.body, tenant_id: req.tenantId, unit_id: unitId };
        const campaign = await marketingService.createCampaign(data, req.tenantId);

        await auditLogService.record(
            req.tenantId,
            req.user.id,
            'cadastro',
            'Campanha',
            campaign.id,
            `criou a campanha de marketing "${campaign.name}"`
        );

        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const updatedCampaign = await marketingService.updateCampaign(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId);
        if (updatedCampaign) {
            await auditLogService.record(
                req.tenantId,
                req.user.id,
                'edicao',
                'Campanha',
                updatedCampaign.id,
                `editou a campanha de marketing "${updatedCampaign.name}"`
            );
            res.json(updatedCampaign);
        } else {
            res.status(404).json({ error: 'Campaign not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCampaign = async (req, res) => {
    try {
        await marketingService.deleteCampaign(req.params.id, req.tenantId);

        await auditLogService.record(
            req.tenantId,
            req.user.id,
            'exclusao',
            'Campanha',
            req.params.id,
            `excluiu uma campanha de marketing`
        );

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Acquisition Channels ---
exports.listChannels = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const channels = await marketingService.listChannels(req.tenantId, unitId);
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.body.unitId;
        const data = { ...req.body, tenant_id: req.tenantId, unit_id: unitId };
        const channel = await marketingService.createChannel(data, req.tenantId);
        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateChannel = async (req, res) => {
    try {
        const updatedChannel = await marketingService.updateChannel(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId);
        if (updatedChannel) {
            res.json(updatedChannel);
        } else {
            res.status(404).json({ error: 'Channel not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Direct Mail Campaigns ---
exports.listDirectMail = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const campaigns = await marketingService.listDirectMail(req.tenantId, unitId);
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createDirectMail = async (req, res) => {
    try {
        const unitId = req.headers['x-unit-id'] || req.body.unitId;
        const data = { ...req.body, tenant_id: req.tenantId, unit_id: unitId };
        const campaign = await marketingService.createDirectMail(data, req.tenantId);
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDirectMail = async (req, res) => {
    try {
        const updatedCampaign = await marketingService.updateDirectMail(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId);
        if (updatedCampaign) {
            res.json(updatedCampaign);
        } else {
            res.status(404).json({ error: 'Direct Mail Campaign not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDirectMail = async (req, res) => {
    try {
        await marketingService.deleteDirectMail(req.params.id, req.tenantId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAudienceCount = async (req, res) => {
    try {
        const { audience } = req.query;
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const count = await marketingService.getAudienceCount(req.tenantId, audience, unitId);
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.testSMTP = async (req, res) => {
    try {
        const result = await marketingService.testSMTP(req.tenantId, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
