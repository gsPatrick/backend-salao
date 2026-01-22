const userService = require('./user.service');

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
            const user = await userService.create(req.body, req.tenantId, req.isSuperAdmin);
            res.status(201).json({ success: true, data: user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const user = await userService.update(req.params.id, req.body, req.tenantId, req.isSuperAdmin);
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await userService.delete(req.params.id, req.tenantId, req.isSuperAdmin);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async toggleSuspend(req, res) {
        try {
            const user = await userService.toggleSuspend(req.params.id, req.tenantId, req.isSuperAdmin);
            res.json({ success: true, data: user });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new UserController();
