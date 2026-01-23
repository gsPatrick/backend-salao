const marketingService = require('./marketing.service');

// --- Campaigns ---
exports.listCampaigns = async (req, res) => {
    try {
        const campaigns = await marketingService.listCampaigns(req.tenantId);
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const campaign = await marketingService.createCampaign(req.body, req.tenantId);
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const updatedCampaign = await marketingService.updateCampaign(req.params.id, req.body, req.tenantId);
        if (updatedCampaign) {
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
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Acquisition Channels ---
exports.listChannels = async (req, res) => {
    try {
        const channels = await marketingService.listChannels(req.tenantId);
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const channel = await marketingService.createChannel(req.body, req.tenantId);
        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateChannel = async (req, res) => {
    try {
        const updatedChannel = await marketingService.updateChannel(req.params.id, req.body, req.tenantId);
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
        const campaigns = await marketingService.listDirectMail(req.tenantId);
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createDirectMail = async (req, res) => {
    try {
        const campaign = await marketingService.createDirectMail(req.body, req.tenantId);
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateDirectMail = async (req, res) => {
    try {
        const updatedCampaign = await marketingService.updateDirectMail(req.params.id, req.body, req.tenantId);
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
