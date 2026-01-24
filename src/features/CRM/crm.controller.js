const crmService = require('./crm.service');

exports.getSettings = async (req, res) => {
    try {
        if (!req.user.tenant_id) {
            return res.status(400).json({ error: 'Tenant context required for CRM settings' });
        }
        const settings = await crmService.getSettings(req.user.tenant_id);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        if (!req.user.tenant_id) {
            return res.status(400).json({ error: 'Tenant context required for CRM settings' });
        }
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

exports.createLead = async (req, res) => {
    try {
        const lead = await crmService.createLead(req.body, req.user.tenant_id);
        res.status(201).json(lead);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const lead = await crmService.updateLeadStatus(id, status, req.user.tenant_id);
        res.json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
