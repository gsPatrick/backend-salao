const professionalService = require('./professional.service');

class ProfessionalController {
    async getAll(req, res) {
        try {
            const professionals = await professionalService.getAll(req.tenantId);
            res.json({ success: true, data: professionals });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const professional = await professionalService.getById(req.params.id, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const professional = await professionalService.create(req.body, req.tenantId);
            res.status(201).json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const professional = await professionalService.update(req.params.id, req.body, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await professionalService.delete(req.params.id, req.tenantId);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async suspend(req, res) {
        try {
            const professional = await professionalService.suspend(req.params.id, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignServices(req, res) {
        try {
            const professional = await professionalService.assignServices(
                req.params.id, req.body.serviceIds, req.tenantId
            );
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    async getRanking(req, res) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 5;
            const rankings = await professionalService.getRanking(req.tenantId, limit);
            res.json({ success: true, data: rankings });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ProfessionalController();
