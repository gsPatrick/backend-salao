const tenantService = require('./tenant.service');

class TenantController {
    async getAll(req, res) {
        try {
            const tenants = await tenantService.getAll();
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
            res.status(201).json({ success: true, data: tenant });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const tenant = await tenantService.update(req.params.id, req.body, req.isSuperAdmin);
            res.json({ success: true, data: tenant });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await tenantService.delete(req.params.id, req.isSuperAdmin);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new TenantController();
