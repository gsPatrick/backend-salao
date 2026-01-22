const Campaign = require('./campaign.model');
const AcquisitionChannel = require('./acquisition_channel.model');

// --- Campaigns ---
exports.listCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.findAll({ order: [['created_at', 'DESC']] });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.create(req.body);
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Campaign.update(req.body, { where: { id } });
        if (updated) {
            const updatedCampaign = await Campaign.findByPk(id);
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
        const { id } = req.params;
        await Campaign.destroy({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// --- Acquisition Channels ---
exports.listChannels = async (req, res) => {
    try {
        const channels = await AcquisitionChannel.findAll({ order: [['created_at', 'DESC']] });
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createChannel = async (req, res) => {
    try {
        const channel = await AcquisitionChannel.create(req.body);
        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateChannel = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await AcquisitionChannel.update(req.body, { where: { id } });
        if (updated) {
            const updatedChannel = await AcquisitionChannel.findByPk(id);
            res.json(updatedChannel);
        } else {
            res.status(404).json({ error: 'Channel not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
