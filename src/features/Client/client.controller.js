const clientService = require('./client.service');

class ClientController {
    async getAll(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const clients = await clientService.getAll(req.tenantId, unitId);
            res.json({ success: true, data: clients });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const client = await clientService.getById(req.params.id, req.tenantId);
            res.json({ success: true, data: client });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.body.unitId;
            const data = { ...req.body, tenant_id: req.tenantId, unit_id: unitId };
            const client = await clientService.create(data, req.tenantId, unitId);
            res.status(201).json({ success: true, data: client });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.body.unitId;
            const client = await clientService.update(req.params.id, { ...req.body, tenant_id: req.tenantId, unit_id: unitId }, req.tenantId);
            res.json({ success: true, data: client });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await clientService.delete(req.params.id, req.tenantId);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async block(req, res) {
        try {
            const client = await clientService.block(req.params.id, req.body.reason, req.tenantId);
            res.json({ success: true, data: client });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async search(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const clients = await clientService.search(req.query.q, req.tenantId, unitId);
            res.json({ success: true, data: clients });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ClientController();
