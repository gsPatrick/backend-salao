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

exports.updateLeadStage = async (req, res) => {
    try {
        const { id } = req.params;
        const { stageId } = req.body;
        const lead = await crmService.updateLeadStage(id, stageId, req.user.tenant_id);
        res.json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
