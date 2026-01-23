const ContractTemplate = require('./contract.model');
const { Op } = require('sequelize');

exports.listTemplates = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const templates = await ContractTemplate.findAll({
            where: { tenant_id: tenantId, active: true },
            order: [['created_at', 'DESC']]
        });

        // Map to frontend format
        const formatted = templates.map(t => ({
            id: t.id,
            name: t.title,
            type: t.type,
            content: t.content,
            logo: null // Logo logic can be added later if stored
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error listing templates:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { title, type, content } = req.body; // Expects title (name in front), type, content

        const template = await ContractTemplate.create({
            tenant_id: tenantId,
            title,
            type,
            content,
            active: true
        });

        res.json({
            id: template.id,
            name: template.title,
            type: template.type,
            content: template.content
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;
        const { title, content } = req.body;

        const template = await ContractTemplate.findOne({
            where: { id, tenant_id: tenantId }
        });

        if (!template) {
            return res.status(404).json({ error: 'Modelo não encontrado.' });
        }

        await template.update({ title, content });

        res.json({
            id: template.id,
            name: template.title,
            type: template.type,
            content: template.content
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { id } = req.params;

        // Hard delete or Soft delete? Using destroy for simple CRUD as per request "Excluir"
        const deleted = await ContractTemplate.destroy({
            where: { id, tenant_id: tenantId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Modelo não encontrado.' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: error.message });
    }
};
