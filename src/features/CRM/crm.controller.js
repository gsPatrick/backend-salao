const crmService = require('./crm.service');

exports.getSettings = async (req, res) => {
    try {
        const settings = await crmService.getSettings(req.user.tenant_id);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = await crmService.updateSettings(req.body, req.user.tenant_id);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listLeads = async (req, res) => {
    try {
        const leads = await crmService.listLeads(req.user.tenant_id, req.query);
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
