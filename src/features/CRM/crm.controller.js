const { CRMSettings, Client } = require('../../models');

exports.getSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        let settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });

        if (!settings) {
            settings = await CRMSettings.create({ tenant_id: tenantId });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const settings = await CRMSettings.findOne({ where: { tenant_id: tenantId } });

        if (!settings) {
            return res.status(404).json({ message: 'Configurações de CRM não encontradas' });
        }

        await settings.update(req.body);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listLeads = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { stage } = req.query;

        const where = { tenant_id: tenantId };
        if (stage) where.crm_stage = stage;

        // In this implementation, Leads are Clients with a crm_stage
        const leads = await Client.findAll({ where });
        res.json(leads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
