const { Unit } = require('../../models');

class UnitController {
    async getAll(req, res) {
        try {
            const units = await Unit.findAll({
                where: { tenant_id: req.tenantId },
                order: [['created_at', 'ASC']]
            });
            res.json({ success: true, data: units });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const unit = await Unit.create({
                ...req.body,
                tenant_id: req.tenantId
            });
            res.status(201).json({ success: true, data: unit });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const unit = await Unit.findOne({
                where: { id: req.params.id, tenant_id: req.tenantId }
            });
            if (!unit) throw new Error('Unidade não encontrada');

            await unit.update(req.body);
            res.json({ success: true, data: unit });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const unit = await Unit.findOne({
                where: { id: req.params.id, tenant_id: req.tenantId }
            });
            if (!unit) throw new Error('Unidade não encontrada');

            await unit.destroy();
            res.json({ success: true, message: 'Unidade excluída com sucesso' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new UnitController();
