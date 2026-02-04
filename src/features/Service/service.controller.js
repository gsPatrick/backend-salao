const serviceService = require('./service.service');
const auditLogService = require('../../services/auditLog.service');

class ServiceController {
    async getAll(req, res) {
        try {
            const services = await serviceService.getAll(req.tenantId);
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
            const data = { ...req.body, tenant_id: req.tenantId };
            const service = await serviceService.create(data, req.tenantId);

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
