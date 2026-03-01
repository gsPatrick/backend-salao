const userService = require('./user.service');
const auditLogService = require('../../services/auditLog.service');

class UserController {
    async getAll(req, res) {
        try {
            const users = await userService.getAll(req.tenantId, req.isSuperAdmin);
            res.json({ success: true, data: users });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const user = await userService.getById(req.params.id, req.tenantId, req.isSuperAdmin);
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const data = { ...req.body, tenant_id: req.tenantId };
            const user = await userService.create(data, req.tenantId, req.isSuperAdmin);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'cadastro',
                'Usuário',
                user.id,
                `cadastrou o usuário: ${user.name} (${user.role})`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.status(201).json({ success: true, data: user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const user = await userService.update(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId, req.isSuperAdmin);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'edicao',
                'Usuário',
                user.id,
                `editou o usuário: ${user.name}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, data: user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await userService.delete(req.params.id, req.tenantId, req.isSuperAdmin);

            await auditLogService.record(
                req.tenantId,
                req.userId,
                'exclusao',
                'Usuário',
                req.params.id,
                `excluiu o usuário ID: ${req.params.id}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleSuspend(req, res) {
        try {
            const user = await userService.toggleSuspend(req.params.id, req.tenantId, req.isSuperAdmin);

            const action = user.is_active ? 'ativacao' : 'suspensao';
            const actionLabel = user.is_active ? 'ativou' : 'suspendeu';

            await auditLogService.record(
                req.tenantId,
                req.userId,
                action,
                'Usuário',
                user.id,
                `${actionLabel} o usuário: ${user.name}`,
                { ip: req.ip, userAgent: req.get('User-Agent') }
            );

            res.json({ success: true, data: user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new UserController();
