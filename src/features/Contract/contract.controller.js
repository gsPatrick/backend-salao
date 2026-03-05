const { ContractTemplate, SignedContract, Plan } = require('../../models');
const { Op } = require('sequelize');

exports.listTemplates = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const unitId = req.headers['x-unit-id'] || req.query.unitId;
        const where = { tenant_id: tenantId, active: true };
        if (unitId) where.unit_id = unitId;

        const templates = await ContractTemplate.findAll({
            where,
            order: [['created_at', 'DESC']]
        });

        // Map to frontend format
        const formatted = templates.map(t => ({
            id: t.id,
            name: t.title,
            type: t.type,
            content: t.content,
            logo: t.logo || null
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error listing templates:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { title, type, content, logo, unitId: bodyUnitId } = req.body;
        const unitId = bodyUnitId || req.headers['x-unit-id'];

        const template = await ContractTemplate.create({
            tenant_id: tenantId,
            unit_id: unitId,
            title,
            type,
            content,
            logo: logo || null,
            active: true
        });

        res.json({
            id: template.id,
            name: template.title,
            type: template.type,
            content: template.content,
            logo: template.logo
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { title, content, logo } = req.body;

        const template = await ContractTemplate.findOne({
            where: { id, tenant_id: tenantId }
        });

        if (!template) {
            return res.status(404).json({ error: 'Modelo não encontrado.' });
        }

        await template.update({ title, content, logo: logo !== undefined ? logo : template.logo });

        res.json({
            id: template.id,
            name: template.title,
            type: template.type,
            content: template.content,
            logo: template.logo
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const tenantId = req.tenantId;
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

exports.saveSignedContract = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { plan_id, content, signature, verification_photo, signed_date } = req.body;

        const signedContract = await SignedContract.create({
            tenant_id: tenantId,
            plan_id,
            content,
            signature,
            verification_photo,
            signed_date,
            status: 'signed'
        });

        res.status(201).json({
            success: true,
            message: 'Contrato assinado com sucesso.',
            data: signedContract
        });
    } catch (error) {
        console.error('Error saving signed contract:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllSignedContracts = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const contracts = await SignedContract.findAll({
            where: { tenant_id: tenantId },
            include: [{ model: Plan, attributes: ['id', 'name', 'display_name'] }],
            order: [['created_at', 'DESC']]
        });

        res.json(contracts);
    } catch (error) {
        console.error('Error fetching signed contracts:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
