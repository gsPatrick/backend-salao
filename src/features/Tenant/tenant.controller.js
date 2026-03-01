const tenantService = require('./tenant.service');
const auditLogService = require('../../services/auditLog.service');

class TenantController {
    async getCurrent(req, res) {
        try {
            if (!req.tenantId) {
                return res.status(404).json({ success: false, message: 'Tenant não associado ao usuário atual' });
            }
            const tenant = await tenantService.getById(req.tenantId, req.tenantId, req.isSuperAdmin);
            res.json({ success: true, data: tenant });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const tenants = await tenantService.getAll(req.query);
            res.json({ success: true, data: tenants });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const tenant = await tenantService.getById(req.params.id, req.tenantId, req.isSuperAdmin);
            res.json({ success: true, data: tenant });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const tenant = await tenantService.create(req.body);

            await auditLogService.record(
                null, // New tenant, no ID yet? Wait, tenant.id exists
                null, // Maybe a super admin creating it
                'cadastro',
                'Tenant',
                tenant.id,
                `criou o tenant: ${tenant.name}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.status(201).json({ success: true, data: tenant });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const tenant = await tenantService.update(req.params.id, req.body, req.tenantId, req.isSuperAdmin);

            await auditLogService.record(
                req.tenantId || tenant.id,
                req.userId,
                'edicao',
                'Tenant',
                tenant.id,
                `editou as informações do tenant: ${tenant.name}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, data: tenant });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await tenantService.delete(req.params.id, req.isSuperAdmin);

            await auditLogService.record(
                null,
                req.userId,
                'exclusao',
                'Tenant',
                req.params.id,
                `excluiu o tenant ID: ${req.params.id}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateSettings(req, res) {
        try {
            if (!req.tenantId) {
                return res.status(404).json({ success: false, message: 'Tenant não associado ao usuário atual' });
            }
            const tenant = await tenantService.update(req.tenantId, req.body, req.tenantId, req.isSuperAdmin);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'edicao',
                'Configurações',
                tenant.id,
                'atualizou as configurações do estabelecimento',
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, data: tenant });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getFilterOptions(req, res) {
        try {
            const options = await tenantService.getFilterOptions();
            res.json({ success: true, data: options });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new TenantController();
