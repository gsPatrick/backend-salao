const serviceService = require('./service.service');
const auditLogService = require('../../services/auditLog.service');
const { Unit } = require('../../models');

class ServiceController {
    async getAll(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const services = await serviceService.getAll(req.tenantId, unitId);
            res.json({ success: true, data: services });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const service = await serviceService.getById(req.params.id, req.tenantId);
            res.json({ success: true, data: service });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const currentUnitId = req.headers['x-unit-id'];
            const formUnitName = req.body.unit;
            let targetUnitIds = [];

            if (formUnitName === 'Ambas' || formUnitName === 'Ambas as unidades') {
                const units = await Unit.findAll({ where: { tenant_id: req.tenantId } });
                targetUnitIds = units.map(u => u.id);
            } else if (formUnitName) {
                const unit = await Unit.findOne({ where: { tenant_id: req.tenantId, name: formUnitName } });
                if (unit) targetUnitIds = [unit.id];
            }

            if (targetUnitIds.length === 0 && currentUnitId) {
                targetUnitIds = [currentUnitId];
            }

            const data = { ...req.body, tenant_id: req.tenantId, targetUnitIds };
            const service = await serviceService.create(data, req.tenantId);

            // Audit log only records the "primary" creation ID, or we could loop logs? 
            // For now, logging the first/returned service ID is consistent with existing flow.
            await auditLogService.record(
                req.tenantId,
                req.user.id,
                'cadastro',
                'Servico',
                service.id,
                `cadastrou o serviço "${service.name}"`
            );

            res.status(201).json({ success: true, data: service });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }


    async update(req, res) {
        try {
            const service = await serviceService.update(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId);

            await auditLogService.record(
                req.tenantId,
                req.user.id,
                'edicao',
                'Servico',
                service.id,
                `editou o serviço "${service.name}"`
            );

            res.json({ success: true, data: service });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await serviceService.delete(req.params.id, req.tenantId);

            await auditLogService.record(
                req.tenantId,
                req.user.id,
                'exclusao',
                'Servico',
                req.params.id,
                `excluiu um serviço`
            );

            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignProfessionals(req, res) {
        try {
            const service = await serviceService.assignProfessionals(
                req.params.id, req.body.professionalIds, req.tenantId
            );
            res.json({ success: true, data: service });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleSuspend(req, res) {
        try {
            const service = await serviceService.toggleSuspend(req.params.id, req.tenantId);
            res.json({ success: true, data: service });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleFavorite(req, res) {
        try {
            const service = await serviceService.toggleFavorite(req.params.id, req.tenantId);
            res.json({ success: true, data: service });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ServiceController();
