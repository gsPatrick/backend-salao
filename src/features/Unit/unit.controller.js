const { Unit } = require('../../models');
const auditLogService = require('../../services/auditLog.service');

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
            const { Tenant, Plan } = require('../../models');
            const tenant = await Tenant.findByPk(req.tenantId, {
                include: [{ model: Plan, as: 'plan' }]
            });

            if (tenant && tenant.plan && tenant.plan.max_units !== null) {
                const count = await Unit.count({ where: { tenant_id: req.tenantId } });
                if (count >= tenant.plan.max_units) {
                    return res.status(403).json({ 
                        success: false, 
                        message: "Limite atingido para o seu plano atual." 
                    });
                }
            }


            const unit = await Unit.create({
                ...req.body,
                tenant_id: req.tenantId
            });

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'cadastro',
                'Unidade',
                unit.id,
                `criou a unidade: ${unit.name}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

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

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'edicao',
                'Unidade',
                unit.id,
                `editou a unidade: ${unit.name}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

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

            const unitName = unit.name;
            await unit.destroy();

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'exclusao',
                'Unidade',
                req.params.id,
                `excluiu a unidade: ${unitName}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, message: 'Unidade excluída com sucesso' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getCheckinQr(req, res) {
        try {
            const unit = await Unit.findOne({
                where: { id: req.params.id, tenant_id: req.tenantId },
                attributes: ['id', 'name', 'checkin_id']
            });
            if (!unit) throw new Error('Unidade não encontrada');

            res.json({ success: true, data: unit });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new UnitController();
