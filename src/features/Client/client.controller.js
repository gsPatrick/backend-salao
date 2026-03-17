const clientService = require('./client.service');
const auditLogService = require('../../services/auditLog.service');

class ClientController {
    async getAll(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const { startDate, endDate } = req.query;
            const clients = await clientService.getAll(req.tenantId, unitId, { startDate, endDate });
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
            
            await auditLogService.record(req.tenantId, req.userId, 'create', 'Client', client.id, `Cliente criado: ${client.name}`, { unitId });
            
            res.status(201).json({ success: true, data: client });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            console.log(`[ClientController] Updating client ${req.params.id} with data:`, JSON.stringify(req.body));
            const unitId = req.headers['x-unit-id'] || req.body.unitId;
            const client = await clientService.update(req.params.id, { ...req.body, tenant_id: req.tenantId, unit_id: unitId }, req.tenantId);

            // Emit socket event for real-time updates
            try {
                const { getIo } = require('../Chat/chat.socket');
                const io = getIo();
                if (io) {
                    io.to(`tenant:${req.tenantId}`).emit('client:update', client);
                    // Specifically for reminders if they changed
                    if (req.body.reminders) {
                        io.to(`tenant:${req.tenantId}`).emit('reminder:update', {
                            clientId: client.id,
                            reminders: req.body.reminders,
                            clientName: client.name
                        });
                    }
                }
            } catch (err) {
                console.error('Socket emit error:', err);
            }

            await auditLogService.record(req.tenantId, req.userId, 'update', 'Client', client.id, `Cliente atualizado: ${client.name}`, { unitId });

            res.json({ success: true, data: client });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getReminders(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const reminders = await clientService.getActiveReminders(req.tenantId, unitId);
            res.json({ success: true, data: reminders });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await clientService.delete(req.params.id, req.tenantId);
            
            await auditLogService.record(req.tenantId, req.userId, 'delete', 'Client', req.params.id, `Cliente excluído`);
            
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async block(req, res) {
        try {
            const client = await clientService.block(req.params.id, req.body.reason, req.tenantId);
            
            await auditLogService.record(req.tenantId, req.userId, 'block', 'Client', client.id, `Cliente bloqueado: ${req.body.reason}`);
            
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
